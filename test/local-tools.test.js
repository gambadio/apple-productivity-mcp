import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createLocalTools, createPathPolicy, parseArraySetting } from '../src/local-tools.js';

async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'apple-mcp-test-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 return root;
}
const byName=(tools,name)=>tools.find(t=>t.name===name).handler;

test('file policy fails closed for unset roots, outside paths, traversal, and symlinks',async t=>{
 const root=await fixture(t);const allowed=path.join(root,'allowed');const outside=path.join(root,'outside');await mkdir(allowed);await mkdir(outside);await writeFile(path.join(outside,'secret'),'private');await symlink(outside,path.join(allowed,'link'));
 const check=createPathPolicy([allowed]);
 await assert.rejects(createPathPolicy([])(allowed),/require APPLE/);
 await assert.rejects(check(path.join(allowed,'..','outside','secret')),/outside/);
 await assert.rejects(check(path.join(allowed,'link','secret')),/outside/);
 await assert.rejects(check(path.join(allowed,'link','new'),{create:true}),/outside/);
 await assert.rejects(check(allowed,{allowRoot:false}),/root itself/);
 await symlink(path.join(outside,'not-created'),path.join(allowed,'dangling'));
 await assert.rejects(check(path.join(allowed,'dangling'),{create:true}),/dangling symlink/);
});

test('file writes and copies refuse replacement; reads are bounded; binary data is rejected',async t=>{
 const root=await fixture(t);const tools=createLocalTools({fileRoots:[root],shortcuts:[]});const file=path.join(root,'test.txt');
 const write=byName(tools,'apple_files_write_text');const read=byName(tools,'apple_files_read_text');
 await write({path:file,text:'hello world'});
 await assert.rejects(write({path:file,text:'lost'}),/exist/i);
 assert.equal(await readFile(file,'utf8'),'hello world');
 const result=await read({path:file,maxBytes:5});assert.equal(result.text,'hello');assert.equal(result.truncated,true);
 await write({path:file,text:'short',overwrite:true});assert.equal(await readFile(file,'utf8'),'short');
 await assert.rejects(byName(tools,'apple_files_copy')({source:file,destination:file}),/exist/i);
 await writeFile(path.join(root,'binary'),Buffer.from([0,1,2]));await assert.rejects(read({path:path.join(root,'binary')}),/Binary/);
 await assert.rejects(read({path:root}),/regular file/);
});

test('Shortcuts run is absent without allowlist and passes names as literal argv',async()=>{
 assert.equal(createLocalTools({shortcuts:[],fileRoots:[]}).some(x=>x.name==='apple_shortcuts_run'),false);
 let called;const dangerous='Report; $(echo should-not-execute)';
 const tools=createLocalTools({shortcuts:[dangerous],fileRoots:[],runCommand:async(...args)=>{called=args;return {stdout:'done'};}});
 const run=byName(tools,'apple_shortcuts_run');await assert.rejects(run({name:'unapproved'}));assert.equal(called,undefined);
 assert.deepEqual(await run({name:dangerous}),{name:dangerous,output:'done'});
 assert.deepEqual(called[1],['run',dangerous]);assert.equal(called[0],'/usr/bin/shortcuts');
 assert.equal(tools.find(x=>x.name==='apple_shortcuts_run').annotations.destructiveHint,true);
});

test('configuration rejects malformed arrays',()=>{
 assert.deepEqual(parseArraySetting('','test'),[]);assert.throws(()=>parseArraySetting('"/tmp"','test'),/JSON array/);assert.throws(()=>parseArraySetting('[42]','test'),/nonempty strings/);
});

test('trash refuses symlinks instead of deleting the referenced content',async t=>{
 const root=await fixture(t);const target=path.join(root,'target.txt');const link=path.join(root,'selected-link');
 await writeFile(target,'keep this');await symlink(target,link);
 let invoked=false;
 const tools=createLocalTools({fileRoots:[root],shortcuts:[],runScript:async()=>{invoked=true;return '{}';}});
 await assert.rejects(byName(tools,'apple_files_trash')({path:link}),/symbolic links/);
 assert.equal(invoked,false);assert.equal(await readFile(target,'utf8'),'keep this');
 await byName(tools,'apple_files_trash')({path:target});assert.equal(invoked,true);
});

test('capability discovery unwraps Objective-C nil before marking apps installed',async()=>{
 const nilWrapper={value:undefined};
 const runScript=async(script,input)=>vm.runInNewContext(script+'\nrun(argv)',{
  argv:[JSON.stringify(input)],
  ObjC:{import:()=>{},unwrap:object=>object.value},
  $:{NSWorkspace:{sharedWorkspace:{URLForApplicationWithBundleIdentifier:bundle=>bundle==='com.apple.finder'?{value:{}}:nilWrapper}}}
 });
 const result=await byName(createLocalTools({runScript,fileRoots:[],shortcuts:[]}),'apple_system_capabilities')({});
 assert.equal(result.apps.Finder.installed,true);
 assert.equal(result.apps.Pages.installed,false);
});
