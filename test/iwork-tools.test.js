import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createIWorkTools } from '../src/iwork-tools.js';

function collection(items = []) {
  const fn = () => items;
  return new Proxy(fn, {
    get(_target, key) {
      if (key === 'length') return items.length;
      if (key === 'push') return (item) => items.push(item);
      if (key === 'whose') return (condition) => () => items.filter((item) => item.name() === condition.name);
      if (/^\d+$/.test(String(key))) return items[Number(key)];
      return fn[key];
    }
  });
}

function object(properties = {}, children = {}) {
  return new Proxy({}, {
    get(_target, key) { return key in children ? children[key] : () => properties[key]; },
    set(_target, key, value) { properties[key] = value; return true; }
  });
}

function fixture() {
  const state = {running: true, calls: [], writes: [], exists: false, failCell: null};
  const cells = Array.from({length: 4}, (_, row) => Array.from({length: 3}, (_, column) => {
    const data = {value: `${row + 1}:${column + 1}`, formattedValue: `${row + 1}:${column + 1}`, formula: ''};
    return new Proxy(object(data), {
      get(target, key) { return target[key]; },
      set(target, key, value) {
        if (state.failCell?.[0] === row && state.failCell?.[1] === column) throw new Error('Locked cell');
        state.writes.push({row, column, value}); target[key] = value; return true;
      }
    });
  }));
  const table = object({name: 'Table 1', rowCount: 4, columnCount: 3}, {rows: collection(cells.map((row) => object({}, {cells: collection(row)})))});
  const sheet = object({name: 'Sheet 1'}, {tables: collection([table])});
  function slide(properties = {}) {
    return object({presenterNotes: 'Notes', skipped: false, ...properties}, {defaultTitleItem: object({objectText: 'Title'}), defaultBodyItem: object({objectText: 'Body'})});
  }
  function document(properties = {}) {
    return object({name: 'Example', path: null, file: null, modified: false, documentBody: true, bodyText: 'Body text', text: 'TextEdit text', ...properties}, {sheets: collection([sheet]), slides: collection([slide()]), masterSlides: collection([object({name: 'Title & Bullets'})])});
  }
  const doc = document();
  const app = {
    running: () => state.running,
    documents: collection([doc]),
    themes: collection([object({name: 'White'})]),
    templates: collection([object({name: 'Blank'})]),
    Document: (properties) => {state.calls.push(['Document', properties]); return document({name: 'Untitled'});},
    Table: (properties) => {state.calls.push(['Table', properties]); return object(properties);},
    Slide: (properties) => {state.calls.push(['Slide', properties]); return slide(properties);},
    open: (file) => {state.calls.push(['open', file]); return doc;},
    close: (target, options) => state.calls.push(['close', target, options]),
    save: (target, options) => {state.calls.push(['save', target, options]); target.path = options.in.path; target.file = options.in.path; target.name = path.basename(options.in.path);},
    export: (target, options) => state.calls.push(['export', target, options])
  };
  const scripts = [];
  const run = async (script, args) => {
    scripts.push({script, args});
    const context = {Application: (id) => {state.calls.push(['Application', id]); return app;}, Path: (value) => ({path: value}), ObjC: {import() {}}, $: {NSFileManager: {defaultManager: {fileExistsAtPath: () => state.exists}}}};
    vm.runInNewContext(script, context);
    return context.run([JSON.stringify(args)]);
  };
  const tools = createIWorkTools(run);
  return {state, app, doc, sheet, table, cells, scripts, tools, call: (name, args) => tools.find((tool) => tool.name === name).handler(args)};
}

async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'apple-iwork-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

test('35 unique tools have valid raw schemas and conservative mutation annotations', () => {
  const {tools} = fixture();
  assert.equal(tools.length, 35);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, 35);
  for (const tool of tools) {
    assert.equal(typeof tool.handler, 'function');
    if (/_open$|_create$|_save$|_close$|_export$|_set_text$|_write_range$|_add_slide$|_update_slide$/.test(tool.name)) assert.equal(tool.annotations.readOnlyHint, false);
    if (/_save$|_export$|_close$|_set_text$|_write_range$|_update_slide$/.test(tool.name)) assert.equal(tool.annotations.destructiveHint, true);
  }
});

