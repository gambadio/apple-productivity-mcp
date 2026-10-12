import { z } from 'zod';
import { stat, readdir } from 'node:fs/promises';
import { runJxa } from './apple-client.js';

// Scripts are constant source code. All user values cross the Apple Event
// boundary as JSON arguments, never as JavaScript, AppleScript, or shell code.
const COMMON = String.raw`
function required(collection, id, label) {
  var object = collection.byId(id);
  if (!object.exists()) throw new Error(label + ' not found: ' + id);
  return object;
}
function page(collection, input) {
  var count = collection.length;
  if (input.offset >= count) return [];
  // Music does not implement the range Apple Event used by JXA .slice().
  // Indexing builds bounded object specifiers without resolving the full library.
  var result = [];
  for (var index = input.offset; index < Math.min(count, input.offset + input.limit); index++) result.push(collection[index]);
  return result;
}
function date(value) { return value ? value.toISOString() : null; }
function named(object) { return { id: String(object.id()), name: String(object.name() || '') }; }
`;

const NOTES = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Notes');
  function summary(note) {
    return { id: String(note.id()), name: String(note.name() || ''),
      createdAt: date(note.creationDate()), modifiedAt: date(note.modificationDate()),
      passwordProtected: Boolean(note.passwordProtected()), shared: Boolean(note.shared()) };
  }
  if (input.operation === 'accounts') return JSON.stringify(page(app.accounts, input).map(named));
  if (input.operation === 'folders') {
    var parent = input.accountId ? required(app.accounts, input.accountId, 'Notes account') : app;
    return JSON.stringify(page(parent.folders, input).map(named));
  }
  if (input.operation === 'create_folder') {
    var account = required(app.accounts, input.accountId, 'Notes account');
    var folder = app.Folder({name: input.name});
    account.folders.push(folder);
    return JSON.stringify(named(folder));
  }
  if (input.operation === 'list' || input.operation === 'search') {
    var container = input.folderId ? required(app.folders, input.folderId, 'Notes folder') : app;
    var notes = input.operation === 'search' ? container.notes.whose({name: {_contains: input.query}}) : container.notes;
    return JSON.stringify(page(notes, input).map(summary));
  }
  if (input.operation === 'create') {
    var folder = required(app.folders, input.folderId, 'Notes folder');
    var safeTitle = input.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var note = app.Note({body: '<h1>' + safeTitle + '</h1>' + input.htmlBody});
    folder.notes.push(note);
    return JSON.stringify(summary(note));
  }
  var note = required(app.notes, input.noteId, 'Note');
  if (input.operation === 'get') {
    var result = summary(note);
    if (!result.passwordProtected) {
      var content = String(input.format === 'html' ? note.body() : note.plaintext());
      result.content = content.slice(0, input.maxChars);
      result.truncated = content.length > input.maxChars;
    }
    return JSON.stringify(result);
  }
  if (note.passwordProtected()) throw new Error('Password-protected notes cannot be modified by this tool.');
  if (input.operation === 'update') {
    if (input.htmlBody !== undefined) note.body = input.htmlBody;
    if (input.title !== undefined) note.name = input.title;
    return JSON.stringify(summary(note));
  }
  if (input.operation === 'delete') { app.delete(note); return JSON.stringify({id: input.noteId, deleted: true}); }
  throw new Error('Unsupported Notes operation');
}
`;

const CONTACTS = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Contacts');
  function summary(person) { return {id: String(person.id()), name: String(person.name() || ''), organization: String(person.organization() || '')}; }
  if (input.operation === 'search') {
    var people = app.people.whose({_or: [{name: {_contains: input.query}}, {organization: {_contains: input.query}}]});
    return JSON.stringify(page(people, input).map(summary));
  }
  if (input.operation === 'groups') return JSON.stringify(page(app.groups, input).map(named));
  if (input.operation === 'group_members') {
    return JSON.stringify(page(required(app.groups, input.groupId, 'Contacts group').people, input).map(summary));
  }
  if (input.operation === 'get') {
    var person = required(app.people, input.contactId, 'Contact');
    function values(collection) { return collection().slice(0, 100).map(function(value) { return {label: String(value.label() || ''), value: String(value.value() || '')}; }); }
    return JSON.stringify({id: String(person.id()), name: String(person.name() || ''),
      firstName: String(person.firstName() || ''), lastName: String(person.lastName() || ''),
      organization: String(person.organization() || ''), jobTitle: String(person.jobTitle() || ''),
      emails: values(person.emails), phones: values(person.phones), note: String(person.note() || '').slice(0, input.maxChars)});
  }
  // Contacts.save saves every pending edit. Do not silently save someone else's work.
  if (app.unsaved()) throw new Error('Contacts has unsaved changes. Save or discard those changes in Contacts before using a mutation tool.');
  if (input.operation === 'create_group') {
    var group = app.Group({name: input.name}); app.groups.push(group); app.save();
    return JSON.stringify(named(group));
  }
  if (input.operation === 'create') {
    var person = app.Person({firstName: input.firstName, lastName: input.lastName, organization: input.organization, jobTitle: input.jobTitle, note: input.note});
    app.people.push(person);
    input.emails.forEach(function(entry) { person.emails.push(app.Email(entry)); });
    input.phones.forEach(function(entry) { person.phones.push(app.Phone(entry)); });
    app.save(); return JSON.stringify(summary(person));
  }
  var person = required(app.people, input.contactId, 'Contact');
  if (input.operation === 'update') {
    ['firstName', 'lastName', 'organization', 'jobTitle', 'note'].forEach(function(key) {
      if (input[key] !== undefined) person[key] = input[key];
    });
  } else if (input.operation === 'add_to_group') {
    app.add(person, {to: required(app.groups, input.groupId, 'Contacts group')});
  } else if (input.operation === 'remove_from_group') {
    app.remove(person, {from: required(app.groups, input.groupId, 'Contacts group')});
  } else { throw new Error('Unsupported Contacts operation'); }
  app.save();
  return JSON.stringify({id: input.contactId, operation: input.operation, success: true});
}
`;

