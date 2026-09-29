import { build as buildClient } from 'vite';
import { build as buildWorker } from 'esbuild';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { resolve, extname, relative, sep } from 'node:path';

await buildClient();
const assets={};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
function collect(folder,prefix) {
  for(const item of readdirSync(folder,{withFileTypes:true})) {
    const file=resolve(folder,item.name), route=`${prefix}/${item.name}`;
    if(item.isDirectory()) { if(item.name==='assets')collect(file,route); }
    else if(types[extname(file)])assets[route]={body:readFileSync(file,'utf8'),type:types[extname(file)]};
  }
}
collect(resolve('dist'),'');
collect(resolve('network/challenges'),'/desafios');
mkdirSync('dist/server',{recursive:true});
await buildWorker({entryPoints:['network/cloud-worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'site-assets',setup(build){build.onLoad({filter:/site-assets\.mjs$/},()=>({contents:`export const assets=${JSON.stringify(assets)};`,loader:'js'}));}}]});
mkdirSync('dist/.openai',{recursive:true});
cpSync('.openai/hosting.json','dist/.openai/hosting.json');
cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Sites: páginas, desafíos y servidor compartido preparados.');
