import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPersonalTools } from '../src/personal-tools.js';

function record(properties) {
  return new Proxy({values: properties, exists: () => true}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key in properties) return typeof properties[key] === 'function' ? properties[key] : () => properties[key];
      throw new Error(`Undocumented fixture property accessed: ${String(key)}`);
    },
    set(target, key, value) { properties[key] = value; return true; }
  });
}

function collection(items) {
  const c = () => items;
  Object.defineProperty(c, 'length', {get: () => items.length});
  c.byId = id => items.find(item => String(item.id()) === String(id)) || {exists: () => false};
  c.slice = (start, inclusiveEnd) => () => items.slice(start, inclusiveEnd + 1);
  c.push = value => items.push(value);
  c.whose = condition => collection(items.filter(item => matches(item, condition)));
  return new Proxy(c, {get(target, key) { return /^\d+$/.test(String(key)) ? items[Number(key)] : target[key]; }});
}

function matches(item, condition) {
  if (condition._or) return condition._or.some(option => matches(item, option));
  return Object.entries(condition).every(([key, value]) => typeof value === 'object'
    ? String(item[key]()).includes(value._contains) : item[key]() === value);
}

function fixture() {
  const calls = [];
  let nextId = 1;
  const stamp = new Date('2026-10-01T12:00:00Z');
  const note = record({id: 'note-1', name: 'Trip', creationDate: stamp, modificationDate: stamp,
    passwordProtected: false, shared: false, plaintext: 'hello notebook', body: '<p>hello notebook</p>'});
  const noteList = [note];
  const folder = record({id: 'folder-1', name: 'Notes', notes: collection(noteList)});
  const folders = [folder];
  const account = record({id: 'notes-account', name: 'iCloud', folders: collection(folders)});
  const notes = {
    accounts: collection([account]), folders: collection(folders), notes: collection(noteList),
    Note: props => record({...note.values, ...props, id: `note-created-${nextId++}`}),
    Folder: props => record({id: `folder-created-${nextId++}`, ...props}),
    delete: item => { calls.push(['notes.delete', item.id()]); noteList.splice(noteList.indexOf(item), 1); }
  };
  const person = record({id: 'person-1', name: 'Ada Example', firstName: 'Ada', lastName: 'Example',
    organization: 'Acme', jobTitle: 'Engineer', note: 'Contact notes',
    emails: collection([record({label: 'home', value: 'ada@example.invalid'})]), phones: collection([])});
  const people = [person];
  const groupPeople = [];
  const group = record({id: 'group-1', name: 'Team', people: collection(groupPeople)});
  const contacts = {
    people: collection(people), groups: collection([group]), unsaved: () => false,
    Person: props => record({id: `person-created-${nextId++}`, name: props.firstName, ...props, emails: collection([]), phones: collection([])}),
    Email: props => record(props), Phone: props => record(props), Group: props => record({id: `group-created-${nextId++}`, ...props}),
    save: () => calls.push(['contacts.save']),
    add: (p, {to}) => { to.people.push(p); calls.push(['contacts.add', p.id(), to.id()]); },
    remove: (p, {from}) => { groupPeople.splice(groupPeople.indexOf(p), 1); calls.push(['contacts.remove', p.id(), from.id()]); }
  };
  const tab = record({name: 'Example', url: 'https://example.invalid/', text: 'Page text'});
  const tabs = [tab];
  const window = record({id: 7, tabs: collection(tabs)});
  const windows = [window];
  const safari = {
    windows: collection(windows), documents: collection([]), Tab: props => record({name: '', text: '', ...props}),
    Document: () => { windows.push(window); return record({id: 'document'}); },
    activate: () => calls.push(['safari.activate']),
    close: tab => { tabs.splice(tabs.indexOf(tab), 1); calls.push(['safari.close']); },
    addReadingListItem: (url, options) => calls.push(['safari.reading_list', url, options])
  };
  const track = record({id: 1, persistentID: 'TRACK1', name: 'Sample Song', artist: 'Artist', album: 'Album', duration: 180});
  const tracks = [track];
  const playlist = record({id: 2, persistentID: 'LIST1', name: 'List', tracks: collection(tracks), specialKind: 'none', smart: false});
  const music = record({tracks: collection(tracks), playlists: collection([playlist]), playerState: 'playing', soundVolume: 50, playerPosition: 10, currentTrack: () => track});
  music.search = (_playlist, opts) => { calls.push(['music.search', opts]); return tracks; };
  music.UserPlaylist = props => record({id: 3, persistentID: 'NEWLIST', ...props});
  music.duplicate = (track, {to}) => calls.push(['music.duplicate', track.persistentID(), to.persistentID()]);
  for (const action of ['play', 'pause', 'stop', 'nextTrack', 'previousTrack']) music[action] = target => calls.push([`music.${action}`, target?.persistentID()]);
  const media = record({id: 'media-1', name: 'Mountain', filename: 'IMG001.jpg', date: stamp, favorite: false, width: 800, height: 600, description: 'A mountain', keywords: ['mountain']});
  const mediaItems = [media];
  const album = record({id: 'album-1', name: 'Album', mediaItems: collection(mediaItems)});
  const photos = {
    mediaItems: collection(mediaItems), albums: collection([album]), search: options => { calls.push(['photos.search', options]); return mediaItems; },
    make: options => { calls.push(['photos.make', options]); return record({id: 'album-new', name: options.named}); },
    add: (items, {to}) => calls.push(['photos.add', items.map(item => item.id()), to.id()]),
    import: (paths, options) => { calls.push(['photos.import', paths, options]); return mediaItems; },
    export: (items, options) => calls.push(['photos.export', items.map(item => item.id()), options])
  };
  const participant = record({id: 'messages-account:+15551234567', handle: '+15551234567'});
  const messageAccount = record({id: 'messages-account', description: 'iMessage', serviceType: 'iMessage', enabled: true, connectionStatus: 'connected', participants: collection([participant])});
  const chat = record({id: 'chat-1', name: 'Example Chat', account: () => messageAccount, participants: collection([participant])});
  messageAccount.chats = collection([chat]);
  const messages = {accounts: collection([messageAccount]), chats: collection([chat]), send: (text, {to}) => { if (!to.exists()) throw new Error('Unknown participant'); calls.push(['messages.send', text, to.id()]); }};
  const apps = {Notes: notes, Contacts: contacts, Safari: safari, Music: music, Photos: photos, Messages: messages};
  const scripts = [];
  const run = async (script, args) => {
    scripts.push({script, args});
    return vm.runInNewContext(`${script}\nrun(argv)`, {Application: name => apps[name], Path: path => ({path}), argv: [JSON.stringify(args)]});
  };
  const tools = createPersonalTools(run);
  const invoke = (name, args = {}) => tools.find(tool => tool.name === `apple_${name}`).handler(args);
  return {invoke, tools, scripts, calls, apps, note, person, groupPeople, tabs, windows, track, playlist, media, messageAccount};
}

