import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function connect(env,fn){
 const client=new Client({name:'configuration-test',version:'1.0.0'});
 await client.connect(new StdioClientTransport({command:process.execPath,args:['src/index.js'],env:{PATH:process.env.PATH,...env}}));
 try{return await fn(client);}finally{await client.close();}
}
test('read-only mode removes write handlers and group filter preserves only requested app',async()=>{
 await connect({APPLE_MCP_READ_ONLY:'true',APPLE_MCP_ENABLED_GROUPS:'notes'},async client=>{
  const {tools}=await client.listTools();assert.equal(tools.length,5);assert.ok(tools.every(t=>t.name.startsWith('apple_notes_')&&t.annotations.readOnlyHint));
  const result=await client.callTool({name:'apple_notes_delete',arguments:{noteId:'never'}});assert.equal(result.isError,true);
 });
});
test('Shortcuts execution is advertised only for configured names, and invalid input is rejected',async()=>{
 await connect({APPLE_MCP_ENABLED_GROUPS:'shortcuts',APPLE_MCP_SHORTCUTS:'["Fixture"]'},async client=>{
  const {tools}=await client.listTools();assert.equal(tools.length,3);
  const result=await client.callTool({name:'apple_shortcuts_run',arguments:{name:'Other'}});assert.equal(result.isError,true);
 });
});
test('MCP call reports missing file roots as an error without touching the filesystem',async()=>{
 await connect({APPLE_MCP_ENABLED_GROUPS:'files'},async client=>{
  const result=await client.callTool({name:'apple_files_read_text',arguments:{path:'/etc/passwd'}});assert.equal(result.isError,true);assert.match(result.content[0].text,/require APPLE_MCP_FILE_ROOTS/);
 });
});