const SAFARI = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Safari');
  function summary(window, tab, index) { return {windowId: window.id(), tabIndex: index, title: String(tab.name() || ''), url: String(tab.url() || '')}; }
  if (input.operation === 'list') {
    var output = [], skipped = 0;
    var windows = app.windows();
    for (var w = 0; w < windows.length && output.length < input.limit; w++) {
      var count = windows[w].tabs.length;
      for (var i = 0; i < count && output.length < input.limit; i++) {
        if (skipped++ < input.offset) continue;
        output.push(summary(windows[w], windows[w].tabs[i], i + 1));
      }
    }
    return JSON.stringify(output);
  }
  if (input.operation === 'reading_list') {
    app.addReadingListItem(input.url, {withTitle: input.title, andPreviewText: input.preview});
    return JSON.stringify({added: true, url: input.url});
  }
  if (input.operation === 'open') {
    var window;
    if (input.windowId !== undefined) window = required(app.windows, input.windowId, 'Safari window');
    else if (app.windows.length) window = app.windows[0];
    else { app.documents.push(app.Document()); window = app.windows[0]; }
    var tab = app.Tab({url: input.url}); window.tabs.push(tab);
    if (input.activate) { window.currentTab = tab; app.activate(); }
    return JSON.stringify({windowId: window.id(), tabIndex: window.tabs.length, url: input.url, opened: true});
  }
  var window = required(app.windows, input.windowId, 'Safari window');
  if (input.tabIndex > window.tabs.length) throw new Error('Safari tab index no longer exists; list tabs again.');
  var tab = window.tabs[input.tabIndex - 1];
  // Indices move as tabs close. Require the observed URL before touching a tab.
  if (input.expectedUrl !== undefined && String(tab.url() || '') !== input.expectedUrl) throw new Error('Safari tab URL changed; list tabs again before modifying it.');
  if (input.operation === 'get') {
    var result = summary(window, tab, input.tabIndex);
    if (input.includeText) { var content = String(tab.text() || ''); result.text = content.slice(0, input.maxChars); result.truncated = content.length > input.maxChars; }
    return JSON.stringify(result);
  }
  if (input.operation === 'navigate') { tab.url = input.url; return JSON.stringify({windowId: input.windowId, tabIndex: input.tabIndex, url: input.url, navigated: true}); }
  if (input.operation === 'close') { app.close(tab); return JSON.stringify({windowId: input.windowId, tabIndex: input.tabIndex, closed: true}); }
  throw new Error('Unsupported Safari operation');
}
`;

const MUSIC = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Music');
  function byPersistentId(collection, id, label) {
    var objects = collection.whose({persistentID: id})();
    if (objects.length !== 1) throw new Error(label + ' not found or ambiguous: ' + id);
    return objects[0];
  }
  function trackSummary(track) { return {id: String(track.persistentID()), name: String(track.name() || ''), artist: String(track.artist() || ''), album: String(track.album() || ''), duration: Number(track.duration() || 0)}; }
  if (input.operation === 'playlists') return JSON.stringify(page(app.playlists, input).map(function(playlist) { return {id: String(playlist.persistentID()), name: String(playlist.name() || ''), specialKind: String(playlist.specialKind())}; }));
  if (input.operation === 'tracks') {
    var collection = input.playlistId ? byPersistentId(app.playlists, input.playlistId, 'Music playlist').tracks : app.tracks;
    return JSON.stringify(page(collection, input).map(trackSummary));
  }
  if (input.operation === 'search') {
    var playlist = byPersistentId(app.playlists, input.playlistId, 'Music playlist');
    var result = app.search(playlist, {for: input.query, only: input.only}) || [];
    return JSON.stringify(result.slice(input.offset, input.offset + input.limit).map(trackSummary));
  }
  if (input.operation === 'get') return JSON.stringify(trackSummary(byPersistentId(app.tracks, input.trackId, 'Music track')));
  if (input.operation === 'state') {
    var state = String(app.playerState());
    return JSON.stringify({state: state, volume: app.soundVolume(), position: app.playerPosition(), track: state === 'stopped' ? null : trackSummary(app.currentTrack())});
  }
  if (input.operation === 'volume') { app.soundVolume = input.volume; return JSON.stringify({volume: input.volume}); }
  if (input.operation === 'create_playlist') {
    var playlist = app.UserPlaylist({name: input.name}); app.playlists.push(playlist);
    return JSON.stringify({id: String(playlist.persistentID()), name: String(playlist.name())});
  }
  if (input.operation === 'add_tracks') {
    var playlist = byPersistentId(app.playlists, input.playlistId, 'Music playlist');
    if (String(playlist.specialKind()) !== 'none' || playlist.smart()) throw new Error('Tracks can only be added to a regular user playlist.');
    var tracks = input.trackIds.map(function(id) { return byPersistentId(app.tracks, id, 'Music track'); });
    tracks.forEach(function(track) { app.duplicate(track, {to: playlist}); });
    return JSON.stringify({playlistId: input.playlistId, added: tracks.length});
  }
  if (input.operation === 'playback') {
    if (input.action === 'play') {
      if (input.trackId) app.play(byPersistentId(app.tracks, input.trackId, 'Music track'));
      else if (input.playlistId) app.play(byPersistentId(app.playlists, input.playlistId, 'Music playlist'));
      else app.play();
    } else if (input.action === 'pause') app.pause();
    else if (input.action === 'stop') app.stop();
    else if (input.action === 'next') app.nextTrack();
    else if (input.action === 'previous') app.previousTrack();
    return JSON.stringify({action: input.action, success: true});
  }
  throw new Error('Unsupported Music operation');
}
`;

