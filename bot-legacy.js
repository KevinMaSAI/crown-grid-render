'use strict';
const {neighbors}=require('./engine');
class Bot{
 constructor(p){this.me=p;this.path=[];this.reason='等待增兵';this.knownCities=new Set();this.generals=[];this.visits=[];this.lastAttempt=null;}
 decide(v){this.w=v.w;this.h=v.h;let t=v.terrain,a=v.armies,p=this.me,n=t.length;v.cities.forEach(i=>this.knownCities.add(i));v.generals.forEach((g,i)=>{if(g>=0)this.generals[i]=g;});let home=this.generals[p],enemy=(v.scores||[]).find(sc=>sc.i!==p&&(!v.teams||v.teams[sc.i]!==v.teams[p])&&!sc.dead)?.i??(1-p);
 const ns=i=>neighbors(i,v.w,v.h),threat=home>=0?Math.max(0,...ns(home).filter(i=>t[i]===enemy).map(i=>a[i])):0;
 if(this.lastAttempt){let m=this.lastAttempt;if(t[m.to]===p&&this.path[1]===m.to)this.path.shift();else this.path=[];this.lastAttempt=null;}
 if(this.path.length>1&&t[this.path.at(-1)]===p)this.path=[];
 if(threat>0)this.path=[];
 const usable=i=>i===home&&threat>0?(a[i]-Math.floor(a[i]/2)>threat?Math.floor(a[i]/2):0):a[i]-1;
 if(this.path.length<2){let best=null;let sources=Array.from({length:n},(_,i)=>i).filter(i=>t[i]===p&&usable(i)>1).sort((i,j)=>a[j]-a[i]).slice(0,24);
 for(let src of sources){let q=[{i:src,power:usable(src),path:[src]}],seen=new Set([src]);for(let k=0;k<q.length;k++){let cur=q[k];if(cur.path.length>36)continue;for(let j of ns(cur.i)){if(seen.has(j)||t[j]===-2||t[j]===-4||(v.teams&&t[j]>=0&&t[j]!==p&&v.teams[t[j]]===v.teams[p]))continue;seen.add(j);let cost=t[j]===p?1-a[j]:(t[j]===-3?1:a[j]+1),power=cur.power-cost;if(power<1)continue;let path=cur.path.concat(j),steps=path.length-1;
 if(t[j]!==p){let general=j===this.generals[enemy],city=this.knownCities.has(j),fog=ns(j).filter(i=>t[i]===-3||t[i]===-4).length;let value=general?20000:city?100:t[j]===enemy?22:12;value+=fog*4;if(t[j]===-3)value+=5;if(threat&&ns(home).includes(j)&&t[j]===enemy)value+=400;let score=value/(steps+2)-(this.visits[j]||0)*.05;if(!best||score>best.score)best={path,score,reason:general?'突袭敌方主城':city?'集兵攻占城市':t[j]===enemy?'压制敌方领地':fog?'探索迷雾':'扩张领地'};}
 q.push({i:j,power,path});}
 }}
 if(best){this.path=best.path;this.reason=best.reason;}else{this.reason=threat?'守卫主城':'积蓄兵力';return null;}}
 let [from,to]=this.path;if(t[from]!==p||usable(from)<1||t[to]===-2||t[to]===-4){this.path=[];return null;}let half=from===home&&threat>0;let power=half?Math.floor(a[from]/2):a[from]-1;if(t[to]!==p&&t[to]!==-3&&power<=a[to]){this.path=[];return null;}
 let move={from,to,half};this.lastAttempt=move;this.visits[to]=(this.visits[to]||0)+1;return move;
 }
}
module.exports={Bot};
