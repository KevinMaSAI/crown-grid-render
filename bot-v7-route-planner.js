'use strict';
const {neighbors}=require('./engine');
class StrongBot{
 constructor(p){this.me=p;this.reason='规划开局';this.path=[];this.target=-1;this.kind='';this.lastAttempt=null;this.generals=[];this.cities=new Set();this.seen=[];this.knownTerrain=[];this.visits=[];this.lastTarget=-1;this.targetAge=0;}
 decide(v){const p=this.me,t=v.terrain,a=v.armies,n=t.length,w=v.w,h=v.h,turn=v.turn||0;
 if(v.scores?.find(s=>s.i===p)?.dead)return null;
 if(!this.adj||this.adj.length!==n){this.adj=Array.from({length:n},(_,i)=>neighbors(i,w,h));this.path=[];}const ns=i=>this.adj[i];
 const ally=o=>o>=0&&o!==p&&v.teams&&v.teams[o]===v.teams[p];const enemy=o=>o>=0&&o!==p&&!ally(o);v.cities.forEach(i=>this.cities.add(i));v.generals.forEach((g,i)=>{if(g>=0)this.generals[i]=g;});for(let i=0;i<n;i++)if(t[i]>=-2){this.seen[i]=turn;this.knownTerrain[i]=t[i];}
 for(const sc of v.scores||[])if(sc.dead)this.generals[sc.i]=-1;
 const home=this.generals[p],own=v.scores?.find(s=>s.i===p),owned=own?.tiles||t.filter(o=>o===p).length;
 if(home===undefined||home<0)return null;
 const reinforce=(g,exclude=-1)=>{let owner=t[g],byOwner=new Map();if(owner<0)return 0;for(let i of ns(g)){let o=t[i];if(i===exclude||o<0||!(o===owner||v.teams&&v.teams[o]===v.teams[owner])||!(turn%2===0?o<p:o>p))continue;byOwner.set(o,Math.max(byOwner.get(o)||0,a[i]-1));}return [...byOwner.values()].reduce((x,y)=>x+y,0);};

 let hd=Array(n).fill(Infinity),q=[home];hd[home]=0;for(let k=0;k<q.length;k++){let i=q[k];for(let j of ns(i))if(t[j]!==-2&&t[j]!==-4&&hd[j]===Infinity){hd[j]=hd[i]+1;q.push(j);}}
 let threats=[];for(let i=0;i<n;i++)if(enemy(t[i])&&hd[i]<=7&&a[i]>hd[i]+a[home]-2)threats.push({i,d:hd[i],power:a[i]-hd[i],urgency:(a[i]-hd[i]-a[home])/(hd[i]+1)});threats.sort((x,y)=>y.urgency-x.urgency);const threat=threats[0];
 if(this.lastAttempt){let m=this.lastAttempt;if(t[m.to]===p&&this.path[1]===m.to)this.path.shift();else this.path=[];this.lastAttempt=null;}
 if(this.path.length>1&&((t[this.target]===p&&this.kind!=='defend')||this.path.some(i=>t[i]===-2||t[i]===-4||ally(t[i]))))this.path=[];
 // Replan when there is a credible capital threat, or when a newly revealed general is attackable.
 const knownTargets=this.generals.filter((g,i)=>i!==p&&!ally(i)&&g>=0&&t[g]!==p);
 if(threat&&this.kind!=='defend')this.path=[];
 if(knownTargets.length&&this.kind!=='general'&&turn%4===0)this.path=[];
 // Bank enough army for a useful first expansion chain; abort the opening if scouted.
 if(owned===1&&turn<24&&!threat&&!t.some(enemy)){this.reason='开局蓄兵，准备连续扩张';return null;}
 const usable=i=>{if(i===home&&threat){let reserve=Math.max(1,threat.power-Math.floor(threat.d/2)+2);return Math.max(0,a[i]-reserve);}return a[i]-1;};
 if(this.path.length>1){let from=this.path[0],to=this.path[1];if(t[from]!==p||a[from]<2||((enemy(t[to])||t[to]===-1)&&a[from]-1<=a[to]+(knownTargets.includes(to)?reinforce(to,from):0)))this.path=[];else if(from===home&&threat)this.path=[];}
 if(this.path.length<2){let best=null,sources=Array.from({length:n},(_,i)=>i).filter(i=>t[i]===p&&a[i]>1).sort((x,y)=>a[y]-a[x]).slice(0,24);
 const enemyArmy=Math.max(1,...(v.scores||[]).filter(s=>s.i!==p&&!ally(s.i)&&!s.dead).map(s=>s.total));const advantage=(own?.total||1)/enemyArmy;
 for(let src of sources){let initial=usable(src);if(initial<1)continue;let queue=[{i:src,power:initial,path:[src],hostileCost:0}],seen=new Map([[src,{steps:0,power:initial}]]);
 for(let k=0;k<queue.length;k++){let cur=queue[k];if(cur.path.length>28||cur.power<seen.get(cur.i).power)continue;
 let next=ns(cur.i).slice().sort((x,y)=>(t[y]===p)-(t[x]===p));
 for(let j of next){if((seen.get(j)?.steps<cur.path.length)||t[j]===-2||t[j]===-4||ally(t[j]))continue;let steps=cur.path.length,city=this.cities.has(j),general=knownTargets.includes(j),isEnemy=enemy(t[j]);
 let defense=t[j]===-3?0:a[j];if((city||general)&&isEnemy)defense+=Math.floor(steps/2);if(general&&steps===1)defense+=reinforce(j,cur.i);
 let power=cur.power+(t[j]===p?a[j]-1:-defense-1);if(power<1||seen.get(j)?.steps===steps&&seen.get(j).power>=power)continue;seen.set(j,{steps,power});let path=cur.path.concat(j),hostileCost=cur.hostileCost+(t[j]===p?0:defense);
 if(t[j]!==p||threat&&j===home){let reason,kind,value;
 if(threat&&j===home&&src!==home){value=600+threat.urgency*20;reason='调兵回防主城';kind='defend';if(power+a[home]<threat.power)value*=.75;}
 else if(general){value=30000;reason='集中兵力斩首';kind='general';}
 else if(threat&&isEnemy&&hd[j]<=threat.d+1&&a[j]>=threat.power){value=1200;reason='拦截威胁主城的敌军';kind='defend';}
 else if(city){value=(isEnemy?80:55)+(turn>200?15:0);reason='集中兵力占城';kind='city';}
 else{let fog=ns(j).filter(i=>t[i]===-3||t[i]===-4).length;value=isEnemy?(advantage>1.15?33:20):16;value+=fog*(turn>100?2:1);if(isEnemy)value+=Math.min(50,power*.9);if(fog&&ns(j).some(i=>enemy(t[i])))value+=Math.min(30,power*.6);if(t[j]===-3)value+=4;let remains=50-turn%50;if(steps<remains&&remains<20)value+=7;if(turn>120&&fog)value+=Math.min(12,hd[j]*.45);reason=isEnemy?'抢占敌方领地':fog?'侦察敌方主城':'高效扩张';kind='expand';}
 let score=value/(steps+2)-hostileCost*(general?.002:.07)-(this.visits[j]||0)*.025;
 if(threat&&kind!=='defend'&&kind!=='general')score*=.12;
 if(steps>1&&t[path[1]]===p)score+=Math.min(2,power*.015);
 if(!best||score>best.score||score===best.score&&power>best.power)best={path,target:j,score,reason,kind,power};}
 queue.push({i:j,power,path,hostileCost});}
 }}
 if(best){this.path=best.path;this.target=best.target;this.reason=best.reason;this.kind=best.kind;}else{this.reason=threat?'主城留兵待援':'积蓄突破兵力';return null;}}
 let [from,to]=this.path;if(t[from]!==p||a[from]<2)return null;let half=false;
 if(from===home&&threat){let sent=Math.floor(a[from]/2),reserve=a[from]-sent;if(reserve<threat.power||t[to]!==p&&t[to]!==-3&&sent<=a[to]){this.path=[];this.reason='保留主城防守兵力';return null;}half=true;}
 let move={from,to,half};this.lastAttempt=move;this.visits[to]=(this.visits[to]||0)+1;return move;
 }
}
module.exports={StrongBot,Bot:StrongBot};
