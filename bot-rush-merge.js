'use strict';
function rushDefense(v,p,proposed,adj,memory,plan,opts={}){
 const radius=opts.radius||14,calendar=opts.calendar!==false;const t=v.terrain,a=v.armies,home=v.generals[p],turn=v.turn||0,teams=v.teams,ally=o=>o>=0&&o!==p&&teams&&teams[o]===teams[p],enemy=o=>o>=0&&o!==p&&!ally(o);
 if(home<0||home===undefined)return null;
 let hd=Array(t.length).fill(Infinity),q=[home];hd[home]=0;for(let k=0;k<q.length;k++)for(let j of adj[q[k]])if(t[j]!==-2&&t[j]!==-4&&hd[j]===Infinity){hd[j]=hd[q[k]]+1;q.push(j);}
 const movesBefore=(owner,step=1)=>(turn+step-1)%2===0?p<owner:p>owner;
 let threats=[];
 for(let i=0;i<t.length;i++)if(enemy(t[i])&&a[i]>=2&&(a[i]>=18||hd[i]<=3)&&hd[i]<=radius){let advancing=false;
  for(let prev of adj[i])if(memory.t?.[prev]===t[i]&&(t[prev]===t[i]||t[prev]===-3)&&memory.a[prev]-a[prev]>=8&&a[i]>=(memory.a[prev]-a[prev])*.35&&(memory.t[i]!==t[i]||a[i]-memory.a[i]>=Math.min(5,(memory.a[prev]-a[prev])*.35)+(turn%50===0?1:0)+(turn%2===0&&(v.cities.includes(i)||v.generals.includes(i))?1:0))&&hd[prev]>hd[i])advancing=true;
  if(advancing)memory.active.set(t[i],turn+12);if(!advancing&&hd[i]>3&&(memory.active.get(t[i])||0)<turn)continue;
  let power=-Infinity;
  if(calendar){
   const H=hd[i],strength=Array(t.length).fill(-Infinity),cities=new Set(v.cities),generals=new Set(v.generals.filter(g=>g>=0));strength[i]=a[i];
   for(let step=1;step<=H;step++)for(let source of q)if(hd[source]===H-step+1&&strength[source]>1)for(let dest of adj[source])if(hd[dest]===hd[source]-1){
    let moving=strength[source]-1;if(dest===home){power=Math.max(power,moving);continue;}
    let beforeGrowth=0;if(t[dest]>=0){beforeGrowth+=Math.floor((turn+step-1)/50)-Math.floor(turn/50);if(cities.has(dest)||generals.has(dest))beforeGrowth+=Math.floor((turn+step-1)/2)-Math.floor(turn/2);}
    let defense=a[dest]+beforeGrowth,friendly=t[dest]===t[i]||teams&&t[dest]>=0&&teams[t[dest]]===teams[t[i]],arrived=friendly?moving+defense:moving-defense;if(arrived<=0)continue;
    if((turn+step)%50===0)arrived++;if((turn+step)%2===0&&(cities.has(dest)||generals.has(dest)))arrived++;
    strength[dest]=Math.max(strength[dest],arrived);
   }
  }else{let gain=Array(t.length).fill(-Infinity);gain[home]=0;for(let j of q.filter(j=>hd[j]<=hd[i]).sort((x,y)=>hd[x]-hd[y])){if(j===home)continue;for(let next of adj[j])if(hd[next]===hd[j]-1){let friendly=t[next]===t[i]||teams&&t[next]>=0&&teams[t[next]]===teams[t[i]],delta=next===home?-1:friendly?a[next]-1:-a[next]-1;gain[j]=Math.max(gain[j],gain[next]+delta);}}power=a[i]+gain[i];}
  let homeGrowth=calendar?Math.floor((turn+hd[i]-1)/2)-Math.floor(turn/2)+Math.floor((turn+hd[i]-1)/50)-Math.floor(turn/50):Math.floor(hd[i]/2),sent=proposed?.from===home?(proposed.half?Math.floor(a[home]/2):a[home]-1):0,received=proposed?.to===home?(proposed.half?Math.floor(a[proposed.from]/2):a[proposed.from]-1):0,projected=a[home]-sent+received+homeGrowth;
  if(power>projected)threats.push({i,owner:t[i],eta:hd[i],power,homeGrowth});
 }
 memory.t=t.slice();memory.a=a.slice();if(!threats.length)return null;threats.sort((x,y)=>x.eta-y.eta||y.power-x.power);let danger=threats[0];
 // Preserve immediate captures; a long speculative raid is not a guaranteed race win.
 if(proposed&&proposed.to===v.generals[danger.owner]&&(proposed.half?Math.floor(a[proposed.from]/2):a[proposed.from]-1)>a[proposed.to])return null;
 if(proposed&&plan.kind==='general'&&plan.path.length>=2&&plan.path[0]===proposed.from&&plan.path[1]===proposed.to&&plan.generals.indexOf(plan.target)===danger.owner){let steps=plan.path.length-1;if(steps<=3&&(steps<danger.eta||steps===danger.eta&&movesBefore(danger.owner,steps)))return null;}
 for(let source of adj[danger.i])if(t[source]===p&&a[source]-1>a[danger.i]&&movesBefore(danger.owner)){return {move:{from:source,to:danger.i,half:false},reason:'直接拦截逼近主城的大军'};}
 if(proposed?.from===home){let reserve=a[home]-Math.floor(a[home]/2);if(reserve+danger.homeGrowth>=danger.power+1){let m={...proposed,half:true};if(t[m.to]===p||Math.floor(a[home]/2)>a[m.to])return {move:m,reason:'保留足够守军后出兵'};}}
 let distance=Array(t.length).fill(Infinity),toward=Array(t.length).fill(-1),owned=[home];distance[home]=0;for(let k=0;k<owned.length;k++)for(let j of adj[owned[k]])if(t[j]===p&&distance[j]===Infinity){distance[j]=distance[owned[k]]+1;toward[j]=owned[k];owned.push(j);}
 let need=Math.max(1,danger.power-a[home]-danger.homeGrowth+2),best=null;
 for(let source of owned){let d=distance[source];if(!d||a[source]<2||d>danger.eta||d===danger.eta&&!movesBefore(danger.owner,d))continue;let delivered=0;for(let i=source;i!==home;i=toward[i])delivered+=a[i]-1;let score=Math.min(delivered,need)/d;if(!best||score>best.score)best={source,score,d,delivered};}
 if(best)return {move:{from:best.source,to:toward[best.source],half:false},reason:'按抵达时限提前集结守军'};
 return null;
}
module.exports={rushDefense};