test('personal tool catalog has distinct names and complete action annotations', () => {
  const tools = createPersonalTools(async () => '{}');
  assert.equal(tools.length, 45);
  assert.equal(new Set(tools.map(tool => tool.name)).size, tools.length);
  for (const tool of tools) {
    assert.equal(typeof tool.handler, 'function');
    for (const hint of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) assert.equal(typeof tool.annotations[hint], 'boolean', `${tool.name} ${hint}`);
    if (tool.annotations.readOnlyHint) assert.equal(tool.annotations.destructiveHint, false);
  }
  assert.equal(tools.find(tool => tool.name === 'apple_messages_send').annotations.openWorldHint, true);
  assert.equal(tools.find(tool => tool.name === 'apple_safari_close_tab').annotations.destructiveHint, true);
});

test('bounded JXA pagination selects only the requested range and returns empty pages', async () => {
  const f = fixture();
  f.apps.Notes.accounts.push(record({id: 'second', name: 'Second'}));
  f.apps.Notes.accounts.push(record({id: 'third', name: 'Third'}));
  assert.deepEqual(await f.invoke('notes_list_accounts', {limit: 1, offset: 1}), [{id: 'second', name: 'Second'}]);
  assert.deepEqual(await f.invoke('notes_list_accounts', {offset: 99}), []);
});

test('direct handlers validate inputs before invoking automation', async () => {
  const f = fixture();
  for (const args of [{limit: 0}, {limit: 101}, {limit: 1.5}, {offset: -1}, {operation: 'send'}]) await assert.rejects(f.invoke('notes_list', args));
  await assert.rejects(f.invoke('notes_update', {noteId: 'note-1'}), /at least one field/);
  await assert.rejects(f.invoke('contacts_update', {contactId: 'person-1'}), /at least one field/);
  await assert.rejects(f.invoke('photos_update', {mediaId: 'media-1'}), /at least one field/);
  assert.equal(f.scripts.length, 0);
});

