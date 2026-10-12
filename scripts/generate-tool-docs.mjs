import { mkdir, writeFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const client=new Client({name:'tool-catalog-generator',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:['src/index.js'],env:{PATH:process.env.PATH,APPLE_MCP_SHORTCUTS:'["Example allowlisted shortcut"]'}}));
try {
 const {tools}=await client.listTools();
 const sections=new Map();
 for(const tool of tools){const group=tool.name.split('_')[1];if(!sections.has(group))sections.set(group,[]);sections.get(group).push(tool);}
 let md='# Tool reference\n\nGenerated from the MCP `tools/list` response. Run `npm run docs:tools` after changing schemas.\n\n133 tools are registered by default; `apple_shortcuts_run` is an additional opt-in tool. App groups and read-only mode can reduce the list. File tools require configured roots when called.\n\n';
 for(const [group,items] of sections){
  md+=`## ${group}\n\n`;
  for(const tool of items){
   md+=`### \`${tool.name}\`\n\n${tool.description}\n\n`;
   const a=tool.annotations;md+=`Read-only: **${a.readOnlyHint}** · Destructive: **${a.destructiveHint}** · Idempotent: **${a.idempotentHint}** · Open-world: **${a.openWorldHint}**\n\n`;
   md+='```json\n'+JSON.stringify(tool.inputSchema,null,2)+'\n```\n\n';
  }
 }
 await mkdir('docs',{recursive:true});await writeFile('docs/TOOLS.md',md);
 await writeFile('docs/tools.json',JSON.stringify(tools,null,2)+'\n');
 console.log(`Generated ${tools.length} tool schemas (${tools.length-1} default + 1 opt-in).`);
} finally {await client.close();}
