import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalTools } from '../src/personal-tools.js';

// Explicitly opt in on a Mac with these apps installed and Automation access.
// Calls use one-item metadata samples and never print the returned values.
// No mutation, playback, import/export, or outgoing message is exercised here.
const enabled = process.env.RUN_APPLE_PERSONAL_INTEGRATION === '1';
const tools = createPersonalTools();
const discovery = [
  'apple_notes_list_accounts',
  'apple_notes_list_folders',
  'apple_notes_list',
  'apple_contacts_list_groups',
  'apple_safari_list_tabs',
  'apple_music_list_playlists',
  'apple_music_list_tracks',
  'apple_photos_list_albums',
  'apple_photos_list',
  'apple_messages_list_accounts',
  'apple_messages_list_chats'
];

for (const name of discovery) {
  test(`personal app discovery: ${name} returns bounded metadata`, {skip: !enabled, timeout: 35000}, async () => {
    assert.equal(process.platform, 'darwin', 'Live Apple integration requires macOS.');
    const tool = tools.find(tool => tool.name === name);
    assert.equal(tool.annotations.readOnlyHint, true);
    const result = await tool.handler({limit: 1});
    // Assert booleans, not the actual arrays: failure output must not leak data.
    assert.equal(Array.isArray(result), true, 'Expected a metadata array.');
    assert.equal(result.length <= 1, true, 'The one-item bound must be respected.');
    assert.equal(result.every(item => item !== null && typeof item === 'object' && !Array.isArray(item)), true, 'Expected metadata objects.');
  });
}
