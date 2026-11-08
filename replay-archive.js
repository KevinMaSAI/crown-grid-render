 'use strict';
const {Pool}=require('pg'),store=require('./replay-store');
function summary(id,rows){const s=rows[0],end=rows.at(-1);return {id,room:s.room,names:s.names,teams:s.teams,seed:s.seed,botVersion:s.botVersion,date:+id.split('-')[0],turn:rows.findLast(r=>r.kind==='turn')?.turn||0,winner:end.winner,reason:end.reason};}
class ReplayArchive{
 constructor(connectionString,{pool,maxBytes=200*1024*1024}={}){this.pool=pool||new Pool({connectionString,max:3,connectionTimeoutMillis:12000,idleTimeoutMillis:30000});this.maxBytes=maxBytes;this.pending=new Set();this.lastError=null;this.ready=this.pool.query('CREATE TABLE IF NOT EXISTS match_replays (id text PRIMARY KEY, data text NOT NULL, summary jsonb NOT NULL, bytes integer NOT NULL)');this.ready.catch(()=>{this.lastError='数据库初始化失败';});}
 async put(id,text){await this.ready;const rows=store.decode(text),meta=summary(id,rows),bytes=Buffer.byteLength(text);if(bytes>3*1024*1024)throw Error('回放过大');const result=await this.pool.query('INSERT INTO match_replays (id,data,summary,bytes) SELECT $1,$2,$3::jsonb,$4::integer WHERE EXISTS(SELECT 1 FROM match_replays WHERE id=$1) OR (SELECT COALESCE(SUM(bytes),0) FROM match_replays)+$4::integer <= $5::bigint ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,summary=EXCLUDED.summary,bytes=EXCLUDED.bytes',[id,text,JSON.stringify(meta),bytes,this.maxBytes]);if(!result.rowCount)throw Error('回放存储额度已满');this.lastError=null;}
 save(id,text){const job=(async()=>{for(let attempt=0;attempt<3;attempt++){try{await this.put(id,text);return;}catch(e){this.lastError='回放云端保存失败';if(attempt===2){console.error('Replay archive save failed; local journal retained');return;}await new Promise(r=>setTimeout(r,1000*(attempt+1)));}}})();this.pending.add(job);job.finally(()=>this.pending.delete(job));return job;}
 async list(){await this.ready;return (await this.pool.query('SELECT summary FROM match_replays ORDER BY id DESC LIMIT 1000')).rows.map(x=>x.summary);}
 async replay(id){if(!/^[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid replay');await this.ready;const r=await this.pool.query('SELECT data FROM match_replays WHERE id=$1',[id]);if(!r.rows.length)throw Error('回放不存在');return store.replayRows(store.decode(r.rows[0].data));}
 async flush(){await Promise.all([...this.pending]);}
 async close(){await this.flush();await this.pool.end();}
}
module.exports={ReplayArchive};
