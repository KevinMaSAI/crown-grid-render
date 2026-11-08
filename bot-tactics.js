'use strict';
// Local tactical safety layer. It examines only visible tiles and public turn order.
function protectGeneral(v,p,proposed,adj){
 const home=v.generals[p];if(home<0||home===undefined)return {move:proposed,override:false};
 const t=v.terrain,a=v.armies,teams=v.teams,ally=o=>o>=0&&o!==p&&teams&&teams[o]===teams[p],enemy=o=>o>=0&&o!==p&&!ally(o);
 const generalOwner=new Map(v.generals.map((g,i)=>[g,i]).filter(([g])=>g>=0));
 const cities=new Set(v.cities),turn=v.turn||0,afterMe=o=>turn%2===0?o>p:o<p;
 let relevant=[];for(let mid of adj[home]){relevant.push(mid);relevant.push(...adj[mid]);}relevant=[...new Set(relevant)].filter(i=>enemy(t[i])&&afterMe(t[i]));
 if(!relevant.length)return {move:proposed,override:false};
 function assess(move){let terrain=t.slice(),army=a.slice(),killed=new Set();
  if(move){let {from,to,half}=move;if(terrain[from]!==p||army[from]<=1)return {safe:false,score:-Infinity};let sent=half?Math.floor(army[from]/2):army[from]-1;army[from]-=sent;
   if(terrain[to]===p){army[to]+=sent;}else if(sent>army[to]){let old=terrain[to];army[to]=sent-army[to];terrain[to]=p;if(generalOwner.get(to)===old&&old>=0){killed.add(old);for(let i=0;i<t.length;i++)if(terrain[i]===old){terrain[i]=p;army[i]=Math.ceil(army[i]/2);}}}else army[to]-=sent;
  }
  const homeArmy=army[home],growth=(turn+1)%2===0?1:0,farm=(turn+1)%50===0?1:0;
  let worst=Infinity,threat=false,immediateByOwner=new Map();
  for(let src of relevant){let owner=terrain[src];if(!enemy(owner)||!afterMe(owner)||killed.has(owner)||army[src]<2)continue;
   if(adj[home].includes(src)){immediateByOwner.set(owner,Math.max(immediateByOwner.get(owner)||0,army[src]-1));let margin=homeArmy-(army[src]-1);worst=Math.min(worst,margin);if(margin<0)threat=true;}
   for(let mid of adj[src]){if(mid===home||!adj[home].includes(mid)||terrain[mid]===-2||terrain[mid]===-4)continue;
    let moving=army[src]-1,midOwner=terrain[mid],friendly=midOwner===owner||teams&&midOwner>=0&&teams[midOwner]===teams[owner];let after=friendly?moving+army[mid]:moving-army[mid];if(after<=0)continue;
    let extra=((cities.has(mid)||generalOwner.has(mid))?growth:0)+farm;let margin=homeArmy+growth+farm-(after+extra-1);worst=Math.min(worst,margin);if(margin<0)threat=true;
   }
  }
  if([...immediateByOwner.values()].reduce((sum,n)=>sum+n,0)>homeArmy)threat=true;return {safe:!threat,margin:worst,kills:killed.size};
 }
 if(assess(proposed).safe)return {move:proposed,override:false};
 let candidates=[null];if(proposed&&!proposed.half)candidates.push({...proposed,half:true});
 for(let from=0;from<t.length;from++)if(t[from]===p&&a[from]>1)for(let to of adj[from]){if(t[to]===-2||t[to]===-4||ally(t[to]))continue;if(t[to]!==p&&a[from]-1<=a[to])continue;candidates.push({from,to,half:false});}
 let best=null,bestScore=-Infinity;
 for(let move of candidates){let result=assess(move);if(!result.safe)continue;let score=move?0:-1;if(move){score=result.kills*100000;if(proposed&&move.from===proposed.from&&move.to===proposed.to)score+=500;if(move.to===home)score+=300+Math.min(50,a[move.from]/10);else if(t[move.to]!==p)score+=cities.has(move.to)?50:enemy(t[move.to])?20:10;else score+=Math.min(5,a[move.from]/20);}
  if(score>bestScore){bestScore=score;best=move;}}
 if(bestScore===-Infinity)return {move:proposed,override:false};
 return {move:best,override:true};
}
module.exports={protectGeneral};