test('all four applications list documents without launching a stopped app', async () => {
  const f = fixture();
  f.state.running = false;
  for (const app of ['pages', 'numbers', 'keynote', 'textedit']) {
    assert.deepEqual(await f.call(`apple_${app}_list_documents`), {documents: [], applicationRunning: false});
  }
  assert.equal(f.state.calls.filter(([command]) => command !== 'Application').length, 0);
});

test('document metadata, content pagination and duplicate-name failure execute in JXA harness', async () => {
  const f = fixture();
  assert.equal((await f.call('apple_pages_list_documents', {limit: 1})).documents[0].documentName, 'Example');
  assert.deepEqual(await f.call('apple_pages_read_text', {documentName: 'Example', offset: 5, maxChars: 4}), {documentName: 'Example', text: 'text', totalCharacters: 9, truncated: false});
  f.app.documents.push(f.doc);
  await assert.rejects(f.call('apple_pages_set_text', {documentName: 'Example', text: 'Unsafe ambiguity'}), /Ambiguous document/);
  assert.equal(f.doc.bodyText(), 'Body text');
});

test('missing documents and Pages layout documents fail without mutation', async () => {
  const f = fixture();
  await assert.rejects(f.call('apple_textedit_read_text', {documentName: 'Absent'}), /document not found/);
  f.doc.documentBody = false;
  await assert.rejects(f.call('apple_pages_set_text', {documentName: 'Example', text: 'New'}), /no body text/);
  assert.equal(f.doc.bodyText(), 'Body text');
});

test('Pages and TextEdit text mutation stays data, uses the same static script, and appends correctly', async () => {
  const f = fixture();
  const dangerous = '"; Application("Mail").send(); //\n$(touch /tmp/not-executed)';
  await f.call('apple_textedit_set_text', {documentName: 'Example', text: dangerous});
  await f.call('apple_textedit_set_text', {documentName: 'Example', text: '\nTail', mode: 'append'});
  assert.equal(f.doc.text(), dangerous + '\nTail');
  assert.equal(f.scripts[0].script, f.scripts[1].script);
  assert.equal(f.scripts[0].script.includes(dangerous), false);
  await f.call('apple_pages_set_text', {documentName: 'Example', text: 'Replacement'});
  assert.equal(f.doc.bodyText(), 'Replacement');
});

test('create uses template/theme references and returns a usable name', async () => {
  for (const [app, args] of [['pages', {templateName: 'Blank', text: 'Hello'}], ['numbers', {templateName: 'Blank'}], ['keynote', {themeName: 'White'}], ['textedit', {text: 'Hello'}]]) {
    const f = fixture();
    const created = await f.call(`apple_${app}_create`, args);
    assert.equal(created.documentName, 'Untitled');
    assert.equal(f.app.documents.length, 2);
    if (app === 'pages') assert.equal(f.app.documents[1].bodyText(), 'Hello');
    if (app === 'textedit') assert.equal(f.app.documents[1].text(), 'Hello');
    if (app === 'keynote') assert.equal(f.state.calls.find(([key]) => key === 'Document')[1].documentTheme.name(), 'White');
  }
  const f = fixture();
  await f.call('apple_pages_create', {templateName: 'Blank'});
  assert.equal(f.app.documents[1].bodyText(), 'Body text', 'Omitting text must preserve template content');
});