const PHOTOS = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Photos');
  function summary(item) { return {id: String(item.id()), name: String(item.name() || ''), filename: String(item.filename() || ''), date: date(item.date()), favorite: Boolean(item.favorite()), width: item.width(), height: item.height()}; }
  if (input.operation === 'albums') return JSON.stringify(page(app.albums, input).map(named));
  if (input.operation === 'list') {
    var collection = input.albumId ? required(app.albums, input.albumId, 'Photos album').mediaItems : app.mediaItems;
    return JSON.stringify(page(collection, input).map(summary));
  }
  if (input.operation === 'search') return JSON.stringify((app.search({for: input.query}) || []).slice(input.offset, input.offset + input.limit).map(summary));
  if (input.operation === 'get') {
    var item = required(app.mediaItems, input.mediaId, 'Photos media item');
    var result = summary(item); result.description = String(item.description() || '').slice(0, input.maxChars); result.keywords = (item.keywords() || []).slice(0, 100);
    return JSON.stringify(result);
  }
  if (input.operation === 'create_album') return JSON.stringify(named(app.make({new: 'album', named: input.name})));
  if (input.operation === 'import') {
    var options = {skipCheckDuplicates: false};
    if (input.albumId) options.into = required(app.albums, input.albumId, 'Photos album');
    var imported = app.import(input.paths.map(function(path) { return Path(path); }), options) || [];
    return JSON.stringify({imported: imported.map(summary)});
  }
  if (input.operation === 'add_to_album' || input.operation === 'export') {
    var items = input.mediaIds.map(function(id) { return required(app.mediaItems, id, 'Photos media item'); });
    if (input.operation === 'add_to_album') { app.add(items, {to: required(app.albums, input.albumId, 'Photos album')}); return JSON.stringify({albumId: input.albumId, added: items.length}); }
    app.export(items, {to: Path(input.directory), usingOriginals: input.originals});
    return JSON.stringify({directory: input.directory, requested: items.length, exported: true, originals: input.originals});
  }
  if (input.operation === 'update') {
    var item = required(app.mediaItems, input.mediaId, 'Photos media item');
    ['name', 'description', 'favorite', 'keywords'].forEach(function(key) { if (input[key] !== undefined) item[key] = input[key]; });
    return JSON.stringify(summary(item));
  }
  throw new Error('Unsupported Photos operation');
}
`;

const MESSAGES = COMMON + String.raw`
function run(argv) {
  var input = JSON.parse(argv[0]);
  var app = Application('Messages');
  function serviceType(account) {
    // Some macOS Messages builds advertise this property but reject its Apple Event.
    try { return String(account.serviceType()); } catch (_) { return null; }
  }
  if (input.operation === 'accounts') return JSON.stringify(page(app.accounts, input).map(function(account) { return {id: String(account.id()), description: String(account.description() || ''), serviceType: serviceType(account), enabled: Boolean(account.enabled()), connectionStatus: String(account.connectionStatus())}; }));
  if (input.operation === 'chats') {
    var collection = input.accountId ? required(app.accounts, input.accountId, 'Messages account').chats : app.chats;
    return JSON.stringify(page(collection, input).map(function(chat) { return {id: String(chat.id()), name: String(chat.name() || ''), accountId: String(chat.account().id()), participants: chat.participants().slice(0, 100).map(function(participant) { return {id: String(participant.id()), handle: String(participant.handle() || '')}; })}; }));
  }
  if (input.operation === 'send') {
    var account = required(app.accounts, input.accountId, 'Messages account');
    if (!account.enabled() || String(account.connectionStatus()) !== 'connected') throw new Error('The selected Messages account is not connected and enabled.');
    // The full participant ID is account-id:handle, as specified by Messages.sdef.
    var participant = account.participants.byId(input.accountId + ':' + input.recipient);
    app.send(input.text, {to: participant});
    return JSON.stringify({submitted: true, accountId: input.accountId, recipient: input.recipient, deliveryConfirmed: false});
  }
  throw new Error('Unsupported Messages operation');
}
`;

const id = z.string().min(1).max(1024);
const text = z.string().max(10000);
const name = z.string().min(1).max(500);
const paging = {limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).max(100000).default(0)};
const maxChars = z.number().int().min(1).max(200000).default(20000);
const url = z.string().url().max(10000).refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Only http and https URLs are supported.');
const absolutePath = z.string().min(2).max(4096).refine(value => value.startsWith('/') && !value.includes('\0'), 'An absolute local path without NUL characters is required.');
const read = {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false};
const create = {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true};
const update = {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true};
const remove = {...update, idempotentHint: false};
const localControl = {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false};

export function createPersonalTools(runScript = runJxa) {
  const tools = [];
  function add(name, description, inputSchema, script, operation, annotations = read, validate) {
    const schema = z.object(inputSchema).strict();
    tools.push({name, description, inputSchema, annotations, handler: async (input = {}) => {
      const args = schema.parse(input);
      if (validate) await validate(args);
      const raw = await runScript(script, {...args, operation});
      let value;
      try { value = JSON.parse(raw); } catch { throw new Error(`${name} returned invalid JSON`); }
      if (value === null || typeof value !== 'object') throw new Error(`${name} returned an unexpected response`);
      return value;
    }});
  }
  function changes(args, keys) { if (!keys.some(key => args[key] !== undefined)) throw new Error('Provide at least one field to update.'); }

  add('apple_notes_list_accounts', 'Read-only: list Notes account IDs and names.', paging, NOTES, 'accounts');
  add('apple_notes_list_folders', 'Read-only: list Notes folder IDs and names, optionally within one account.', {...paging, accountId: id.optional()}, NOTES, 'folders');
  add('apple_notes_list', 'Read-only: list note metadata without reading note bodies, optionally within a folder.', {...paging, folderId: id.optional()}, NOTES, 'list');
  add('apple_notes_search', 'Read-only: find Notes by title substring; this does not search note bodies.', {...paging, query: name, folderId: id.optional()}, NOTES, 'search');
  add('apple_notes_get', 'Read-only: get note metadata and bounded plain text or HTML. Locked notes return metadata only.', {noteId: id, format: z.enum(['text', 'html']).default('text'), maxChars}, NOTES, 'get');
  add('apple_notes_create', 'Create a note in an explicit folder, with an escaped title heading and optional HTML body. May sync to iCloud.', {folderId: id, title: name, htmlBody: z.string().max(200000).default('')}, NOTES, 'create', create);
  add('apple_notes_update', 'Change a note title and/or replace its entire HTML body. Replacing the body can remove formatting or attachments; locked notes are rejected.', {noteId: id, title: name.optional(), htmlBody: z.string().max(200000).optional()}, NOTES, 'update', update, args => changes(args, ['title', 'htmlBody']));
  add('apple_notes_delete', 'Delete an unlocked note using Notes deletion behavior. May sync deletion to other devices.', {noteId: id}, NOTES, 'delete', remove);
  add('apple_notes_create_folder', 'Create a top-level Notes folder in an explicit account.', {accountId: id, name}, NOTES, 'create_folder', create);

  const contactFields = {firstName: text, lastName: text, organization: text, jobTitle: text, note: text};
  add('apple_contacts_search', 'Read-only: find contacts by name or organization substring. Returns summaries, not all contact details.', {...paging, query: name}, CONTACTS, 'search');
  add('apple_contacts_get', 'Read-only: get one contact with names, organization, emails, phones, and bounded notes.', {contactId: id, maxChars}, CONTACTS, 'get');
  add('apple_contacts_list_groups', 'Read-only: list Contacts groups.', paging, CONTACTS, 'groups');
  add('apple_contacts_list_group_members', 'Read-only: list summaries of people in one Contacts group.', {...paging, groupId: id}, CONTACTS, 'group_members');
  add('apple_contacts_create', 'Create and save a contact, optionally with labeled emails and phone numbers. Refuses to run while Contacts has unsaved edits.', {firstName: name, lastName: text.default(''), organization: text.default(''), jobTitle: text.default(''), note: text.default(''), emails: z.array(z.object({label: name.default('home'), value: z.string().email().max(320)}).strict()).max(20).default([]), phones: z.array(z.object({label: name.default('mobile'), value: z.string().min(1).max(100)}).strict()).max(20).default([])}, CONTACTS, 'create', create);
  add('apple_contacts_update', 'Update and save selected name, organization, job title, or note fields. Leaves phone and email collections unchanged. Refuses pending unsaved Contacts edits.', {contactId: id, ...Object.fromEntries(Object.entries(contactFields).map(([key, value]) => [key, value.optional()]))}, CONTACTS, 'update', update, args => changes(args, Object.keys(contactFields)));
  add('apple_contacts_create_group', 'Create and save a Contacts group. Refuses pending unsaved Contacts edits.', {name}, CONTACTS, 'create_group', create);
  add('apple_contacts_add_to_group', 'Add an existing contact to a group and save Contacts changes.', {contactId: id, groupId: id}, CONTACTS, 'add_to_group', {...create, idempotentHint: true});
  add('apple_contacts_remove_from_group', 'Remove a contact from a group without deleting the contact; saves Contacts changes.', {contactId: id, groupId: id}, CONTACTS, 'remove_from_group', update);

  const tab = {windowId: z.number().int().positive(), tabIndex: z.number().int().min(1).max(10000)};
  add('apple_safari_list_tabs', 'Read-only: list Safari tab titles, URLs, window IDs, and one-based tab indices. Tab indices change when tabs close.', paging, SAFARI, 'list');
  add('apple_safari_get_tab', 'Read-only: read one Safari tab title and URL, with optional bounded page text using Safari scripting. Does not execute page JavaScript.', {...tab, includeText: z.boolean().default(false), maxChars}, SAFARI, 'get');
  add('apple_safari_open_tab', 'Open an HTTP(S) URL in a new Safari tab. This loads the URL and can contact a remote website.', {url, windowId: z.number().int().positive().optional(), activate: z.boolean().default(false)}, SAFARI, 'open', create);
  add('apple_safari_navigate_tab', 'Navigate one Safari tab to an HTTP(S) URL. Requires its previously observed URL to avoid modifying a different tab after indices shift.', {...tab, expectedUrl: z.string().max(10000), url}, SAFARI, 'navigate', {...update, idempotentHint: false});
  add('apple_safari_close_tab', 'Close a Safari tab; unsaved page input may be lost. Requires its previously observed URL.', {...tab, expectedUrl: z.string().max(10000)}, SAFARI, 'close', {...remove, openWorldHint: false});
  add('apple_safari_add_reading_list', 'Add an HTTP(S) URL, optional title, and preview to Safari Reading List; may sync through iCloud.', {url, title: text.default(''), preview: text.default('')}, SAFARI, 'reading_list', create);

  add('apple_music_list_playlists', 'Read-only: list Music playlist persistent IDs, names, and kinds.', paging, MUSIC, 'playlists');
  add('apple_music_list_tracks', 'Read-only: list Music library or playlist track metadata; IDs are persistent hexadecimal IDs.', {...paging, playlistId: id.optional()}, MUSIC, 'tracks');
  add('apple_music_search', 'Read-only: search an explicit Music playlist. Use list_playlists to identify the library playlist.', {...paging, playlistId: id, query: name, only: z.enum(['all', 'artists', 'albums', 'composers', 'names']).default('all')}, MUSIC, 'search');
  add('apple_music_get_track', 'Read-only: get one Music library track by persistent ID.', {trackId: id}, MUSIC, 'get');
  add('apple_music_get_playback_state', 'Read-only: get Music playback state, volume, position, and current track when playing or paused.', {}, MUSIC, 'state');
  add('apple_music_playback', 'Control Music playback: play/resume, pause, stop, next, or previous. Play optionally targets one track or playlist. Playback can stream audio.', {action: z.enum(['play', 'pause', 'stop', 'next', 'previous']), trackId: id.optional(), playlistId: id.optional()}, MUSIC, 'playback', {...localControl, openWorldHint: true}, args => { if (args.trackId && args.playlistId) throw new Error('Choose either trackId or playlistId.'); if (args.action !== 'play' && (args.trackId || args.playlistId)) throw new Error('A track or playlist target is only valid for play.'); });
  add('apple_music_set_volume', 'Set Music playback volume from 0 to 100.', {volume: z.number().int().min(0).max(100)}, MUSIC, 'volume', {...localControl, idempotentHint: true});
  add('apple_music_create_playlist', 'Create a new user playlist in Music. May sync through the music library.', {name}, MUSIC, 'create_playlist', create);
  add('apple_music_add_tracks_to_playlist', 'Copy existing library tracks into a regular user playlist. Rejects smart and special playlists. Repeating may add duplicates.', {playlistId: id, trackIds: z.array(id).min(1).max(20)}, MUSIC, 'add_tracks', create);

  add('apple_photos_list_albums', 'Read-only: list Photos album IDs and names.', paging, PHOTOS, 'albums');
  add('apple_photos_list', 'Read-only: list Photos library or album media metadata without exporting image data.', {...paging, albumId: id.optional()}, PHOTOS, 'list');
  add('apple_photos_search', 'Read-only: search Photos using its native search command; returns bounded metadata results.', {...paging, query: name}, PHOTOS, 'search');
  add('apple_photos_get', 'Read-only: get one Photos media item with metadata, keywords, and bounded description.', {mediaId: id, maxChars}, PHOTOS, 'get');
  add('apple_photos_create_album', 'Create a new top-level Photos album.', {name}, PHOTOS, 'create_album', create);
  add('apple_photos_add_to_album', 'Add existing Photos media items to an album. Does not import or delete files.', {albumId: id, mediaIds: z.array(id).min(1).max(20)}, PHOTOS, 'add_to_album', create);
  add('apple_photos_import', 'Import existing local files into Photos, optionally into an album. Duplicate checking remains enabled; imported media may upload to iCloud Photos.', {paths: z.array(absolutePath).min(1).max(20), albumId: id.optional()}, PHOTOS, 'import', create, async args => { for (const path of args.paths) { if (!(await stat(path)).isFile()) throw new Error(`Photos import path must be a regular file: ${path}`); } });
  add('apple_photos_export', 'Export selected Photos media into an existing empty local directory. Requires an empty directory to reduce overwrite risk; originals can trigger iCloud downloads. Exports originals or rendered JPEGs.', {mediaIds: z.array(id).min(1).max(20), directory: absolutePath, originals: z.boolean().default(true)}, PHOTOS, 'export', create, async args => { if (!(await stat(args.directory)).isDirectory()) throw new Error('Photos export destination must be a directory.'); if ((await readdir(args.directory)).length) throw new Error('Photos export destination must be empty to avoid overwriting existing files.'); });
  add('apple_photos_update', 'Update a Photos media title, description, favorite flag, and/or replace its keyword list. May sync through iCloud Photos.', {mediaId: id, name: text.optional(), description: text.optional(), favorite: z.boolean().optional(), keywords: z.array(z.string().min(1).max(200)).max(100).optional()}, PHOTOS, 'update', update, args => changes(args, ['name', 'description', 'favorite', 'keywords']));

  add('apple_messages_list_accounts', 'Read-only: list Messages accounts (also called services), IDs, service types, and connection states. serviceType is null if macOS does not expose it.', paging, MESSAGES, 'accounts');
  add('apple_messages_list_chats', 'Read-only: list Messages chat metadata and participant handles. Apple scripting does not expose message history.', {...paging, accountId: id.optional()}, MESSAGES, 'chats');
  add('apple_messages_send', 'Immediately send text to one explicit phone number or email through a selected connected Messages account. This is a real outgoing message; success means submitted, not delivered.', {accountId: id, recipient: z.string().max(320).refine(value => /^\+[1-9]\d{6,14}$/.test(value) || /^[^\s@:]+@[^\s@]+\.[^\s@]+$/.test(value), 'Use an international phone number (+countrycode) or email address.'), text: z.string().min(1).max(20000)}, MESSAGES, 'send', create);
  return tools;
}