test('Notes metadata, title search, body truncation, and folders use documented properties', async () => {
  const f = fixture();
  assert.equal((await f.invoke('notes_list_accounts'))[0].id, 'notes-account');
  assert.equal((await f.invoke('notes_list_folders', {accountId: 'notes-account'}))[0].id, 'folder-1');
  assert.equal((await f.invoke('notes_list', {folderId: 'folder-1'}))[0].name, 'Trip');
  assert.equal((await f.invoke('notes_search', {query: 'Tri'})).length, 1);
  assert.equal((await f.invoke('notes_search', {query: 'notebook'})).length, 0);
  const note = await f.invoke('notes_get', {noteId: 'note-1', maxChars: 5});
  assert.equal(note.content, 'hello'); assert.equal(note.truncated, true);
  assert.equal((await f.invoke('notes_get', {noteId: 'note-1', format: 'html'})).content, '<p>hello notebook</p>');
});

test('Notes create, update, delete, and folder creation operate on exact containers', async () => {
  const f = fixture();
  await f.invoke('notes_create', {folderId: 'folder-1', title: '<Title>', htmlBody: '<p>Body</p>'});
  assert.equal(f.apps.Notes.notes()[1].body(), '<h1>&lt;Title&gt;</h1><p>Body</p>');
  await f.invoke('notes_update', {noteId: 'note-1', title: 'Renamed', htmlBody: ''});
  assert.equal(f.note.name(), 'Renamed'); assert.equal(f.note.body(), '');
  assert.equal((await f.invoke('notes_create_folder', {accountId: 'notes-account', name: 'New'})).name, 'New');
  await f.invoke('notes_delete', {noteId: 'note-1'});
  assert.deepEqual(f.calls[0], ['notes.delete', 'note-1']);
});

test('locked Notes expose metadata only and reject mutation', async () => {
  const f = fixture(); f.note.passwordProtected = true;
  assert.equal((await f.invoke('notes_get', {noteId: 'note-1'})).content, undefined);
  await assert.rejects(f.invoke('notes_update', {noteId: 'note-1', title: 'x'}), /Password-protected/);
  await assert.rejects(f.invoke('notes_delete', {noteId: 'note-1'}), /Password-protected/);
});

test('user data is passed separately from constant script source', async () => {
  const f = fixture();
  await f.invoke('notes_create', {folderId: 'folder-1', title: 'hello', htmlBody: 'first'});
  const malicious = "'); Application('Messages').send('oops'); //";
  await f.invoke('notes_create', {folderId: 'folder-1', title: 'hello', htmlBody: malicious});
  assert.equal(f.scripts[0].script, f.scripts[1].script);
  assert.equal(f.scripts[1].script.includes(malicious), false);
  assert.equal(f.apps.Notes.notes()[2].body(), `<h1>hello</h1>${malicious}`);
});

test('Contacts reads summaries, details, groups, and paged members', async () => {
  const f = fixture(); f.groupPeople.push(f.person);
  assert.equal((await f.invoke('contacts_search', {query: 'Acme'}))[0].name, 'Ada Example');
  assert.equal((await f.invoke('contacts_get', {contactId: 'person-1', maxChars: 7})).note, 'Contact');
  assert.equal((await f.invoke('contacts_list_groups'))[0].id, 'group-1');
  assert.equal((await f.invoke('contacts_list_group_members', {groupId: 'group-1'}))[0].id, 'person-1');
});

test('Contacts creates labeled channels and edits selected fields without replacing them', async () => {
  const f = fixture();
  await f.invoke('contacts_create', {firstName: 'New', emails: [{value: 'new@example.invalid'}], phones: [{value: '+15550001234'}]});
  const created = f.apps.Contacts.people()[1];
  assert.equal(created.emails()[0].label(), 'home'); assert.equal(created.phones()[0].label(), 'mobile');
  await f.invoke('contacts_update', {contactId: 'person-1', organization: '', jobTitle: 'Lead'});
  assert.equal(f.person.organization(), ''); assert.equal(f.person.jobTitle(), 'Lead');
  assert.equal(f.person.emails()[0].value(), 'ada@example.invalid');
  assert.equal((await f.invoke('contacts_create_group', {name: 'Another'})).name, 'Another');
  await f.invoke('contacts_add_to_group', {contactId: 'person-1', groupId: 'group-1'});
  assert.equal(f.groupPeople.length, 1);
  await f.invoke('contacts_remove_from_group', {contactId: 'person-1', groupId: 'group-1'});
  assert.equal(f.groupPeople.length, 0);
  assert.equal(f.calls.filter(call => call[0] === 'contacts.save').length, 5);
});