test('close refuses unsaved changes and requires explicit discard, with no save dialog', async () => {
  const f = fixture();
  f.doc.modified = true;
  await assert.rejects(f.call('apple_pages_close', {documentName: 'Example'}), /unsaved changes/);
  f.doc.modified = false;
  await assert.rejects(f.call('apple_pages_close', {documentName: 'Example'}), /no saved path/);
  assert.equal(f.state.calls.some(([key]) => key === 'close'), false);
  await f.call('apple_pages_close', {documentName: 'Example', discardChanges: true});
  assert.equal(f.state.calls.find(([key]) => key === 'close')[2].saving, 'no');
});

test('open checks extension/existence and sends Path data to the correct app', async (t) => {
  const directory = await temporary(t);
  const f = fixture();
  const filename = path.join(directory, 'example.pages');
  await writeFile(filename, 'test fixture');
  await f.call('apple_pages_open', {path: filename});
  assert.equal(f.state.calls.find(([key]) => key === 'open')[1].path, filename.replace(/^\/var\//, '/private/var/'));
  await assert.rejects(f.call('apple_pages_open', {path: path.join(directory, 'absent.pages')}), /does not exist/);
  await assert.rejects(f.call('apple_numbers_open', {path: filename}), /Unsupported document/);
});

test('save refuses existing files, symlinks, traversal, and wrong extensions before automation', async (t) => {
  const directory = await temporary(t);
  const f = fixture();
  const filename = path.join(directory, 'existing.pages');
  await writeFile(filename, 'preserve');
  await symlink(filename, path.join(directory, 'link.pages'));
  for (const [target, expected] of [[filename, /Destination exists/], [path.join(directory, 'link.pages'), /Symbolic-link/], [`${directory}/../escape.pages`, /absolute file path/], [path.join(directory, 'wrong.txt'), /end in .pages/]]) {
    await assert.rejects(f.call('apple_pages_save', {documentName: 'Example', path: target}), expected);
  }
  assert.equal(f.scripts.length, 0);
  await f.call('apple_pages_save', {documentName: 'Example', path: filename, overwrite: true});
  assert.equal(f.state.calls.some(([key]) => key === 'save'), true);
});

test('save/export guard checks again inside JXA and exports correct format enums', async (t) => {
  const directory = await temporary(t);
  for (const [app, format, expected] of [['pages', 'docx', 'Microsoft Word'], ['numbers', 'xlsx', 'Microsoft Excel'], ['keynote', 'pptx', 'Microsoft PowerPoint'], ['pages', 'pdf', 'PDF']]) {
    const f = fixture();
    const args = {documentName: 'Example', path: path.join(directory, `example.${format}`), format};
    f.state.exists = true;
    await assert.rejects(f.call(`apple_${app}_export`, args), /Destination exists/);
    assert.equal(f.state.calls.some(([key]) => key === 'export'), false);
    f.state.exists = false;
    await f.call(`apple_${app}_export`, args);
    assert.equal(f.state.calls.find(([key]) => key === 'export')[2].as, expected);
  }
  const f = fixture();
  await f.call('apple_textedit_save', {documentName: 'Example', path: path.join(directory, 'text.rtf')});
  assert.equal(f.state.calls.find(([key]) => key === 'save')[2].as, 'public.rtf');
  const delayed = fixture();
  let saveCalls = 0;
  let staleReads = 0;
  delayed.app.save = (_target, options) => {
    saveCalls++;
    const renamed = object({name: 'delayed.rtf', path: options.in.path, modified: false});
    delayed.app.documents = collection([new Proxy(renamed, {get(target, key) {
      if (key === 'name' && staleReads++ < 2) return () => {throw new Error('Stale document specifier');};
      return target[key];
    }})]);
  };
  const saved = await delayed.call('apple_textedit_save', {documentName: 'Example', path: path.join(directory, 'delayed.rtf')});
  assert.equal(saved.document.documentName, 'delayed.rtf');
  assert.equal(saveCalls, 1, 'Only metadata discovery may retry after a successful save');
});

test('Numbers lists sheet/table hierarchy and creates a bounded named table', async () => {
  const f = fixture();
  assert.deepEqual((await f.call('apple_numbers_list_sheets', {documentName: 'Example'})).sheets, [{sheetName: 'Sheet 1', tableCount: 1}]);
  const args = {documentName: 'Example', sheetName: 'Sheet 1'};
  assert.equal((await f.call('apple_numbers_list_tables', args)).tables[0].columns, 3);
  assert.deepEqual(await f.call('apple_numbers_create_table', {...args, tableName: 'New', rows: 8, columns: 2}), {created: true, tableName: 'New', rows: 8, columns: 2});
  await assert.rejects(f.call('apple_numbers_create_table', {...args, tableName: 'New', rows: 8, columns: 2}), /already exists/);
  assert.equal(f.sheet.tables.length, 2);
});

const rangeArgs = {documentName: 'Example', sheetName: 'Sheet 1', tableName: 'Table 1', startRow: 2, startColumn: 2};

test('Numbers reads the intended one-based rectangle and writes exact scalar types', async () => {
  const f = fixture();
  const read = await f.call('apple_numbers_read_range', {...rangeArgs, rows: 2, columns: 2});
  assert.deepEqual(read.values.map((row) => row.map((cell) => cell.value)), [['2:2', '2:3'], ['3:2', '3:3']]);
  await f.call('apple_numbers_write_range', {...rangeArgs, values: [[42, false], [null, 'text']]});
  assert.deepEqual(f.state.writes, [{row: 1, column: 1, value: 42}, {row: 1, column: 2, value: false}, {row: 2, column: 1, value: ''}, {row: 2, column: 2, value: 'text'}]);
});

test('Numbers validates rectangular size, formulas and table bounds before any write', async () => {
  const f = fixture();
  for (const [values, expected] of [[[[1], [2, 3]], /rectangular/], [[[' =SUM(A1:A2)']], /allowFormulas/]]) await assert.rejects(f.call('apple_numbers_write_range', {...rangeArgs, values}), expected);
  await assert.rejects(f.call('apple_numbers_write_range', {...rangeArgs, startRow: 4, values: [[1], [2]]}), /exceeds table bounds/);
  assert.deepEqual(f.state.writes, []);
  await f.call('apple_numbers_write_range', {...rangeArgs, allowFormulas: true, values: [['=SUM(A1:A2)']]});
  assert.equal(f.state.writes[0].value, '=SUM(A1:A2)');
});

test('Numbers reports partial write count rather than pretending to roll back', async () => {
  const f = fixture();
  f.state.failCell = [1, 2];
  await assert.rejects(f.call('apple_numbers_write_range', {...rangeArgs, values: [[1, 2]]}), /after 1 cells; partial changes remain/);
  assert.equal(f.state.writes.length, 1);
});

test('Keynote reads and updates slide fields and appends using a master slide', async () => {
  const f = fixture();
  const result = await f.call('apple_keynote_list_slides', {documentName: 'Example'});
  assert.deepEqual(result.slides[0], {slideIndex: 1, title: 'Title', body: 'Body', presenterNotes: 'Notes', skipped: false});
  await f.call('apple_keynote_update_slide', {documentName: 'Example', slideIndex: 1, title: 'Changed', presenterNotes: '', skipped: true});
  assert.equal(f.doc.slides[0].defaultTitleItem.objectText(), 'Changed');
  assert.equal(f.doc.slides[0].presenterNotes(), '');
  const added = await f.call('apple_keynote_add_slide', {documentName: 'Example', layoutName: 'Title & Bullets', body: 'New body'});
  assert.equal(added.slideIndex, 2);
  assert.equal(added.body, 'New body');
  assert.equal(f.state.calls.find(([key]) => key === 'Slide')[1].baseSlide.name(), 'Title & Bullets');
  await assert.rejects(f.call('apple_keynote_update_slide', {documentName: 'Example', slideIndex: 3, title: 'No'}), /exceeds document bounds/);
});

test('direct handler validation rejects invalid indexes, NaN, oversized grids, extra fields and empty updates', async () => {
  const f = fixture();
  for (const [tool, args] of [
    ['apple_pages_list_documents', {limit: 101}],
    ['apple_pages_set_text', {documentName: 'Example', text: 'x', operation: 'close'}],
    ['apple_numbers_read_range', {...rangeArgs, startRow: 0, rows: 1, columns: 1}],
    ['apple_numbers_read_range', {...rangeArgs, rows: 200, columns: 2}],
    ['apple_numbers_write_range', {...rangeArgs, values: [[NaN]]}],
    ['apple_keynote_update_slide', {documentName: 'Example', slideIndex: 1}],
    ['apple_keynote_update_slide', {documentName: 'Example', slideIndex: 1.5, title: 'No'}]
  ]) await assert.rejects(f.call(tool, args));
  assert.equal(f.scripts.length, 0);
});

test('runner permission errors propagate, and malformed successful responses are rejected', async () => {
  const tool = (run) => createIWorkTools(run).find((item) => item.name === 'apple_pages_list_documents');
  await assert.rejects(tool(async () => {throw new Error('Not authorized to send Apple events');}).handler({}), /Not authorized/);
  await assert.rejects(tool(async () => 'not json').handler({}), /invalid JSON/);
  await assert.rejects(tool(async () => 'null').handler({}), /unexpected response/);
});

test('live TextEdit creates, edits, saves, reopens and closes only a temporary document', {skip: process.env.RUN_IWORK_INTEGRATION !== '1' || process.platform !== 'darwin'}, async (t) => {
  const directory = await temporary(t);
  const tools = createIWorkTools();
  const call = (operation, input) => tools.find((item) => item.name === `apple_textedit_${operation}`).handler(input);
  const marker = `Apple Productivity MCP temporary test ${Date.now()}`;
  let currentName;
  let primaryError;
  let stage = 'create';
  try {
    const created = await call('create', {text: marker});
    currentName = created.documentName;
    stage = 'read created document';
    assert.equal((await call('read_text', {documentName: currentName})).text, marker);
    stage = 'append text';
    await call('set_text', {documentName: currentName, text: '\nAppended.', mode: 'append'});
    stage = 'refuse unsaved close';
    await assert.rejects(call('close', {documentName: currentName}), /unsaved changes/);
    const filename = path.join(directory, 'smoke.rtf');
    stage = 'save';
    const saved = await call('save', {documentName: currentName, path: filename});
    assert.ok(saved.document, 'Save must return the renamed document identity');
    currentName = saved.document.documentName;
    stage = 'refuse overwrite';
    await assert.rejects(call('save', {documentName: currentName, path: filename}), /Destination exists/);
    stage = 'close saved document';
    await call('close', {documentName: currentName});
    currentName = null;
    stage = 'reopen';
    const opened = await call('open', {path: filename});
    currentName = opened.documentName;
    stage = 'read reopened document';
    assert.equal((await call('read_text', {documentName: currentName})).text, marker + '\nAppended.');
    stage = 'close reopened document';
    await call('close', {documentName: currentName});
    currentName = null;
  } catch (error) {
    primaryError = new Error(`TextEdit integration failed during ${stage}: ${error.message}`, {cause: error});
  } finally {
    // Never trust a stale Untitled name or mask the original failure with cleanup.
    // Close only documents whose content proves they belong to this exact test.
    if (currentName) {
      try {
        for (const document of (await call('list_documents', {limit: 100})).documents) {
          if (document.documentName !== currentName && document.documentName !== 'smoke.rtf' && !document.path?.startsWith(directory + '/')) continue;
          const content = await call('read_text', {documentName: document.documentName, maxChars: marker.length});
          if (content.text === marker) await call('close', {documentName: document.documentName, discardChanges: true});
        }
      } catch (error) {
        if (primaryError) primaryError.message += `; cleanup also failed: ${error.message}`;
        else primaryError = error;
      }
    }
  }
  if (primaryError) throw primaryError;
});
