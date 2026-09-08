const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const allowed=new Set(['index.html','styles.css','app.js','favicon.svg']);
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400).end('Bad request');return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
 if(!allowed.has(name)){res.writeHead(404).end('Not found');return;}
 fs.readFile(path.join(__dirname,name),(error,data)=>{if(error){res.writeHead(500).end('Unable to read file');return;}res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);});
});
if(require.main===module){server.listen(Number(process.env.PORT)||5173,'127.0.0.1',()=>console.log('WeedBuddy is ready at http://127.0.0.1:'+server.address().port));server.on('error',e=>{console.error(e.message);process.exitCode=1;});}
module.exports=server;