test('Contacts refuses to save unrelated pending edits', async () => {
  const f = fixture(); f.apps.Contacts.unsaved = () => true;
  await assert.rejects(f.invoke('contacts_update', {contactId: 'person-1', firstName: 'Wrong'}), /unsaved changes/);
  assert.equal(f.person.firstName(), 'Ada'); assert.equal(f.calls.length, 0);
});

test('Safari reads bounded text and uses one-based tab indices', async () => {
  const f = fixture();
  assert.deepEqual(await f.invoke('safari_list_tabs'), [{windowId: 7, tabIndex: 1, title: 'Example', url: 'https://example.invalid/'}]);
  assert.equal((await f.invoke('safari_get_tab', {windowId: 7, tabIndex: 1})).text, undefined);
  assert.equal((await f.invoke('safari_get_tab', {windowId: 7, tabIndex: 1, includeText: true, maxChars: 4})).text, 'Page');
  await assert.rejects(f.invoke('safari_get_tab', {windowId: 7, tabIndex: 2}), /no longer exists/);
});

test('Safari blocks executable URLs and detects shifted targets', async () => {
  const f = fixture();
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test']) await assert.rejects(f.invoke('safari_open_tab', {url}));
  await assert.rejects(f.invoke('safari_close_tab', {windowId: 7, tabIndex: 1, expectedUrl: 'https://other.invalid/'}), /URL changed/);
  assert.equal(f.tabs.length, 1);
});

test('Safari opening, navigation, closing, and Reading List use specific commands', async () => {
  const f = fixture();
  await f.invoke('safari_open_tab', {url: 'https://new.invalid/', activate: true});
  assert.equal(f.tabs[1].url(), 'https://new.invalid/');
  await f.invoke('safari_navigate_tab', {windowId: 7, tabIndex: 1, expectedUrl: 'https://example.invalid/', url: 'https://other.invalid/'});
  assert.equal(f.tabs[0].url(), 'https://other.invalid/');
  await f.invoke('safari_close_tab', {windowId: 7, tabIndex: 1, expectedUrl: 'https://other.invalid/'});
  assert.equal(f.tabs.length, 1);
  await f.invoke('safari_add_reading_list', {url: 'https://read.invalid/', title: 'Read', preview: 'Preview'});
  assert.equal(f.calls.find(call => call[0] === 'safari.reading_list')[2].withTitle, 'Read');
});

test('Music reads persistent IDs and routes native search', async () => {
  const f = fixture();
  assert.equal((await f.invoke('music_list_playlists'))[0].id, 'LIST1');
  assert.equal((await f.invoke('music_list_tracks', {playlistId: 'LIST1'}))[0].id, 'TRACK1');
  assert.equal((await f.invoke('music_get_track', {trackId: 'TRACK1'})).duration, 180);
  assert.equal((await f.invoke('music_search', {playlistId: 'LIST1', query: 'Artist', only: 'artists'}))[0].artist, 'Artist');
  assert.equal((await f.invoke('music_get_playback_state')).track.id, 'TRACK1');
  f.apps.Music.playerState = 'stopped';
  assert.equal((await f.invoke('music_get_playback_state')).track, null);
});

test('Music creates playlists, adds known tracks, and adjusts playback', async () => {
  const f = fixture();
  assert.equal((await f.invoke('music_create_playlist', {name: 'New'})).id, 'NEWLIST');
  await f.invoke('music_add_tracks_to_playlist', {playlistId: 'LIST1', trackIds: ['TRACK1']});
  for (const action of ['play', 'pause', 'stop', 'next', 'previous']) await f.invoke('music_playback', {action});
  await f.invoke('music_playback', {action: 'play', trackId: 'TRACK1'});
  await f.invoke('music_playback', {action: 'play', playlistId: 'LIST1'});
  await f.invoke('music_set_volume', {volume: 23});
  assert.equal(f.apps.Music.soundVolume(), 23);
  assert.ok(f.calls.some(call => call[0] === 'music.duplicate' && call[1] === 'TRACK1'));
  assert.ok(f.calls.some(call => call[0] === 'music.play' && call[1] === 'LIST1'));
});

