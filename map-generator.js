'use strict';
// Seeded procedural maps. No fixed spawn coordinates or fixed joining corridors.
function generateMap(seed,width,height,count,{rng,neighbors,teams=null}){
 const random=rng(seed),w=width??(count===2?18+Math.floor(random()*6):22+Math.floor(random()*5)),h=height??(count===2?17+Math.floor(random()*6):20+Math.floor(random()*5)),n=w*h;
 if(count<2||count>4||w<12||h<12)throw Error('Unsupported map size/player count');
 const adj=Array.from({length:n},(_,i)=>neighbors(i,w,h)),manhattan=(a,b)=>Math.abs(a%w-b%w)+Math.abs(Math.floor(a/w)-Math.floor(b/w));
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 function reach(t,start,blocked=new Set(),limit=Infinity){let d=new Int16Array(n).fill(-1),q=[start];d[start]=0;for(let k=0;k<q.length;k++){let i=q[k];if(d[i]>=limit)continue;for(let j of adj[i])if(t[j]!==-2&&!blocked.has(j)&&d[j]<0){d[j]=d[i]+1;q.push(j);}}return {q,d};}
 for(let attempt=0;attempt<40;attempt++){
  const t=Array.from({length:n},()=>random()<.14+attempt%3*.015?-2:-1),a=Array(n).fill(0);let largest=[],visited=new Set();for(let i=0;i<n;i++)if(t[i]!==-2&&!visited.has(i)){let component=reach(t,i).q;for(let j of component)visited.add(j);if(component.length>largest.length)largest=component;}if(largest.length<n*.68)continue;let connected=new Set(largest);for(let i=0;i<n;i++)if(!connected.has(i))t[i]=-2;
  const candidates=largest.filter(i=>i%w>0&&i%w<w-1&&i>=w&&i<n-w&&adj[i].filter(j=>t[j]!==-2).length>=2);
  const openness=new Map(candidates.map(i=>[i,reach(t,i,new Set(),4).q.length]));let g=null;
  for(let trial=0;trial<250&&!g;trial++){let picked=[];for(let p=0;p<count;p++){let eligible=candidates.filter(i=>picked.every((other,k)=>{let same=teams&&teams[p]===teams[k],d=manhattan(i,other);return d>=(same?5:count===2?16:teams?12:10)&&(!same||d<=9)&&Math.abs(openness.get(i)-openness.get(other))<=14;}));if(!eligible.length)break;picked.push(eligible[Math.floor(random()*eligible.length)]);}if(picked.length===count)g=picked;}
  if(!g)continue;
  const protectedTiles=new Set(g.flatMap(i=>[i,...neighbors(i,w,h,true)])),cities=[],blocked=new Set(),distances=g.map(i=>reach(t,i).d);
  function addCity(i,army){if(t[i]!==-1||protectedTiles.has(i)||blocked.has(i)||cities.some(j=>manhattan(i,j)<2))return false;blocked.add(i);let r=reach(t,g[0],blocked);if(g.some(j=>r.d[j]<0)||r.q.length!==largest.length-blocked.size){blocked.delete(i);return false;}cities.push(i);a[i]=army;return true;}
  const nearbyDistance=4+Math.floor(random()*3),nearbyArmy=40+Math.floor(random()*11);let nearbyComplete=true;
  for(let p=0;p<count;p++){let near=shuffle(candidates.filter(i=>distances[p][i]>=nearbyDistance&&distances[p][i]<=nearbyDistance+1&&distances.every((d,k)=>k===p||d[i]>=distances[p][i])));let added=false;for(let i of near)if(addCity(i,nearbyArmy)){added=true;break;}if(!added){nearbyComplete=false;break;}}
  if(!nearbyComplete)continue;
  const target=count*3+Math.floor(random()*3);for(let i of shuffle(largest.slice())){if(cities.length>=target)break;addCity(i,40+Math.floor(random()*11));}
  g.forEach((i,p)=>{t[i]=p;a[i]=1;});return {seed,w,h,t,a,g,cities};
 }
 throw Error('Unable to generate a connected fair map for this seed');
}
module.exports={generateMap};
