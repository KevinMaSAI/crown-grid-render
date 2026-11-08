'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const quotas=new Map();
class MatchJournal{
 constructor(room,dir,{maxBytes=2*1024*1024,totalBytes=40*1024*1024,archive=null}={}){
  this.archive=archive;this.parts=[];this.closed=false;this.bytes=0;this.maxBytes=maxBytes;this.dir=dir;this.totalBytes=totalBytes;
  fs.mkdirSync(dir,{recursive:true});if(!quotas.has(dir)){let used=0;for(let item of fs.readdirSync(dir,{withFileTypes:true}))if(item.isFile()&&item.name.endsWith('.jsonl'))used+=fs.statSync(path.join(dir,item.name)).size;quotas.set(dir,used);}
  if(quotas.get(dir)>=totalBytes){this.closed=true;return;}
  this.file=path.join(dir,`${Date.now()}-${String(room.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)}-${crypto.randomBytes(3).toString('hex')}.jsonl`);
  this.stream=fs.createWriteStream(this.file,{flags:'wx'});this.stream.on('error',e=>{this.closed=true;console.error('Match journal disabled:',e.message);});
  const g=room.game;this.write({kind:'start',format:1,room:room.id,botVersion:room.botVersion,botBuild:room.botBuild,seed:g.seed,names:g.names,teams:g.teams,slots:room.seats.map(x=>x.type),map:{w:g.w,h:g.h,t:g.t,a:g.a,g:g.generals,cities:[...g.cities]}});
 }
 write(data){if(this.closed||!this.stream)return;let line=JSON.stringify(data)+'\n',size=Buffer.byteLength(line);if(this.bytes+size>this.maxBytes-128||(quotas.get(this.dir)||0)+size>this.totalBytes-128){this.end('quota');return;}this.bytes+=size;quotas.set(this.dir,(quotas.get(this.dir)||0)+size);if(this.archive)this.parts.push(line);this.stream.write(line);}
 turn(room){let g=room.game;this.write({kind:'turn',turn:g.turn,moves:g.appliedMoves,controllers:room.seats.map(x=>x.type==='human'&&x.auto?'auto':x.type),reasons:room.bots.map(b=>b.reason),scores:g.turn%10===0?g.scores():undefined,events:g.events.length?g.events:undefined});}
 end(reason='finished',winner=null){if(this.closed)return;this.closed=true;if(!this.stream)return;let tail=JSON.stringify({kind:'end',reason,winner})+'\n';this.bytes+=Buffer.byteLength(tail);quotas.set(this.dir,(quotas.get(this.dir)||0)+Buffer.byteLength(tail));this.stream.end(tail);if(this.archive&&reason!=='quota'){this.parts.push(tail);this.archive.save(path.basename(this.file,'.jsonl'),this.parts.join(''));this.parts=[];}}
}
module.exports={MatchJournal};
