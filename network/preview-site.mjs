// Development only. This adapter is never included in the published Worker.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../dist/server/index.js';

const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const DB={prepare(sql){let args=[];return{bind(...v){args=v;return this;},async first(){return sqlite.prepare(sql).get(...args);},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}};}}}};
const server=http.createServer(async(req,res)=>{
  try{
    const parts=[];for await(const chunk of req)parts.push(chunk);
    const request=new Request(`http://localhost:3211${req.url}`,{method:req.method,headers:req.headers,...(parts.length?{body:Buffer.concat(parts)}:{})});
    const response=await worker.fetch(request,{DB,CONTROL_KEY:process.env.CONTROL_KEY || 'prueba-local-solo-demostracion-3211',SESSION_KEY:'clave-de-sesion-solo-para-vista-previa-local'});
    if(req.method==='POST')console.log(req.method,req.url,response.status);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){console.error(e);res.writeHead(500);res.end('Error de vista previa');}
});
server.listen(3211,'127.0.0.1',()=>console.log('Vista previa: http://localhost:3211/control'));
process.on('SIGINT',()=>server.close(()=>{sqlite.close();process.exit();}));
