import { z } from 'zod';
import { lstat, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { runJxa } from './apple-client.js';

// Only this static program is executed. Document content and selectors travel as JSON data.
const IWORK_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0]);
  const bundles = {pages: 'com.apple.iWork.Pages', numbers: 'com.apple.iWork.Numbers', keynote: 'com.apple.iWork.Keynote', textedit: 'com.apple.TextEdit'};
  if (!Object.prototype.hasOwnProperty.call(bundles, input.app)) throw new Error('Unsupported application');
  let app;
  try { app = Application(bundles[input.app]); }
  catch (error) {
    if (input.app !== 'textedit') throw error;
    app = Application('/System/Applications/TextEdit.app');
  }
  function output(value) {
    const result = JSON.stringify(value);
    if (result.length > 200000) throw new Error('Response too large; request a smaller range or limit');
    return result;
  }
  function optional(read) { try { return read(); } catch (_) { return null; } }
  function documentInfo(doc) {
    const location = optional(function () { return input.app === 'textedit' ? doc.path() : doc.file(); });
    return {documentName: String(doc.name()), path: location ? String(location) : null, modified: Boolean(doc.modified())};
  }
  function exact(collection, name, label) {
    const matches = collection.whose({name: name})();
    if (!matches.length) throw new Error(label + ' not found: ' + name);
    if (matches.length !== 1) throw new Error('Ambiguous ' + label + ' name; rename one of the duplicates: ' + name);
    return matches[0];
  }
  function pageText(doc) {
    if (input.app === 'pages' && !doc.documentBody()) throw new Error('This Pages layout document has no body text; text boxes are not supported by this tool');
    return input.app === 'pages' ? String(doc.bodyText()) : String(doc.text());
  }
  function setPageText(doc, value) {
    if (input.app === 'pages') {
      if (!doc.documentBody()) throw new Error('This Pages layout document has no body text');
      doc.bodyText = value;
    } else doc.text = value;
  }
  function guardDestination() {
    ObjC.import('Foundation');
    if (!input.overwrite && $.NSFileManager.defaultManager.fileExistsAtPath(input.path)) {
      throw new Error('Destination exists; use overwrite:true only when replacement is intended');
    }
  }
  function slideInfo(slide, index) {
    return {
      slideIndex: index + 1,
      title: String(slide.defaultTitleItem.objectText() || '').slice(0, 500),
      body: String(slide.defaultBodyItem.objectText() || '').slice(0, 2000),
      presenterNotes: String(slide.presenterNotes() || '').slice(0, 2000),
      skipped: Boolean(slide.skipped())
    };
  }
  function applySlide(slide) {
    if (input.title !== undefined) { slide.titleShowing = true; slide.defaultTitleItem.objectText = input.title; }
    if (input.body !== undefined) { slide.bodyShowing = true; slide.defaultBodyItem.objectText = input.body; }
    if (input.presenterNotes !== undefined) slide.presenterNotes = input.presenterNotes;
    if (input.skipped !== undefined) slide.skipped = input.skipped;
  }
  if (input.operation === 'list_documents' && !app.running()) return output({documents: [], applicationRunning: false});
  if (!['open', 'create'].includes(input.operation) && !app.running()) throw new Error('Application is not running; open a document first');
  if (input.operation === 'list_documents') {
    const all = app.documents();
    return output({documents: all.slice(input.offset, input.offset + input.limit).map(documentInfo), total: all.length, applicationRunning: true});
  }
  if (input.operation === 'open') {
    const opened = app.open(Path(input.path));
    const doc = Array.isArray(opened) ? opened[0] : opened;
    if (!doc) throw new Error('Application did not return an opened document');
    return output(documentInfo(doc));
  }
  if (input.operation === 'create') {
    const properties = {};
    if (input.app === 'pages' && input.templateName) properties.documentTemplate = exact(app.templates, input.templateName, 'template');
    if (input.app === 'numbers' && input.templateName) properties.documentTemplate = exact(app.templates, input.templateName, 'template');
    if (input.app === 'keynote' && input.themeName) properties.documentTheme = exact(app.themes, input.themeName, 'theme');
    const doc = app.Document(properties);
    app.documents.push(doc);
    if (input.text !== undefined) setPageText(doc, input.text);
    return output(documentInfo(doc));
  }
  const doc = exact(app.documents, input.documentName, 'document');
  if (input.operation === 'close') {
    // Cocoa autosaving an Untitled draft can clear modified without assigning
    // an explicit saved path. Treat such documents as unsaved as well.
    if ((doc.modified() || !documentInfo(doc).path) && !input.discardChanges) throw new Error('Document has unsaved changes or no saved path; save it first or explicitly set discardChanges:true');
    app.close(doc, {saving: 'no'});
    return output({closed: true, documentName: input.documentName});
  }
  if (input.operation === 'save') {
    guardDestination();
    const options = {in: Path(input.path)};
    if (input.app === 'textedit') options.as = 'public.rtf';
    app.save(doc, options);
    // Saving can rename a document and invalidate the original name-based specifier.
    // Cocoa may finish updating its document name/path after save returns. Retry
    // metadata discovery only, never the save, and tolerate stale specifiers.
    let savedInfo = null;
    for (let attempt = 0; attempt < 10 && !savedInfo; attempt++) {
      const matches = [];
      for (const item of app.documents()) {
        const info = optional(function () { return documentInfo(item); });
        if (info && info.path === input.path) matches.push(info);
      }
      if (matches.length === 1) savedInfo = matches[0];
      else if (attempt < 9 && typeof delay === 'function') delay(0.1);
    }
    return output({saved: true, path: input.path, document: savedInfo, rediscoverDocuments: !savedInfo});
  }
  if (input.operation === 'export') {
    guardDestination();
    const formats = {pdf: 'PDF', docx: 'Microsoft Word', xlsx: 'Microsoft Excel', pptx: 'Microsoft PowerPoint'};
    app.export(doc, {to: Path(input.path), as: formats[input.format]});
    return output({exported: true, path: input.path, format: input.format});
  }
  if (input.operation === 'read_text') {
    const text = pageText(doc);
    return output({documentName: input.documentName, text: text.slice(input.offset, input.offset + input.maxChars), totalCharacters: text.length, truncated: input.offset + input.maxChars < text.length});
  }
  if (input.operation === 'set_text') {
    const value = input.mode === 'append' ? pageText(doc) + input.text : input.text;
    setPageText(doc, value);
    return output({updated: true, documentName: input.documentName, characters: value.length});
  }
  if (input.operation === 'list_sheets') {
    const sheets = doc.sheets();
    return output({sheets: sheets.slice(input.offset, input.offset + input.limit).map(function (sheet) { return {sheetName: String(sheet.name()), tableCount: sheet.tables.length}; }), total: sheets.length});
  }
  if (['list_tables', 'create_table', 'read_range', 'write_range'].includes(input.operation)) {
    const sheet = exact(doc.sheets, input.sheetName, 'sheet');
    if (input.operation === 'list_tables') {
      const tables = sheet.tables();
      return output({tables: tables.slice(input.offset, input.offset + input.limit).map(function (table) { return {tableName: String(table.name()), rows: table.rowCount(), columns: table.columnCount()}; }), total: tables.length});
    }
    if (input.operation === 'create_table') {
      if (sheet.tables.whose({name: input.tableName})().length) throw new Error('A table with that name already exists');
      const table = app.Table({name: input.tableName, rowCount: input.rows, columnCount: input.columns, headerRowCount: 0, headerColumnCount: 0, footerRowCount: 0});
      sheet.tables.push(table);
      return output({created: true, tableName: String(table.name()), rows: table.rowCount(), columns: table.columnCount()});
    }
    const table = exact(sheet.tables, input.tableName, 'table');
    const rows = input.operation === 'write_range' ? input.values.length : input.rows;
    const columns = input.operation === 'write_range' ? input.values[0].length : input.columns;
    if (input.startRow + rows - 1 > table.rowCount() || input.startColumn + columns - 1 > table.columnCount()) throw new Error('Range exceeds table bounds; no cells were written');
    const values = [];
    let writtenCells = 0;
    for (let row = 0; row < rows; row++) {
      const items = [];
      for (let column = 0; column < columns; column++) {
        const cell = table.rows[input.startRow - 1 + row].cells[input.startColumn - 1 + column];
        if (input.operation === 'write_range') {
          try { cell.value = input.values[row][column] === null ? '' : input.values[row][column]; writtenCells++; }
          catch (error) { throw new Error('Write stopped after ' + writtenCells + ' cells; partial changes remain. ' + String(error)); }
        } else {
          const raw = cell.value();
          const value = raw instanceof Date ? raw.toISOString() : typeof raw === 'string' ? raw.slice(0, 500) : raw === undefined ? null : raw;
          items.push({value: value, formattedValue: String(cell.formattedValue() || '').slice(0, 500), formula: String(cell.formula() || '').slice(0, 500)});
        }
      }
      if (input.operation === 'read_range') values.push(items);
    }
    return output(input.operation === 'read_range' ? {startRow: input.startRow, startColumn: input.startColumn, values: values, cellTextLimit: 500} : {updated: true, writtenCells: writtenCells});
  }
  if (input.operation === 'list_slides') {
    const slides = doc.slides();
    return output({slides: slides.slice(input.offset, input.offset + input.limit).map(function (slide, index) { return slideInfo(slide, input.offset + index); }), total: slides.length, textLimits: {title: 500, body: 2000, presenterNotes: 2000}});
  }
  if (input.operation === 'add_slide') {
    const properties = {};
    if (input.layoutName) properties.baseSlide = exact(doc.masterSlides, input.layoutName, 'master slide');
    const slide = app.Slide(properties);
    doc.slides.push(slide);
    try { applySlide(slide); }
    catch (error) { throw new Error('Slide was added but text update failed; inspect slides before retrying. ' + String(error)); }
    return output(slideInfo(slide, doc.slides.length - 1));
  }
  if (input.operation === 'update_slide') {
    if (input.slideIndex > doc.slides.length) throw new Error('Slide index exceeds document bounds');
    const slide = doc.slides[input.slideIndex - 1];
    try { applySlide(slide); }
    catch (error) { throw new Error('Slide update failed; partial changes may remain. ' + String(error)); }
    return output(slideInfo(slide, input.slideIndex - 1));
  }
  throw new Error('Unsupported document operation');
}
`;

const name = z.string().min(1).max(1024).refine((value) => !value.includes('\0'), 'Names cannot contain NUL');
const documentName = name.describe('Exact name returned by list_documents; ambiguous duplicate names are rejected.');
const pagination = {offset: z.number().int().min(0).max(100000).default(0), limit: z.number().int().min(1).max(100).default(20)};
const filePath = z.string().min(2).max(4096).refine((value) => path.isAbsolute(value) && !value.includes('\0') && !value.split('/').includes('..') && !value.endsWith('/'), 'Use an absolute file path without NUL, parent traversal, or a trailing slash');
const text = z.string().max(100000);
const nativeExtensions = {pages: '.pages', numbers: '.numbers', keynote: '.key', textedit: '.rtf'};
const openExtensions = {pages: ['.pages', '.doc', '.docx', '.rtf', '.txt'], numbers: ['.numbers', '.xls', '.xlsx', '.csv', '.tsv'], keynote: ['.key', '.ppt', '.pptx'], textedit: ['.txt', '.rtf', '.rtfd', '.html', '.htm', '.doc', '.docx', '.odt']};

async function validateFile(input, app, operation) {
  const extension = path.extname(input.path).toLowerCase();
  const expected = operation === 'export' ? `.${input.format}` : nativeExtensions[app];
  if (operation === 'open' ? !openExtensions[app].includes(extension) : extension !== expected) {
    throw new Error(operation === 'open' ? 'Unsupported document file extension for this app' : `Destination must end in ${expected}`);
  }
  const parent = await realpath(path.dirname(input.path));
  if (!(await stat(parent)).isDirectory()) throw new Error('Parent directory does not exist');
  const destination = path.join(parent, path.basename(input.path));
  let existing;
  try { existing = await lstat(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing?.isSymbolicLink()) throw new Error('Symbolic-link document destinations are not supported; use the actual path');
  if (existing && !existing.isFile() && !existing.isDirectory()) throw new Error('Path must refer to a document file or package');
  if (existing?.isDirectory() && !['.pages', '.numbers', '.key', '.rtfd'].includes(extension)) throw new Error('This document format must be a regular file');
  if (operation === 'open' && !existing) throw new Error('Document file does not exist');
  if (operation !== 'open' && existing && !input.overwrite) throw new Error('Destination exists; use overwrite:true only when replacement is intended');
  return {...input, path: destination};
}

export function createIWorkTools(runScript = runJxa) {
  const tools = [];
  function add(app, operation, description, inputSchema, {readOnly = false, destructive = false, idempotent = false, check} = {}) {
    tools.push({
      name: `apple_${app}_${operation}`, description, inputSchema,
      annotations: {readOnlyHint: readOnly, destructiveHint: destructive, idempotentHint: idempotent || readOnly, openWorldHint: !readOnly},
      handler: async (raw = {}) => {
        let input = z.object(inputSchema).strict().parse(raw);
        if (check) check(input);
        if (['open', 'save', 'export'].includes(operation)) input = await validateFile(input, app, operation);
        const result = await runScript(IWORK_SCRIPT, {...input, app, operation});
        let value;
        try { value = JSON.parse(result); } catch { throw new Error(`${app} returned invalid JSON`); }
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${app} returned an unexpected response`);
        return value;
      }
    });
  }
  for (const [app, label] of Object.entries({pages: 'Pages', numbers: 'Numbers', keynote: 'Keynote', textedit: 'TextEdit'})) {
    add(app, 'list_documents', `List open ${label} documents. Does not launch a stopped application.`, pagination, {readOnly: true});
    add(app, 'open', `Open a local ${label} document. Launches the app and may show its window or import dialogs.`, {path: filePath});
    const creation = app === 'keynote' ? {themeName: name.optional()} : app === 'textedit' ? {text: text.default('')} : {templateName: name.optional(), ...(app === 'pages' ? {text: text.optional().describe('Optional initial body text; omitting preserves the selected template body.')} : {})};
    add(app, 'create', `Create an unsaved ${label} document. May show a window. Use the returned name for subsequent operations; save explicitly.`, creation);
    add(app, 'save', `Save ${label} to a ${nativeExtensions[app]} path with an existing parent directory. Existing paths, including the current document path, require overwrite:true. TextEdit saves RTF; no implicit format conversion.`, {documentName, path: filePath, overwrite: z.boolean().default(false)}, {destructive: true});
    add(app, 'close', `Close one ${label} document. Refuses unsaved changes or a document without a saved path unless discardChanges:true; save separately to retain changes.`, {documentName, discardChanges: z.boolean().default(false)}, {destructive: true});
    if (app !== 'textedit') add(app, 'export', `Export ${label} to PDF or its supported Microsoft Office format. Requires an existing parent directory; existing destinations require overwrite:true. Large exports may exceed the automation timeout.`, {documentName, path: filePath, format: z.enum(app === 'pages' ? ['pdf', 'docx'] : app === 'numbers' ? ['pdf', 'xlsx'] : ['pdf', 'pptx']), overwrite: z.boolean().default(false)}, {destructive: true});
    if (app === 'pages' || app === 'textedit') {
      add(app, 'read_text', `Read ${label} plain text with character pagination. Pages supports word-processing body text only; rich formatting and text boxes are not returned.`, {documentName, offset: z.number().int().min(0).max(100000000).default(0), maxChars: z.number().int().min(1).max(50000).default(10000)}, {readOnly: true});
      add(app, 'set_text', `Replace or append ${label} plain text. This can remove existing rich formatting; changes may autosave and sync. Pages requires a word-processing document.`, {documentName, text, mode: z.enum(['replace', 'append']).default('replace')}, {destructive: true});
    }
  }
  const sheet = {documentName, sheetName: name};
  const table = {...sheet, tableName: name};
  const position = {startRow: z.number().int().min(1).max(1000000), startColumn: z.number().int().min(1).max(1000)};
  add('numbers', 'list_sheets', 'List sheets in an open Numbers spreadsheet.', {documentName, ...pagination}, {readOnly: true});
  add('numbers', 'list_tables', 'List table names and dimensions in a Numbers sheet.', {...sheet, ...pagination}, {readOnly: true});
  add('numbers', 'create_table', 'Add a named table without header or footer rows to a Numbers sheet. Rejects duplicate table names.', {...table, rows: z.number().int().min(1).max(1000), columns: z.number().int().min(1).max(100)}, {check: (input) => {if (input.rows * input.columns > 10000) throw new Error('A new table is limited to 10000 cells');}});
  add('numbers', 'read_range', 'Read values, formatted text and formulas from a rectangular Numbers range, using 1-based row and column indexes. Maximum 200 cells; strings are truncated to 500 characters per field.', {...table, ...position, rows: z.number().int().min(1).max(200), columns: z.number().int().min(1).max(200)}, {readOnly: true, check: (input) => {if (input.rows * input.columns > 200) throw new Error('Read ranges are limited to 200 cells');}});
  add('numbers', 'write_range', 'Write a rectangular grid to existing Numbers cells using 1-based indexes. null clears a cell. Formula strings require allowFormulas:true. Bounds are checked before writing; an application failure may leave partial changes. May autosave and sync.', {...table, ...position, values: z.array(z.array(z.union([z.string().max(10000), z.number().finite(), z.boolean(), z.null()])).min(1).max(500)).min(1).max(500), allowFormulas: z.boolean().default(false)}, {destructive: true, check: (input) => {
    if (input.values.some((row) => row.length !== input.values[0].length)) throw new Error('Values must form a rectangular grid');
    if (input.values.length * input.values[0].length > 500) throw new Error('Write ranges are limited to 500 cells');
    if (JSON.stringify(input.values).length > 100000) throw new Error('Combined cell data exceeds 100000 characters');
    if (!input.allowFormulas && input.values.flat().some((value) => typeof value === 'string' && value.trimStart().startsWith('='))) throw new Error('Formula strings require allowFormulas:true');
  }});
  add('keynote', 'list_slides', 'Read slide indexes, default title/body text, presenter notes and skipped status. Does not extract other text boxes, charts, images, or media. Returned text is bounded.', {documentName, ...pagination, limit: z.number().int().min(1).max(20).default(10)}, {readOnly: true});
  const slideFields = {title: z.string().max(10000).optional(), body: z.string().max(50000).optional(), presenterNotes: z.string().max(50000).optional(), skipped: z.boolean().optional()};
  add('keynote', 'add_slide', 'Append a Keynote slide, optionally using an exact master-slide layout name, and set its default title/body, presenter notes and skipped status. Changes may autosave and sync.', {documentName, layoutName: name.optional(), ...slideFields});
  add('keynote', 'update_slide', 'Update default title/body, presenter notes or skipped status of a Keynote slide using its current 1-based index. List slides immediately before modifying; changes may autosave and sync.', {documentName, slideIndex: z.number().int().min(1).max(100000), ...slideFields}, {destructive: true, check: (input) => {if (!Object.keys(slideFields).some((key) => input[key] !== undefined)) throw new Error('Provide at least one slide field to update');}});
  return tools;
}