test('Music rejects incompatible targets and smart playlists before changes', async () => {
  const f = fixture();
  await assert.rejects(f.invoke('music_playback', {action: 'pause', trackId: 'TRACK1'}), /only valid for play/);
  await assert.rejects(f.invoke('music_playback', {action: 'play', trackId: 'TRACK1', playlistId: 'LIST1'}), /either/);
  f.playlist.smart = true;
  await assert.rejects(f.invoke('music_add_tracks_to_playlist', {playlistId: 'LIST1', trackIds: ['TRACK1']}), /regular user playlist/);
  assert.equal(f.calls.length, 0);
});

test('Photos reads native metadata and updates exact items', async () => {
  const f = fixture();
  assert.equal((await f.invoke('photos_list_albums'))[0].id, 'album-1');
  assert.equal((await f.invoke('photos_list', {albumId: 'album-1'}))[0].filename, 'IMG001.jpg');
  assert.equal((await f.invoke('photos_search', {query: 'Mountain'}))[0].id, 'media-1');
  assert.equal((await f.invoke('photos_get', {mediaId: 'media-1', maxChars: 1})).description, 'A');
  assert.equal((await f.invoke('photos_create_album', {name: 'New Album'})).name, 'New Album');
  await f.invoke('photos_add_to_album', {albumId: 'album-1', mediaIds: ['media-1']});
  await f.invoke('photos_update', {mediaId: 'media-1', favorite: true, description: '', keywords: []});
  assert.equal(f.media.favorite(), true); assert.equal(f.media.description(), ''); assert.deepEqual(Array.from(f.media.keywords()), []);
});

test('Photos validates local import files and export directories before automation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'apple-personal-'));
  try {
    const f = fixture();
    await f.invoke('photos_export', {mediaIds: ['media-1'], directory: root});
    assert.equal(f.calls[0][2].usingOriginals, true);
    const file = join(root, 'sample.jpg'); await writeFile(file, 'fixture');
    await assert.rejects(f.invoke('photos_export', {mediaIds: ['media-1'], directory: root}), /must be empty/);
    await assert.rejects(f.invoke('photos_import', {paths: [root]}), /regular file/);
    await assert.rejects(f.invoke('photos_import', {paths: ['relative.jpg']}));
    await f.invoke('photos_import', {paths: [file], albumId: 'album-1'});
    const imported = f.calls.find(call => call[0] === 'photos.import');
    assert.equal(imported[2].skipCheckDuplicates, false); assert.equal(imported[1][0].path, file);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('Messages lists modern accounts and chats without pretending to read history', async () => {
  const f = fixture();
  assert.equal((await f.invoke('messages_list_accounts'))[0].serviceType, 'iMessage');
  assert.equal((await f.invoke('messages_list_chats', {accountId: 'messages-account'}))[0].participants[0].handle, '+15551234567');
  f.messageAccount.serviceType = () => { throw new Error('AppleEvent handler failed.'); };
  assert.equal((await f.invoke('messages_list_accounts'))[0].serviceType, null);
});

test('Messages fake send targets an explicit account participant and only reports submission', async () => {
  const f = fixture();
  const result = await f.invoke('messages_send', {accountId: 'messages-account', recipient: '+15551234567', text: 'Fixture only'});
  assert.equal(result.submitted, true); assert.equal(result.deliveryConfirmed, false);
  assert.deepEqual(f.calls[0], ['messages.send', 'Fixture only', 'messages-account:+15551234567']);
  f.messageAccount.connectionStatus = 'disconnected';
  await assert.rejects(f.invoke('messages_send', {accountId: 'messages-account', recipient: '+15551234567', text: 'Fixture only'}), /not connected/);
  for (const recipient of ['Ada', '12345', 'messages-account:+15551234567']) await assert.rejects(f.invoke('messages_send', {accountId: 'messages-account', recipient, text: 'Fixture only'}));
  assert.equal(f.calls.length, 1);
});

test('missing IDs and unexpected runner output fail rather than claiming success', async () => {
  const f = fixture();
  await assert.rejects(f.invoke('notes_get', {noteId: 'missing'}), /not found/);
  await assert.rejects(f.invoke('music_get_track', {trackId: 'missing'}), /not found/);
  for (const raw of ['invalid', 'null', 'true', '2']) {
    const tool = createPersonalTools(async () => raw)[0];
    await assert.rejects(tool.handler({}), /invalid JSON|unexpected response/);
  }
});
