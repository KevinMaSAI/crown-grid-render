'use strict';
const {StrongBot:Planner}=require('./bot-planner'),{protectGeneral}=require('./bot-tactics'),{neighbors}=require('./engine');
class StrongBot extends Planner{
 decide(v){if(v.scores?.find(s=>s.i===this.me)?.dead)return null;
 if(!this.adj||this.adj.length!==v.terrain.length)this.adj=Array.from({length:v.terrain.length},(_,i)=>neighbors(i,v.w,v.h));
 const p=this.me,ally=o=>o>=0&&o!==p&&v.teams&&v.teams[o]===v.teams[p];
 // Never miss an immediate general capture just because its source is outside the top 24 stacks.
 const reinforce=(g,owner,exclude)=>{let groups=new Map();for(let i of this.adj[g]){let o=v.terrain[i];if(i===exclude||o<0||!(o===owner||v.teams&&v.teams[o]===v.teams[owner])||!((v.turn||0)%2===0?o<p:o>p))continue;groups.set(o,Math.max(groups.get(o)||0,v.armies[i]-1));}return [...groups.values()].reduce((x,y)=>x+y,0);};
 let captures=[];v.generals.forEach((g,owner)=>{if(g<0||owner===p||ally(owner))return;for(let from of this.adj[g])if(v.terrain[from]===p&&v.armies[from]-1>v.armies[g]+reinforce(g,owner,from))captures.push({from,to:g,half:false,score:v.scores?.find(s=>s.i===owner)?.total||0});});
 captures.sort((a,b)=>b.score-a.score);
 for(let m of captures){let move={from:m.from,to:m.to,half:false},safe=protectGeneral(v,p,move,this.adj);if(!safe.override){this.path=[];this.lastAttempt=null;this.reason='执行已确认的一步斩首';return move;}}
 if(this.path.some(i=>ally(v.terrain[i]))){this.path=[];this.lastAttempt=null;}
 let move=super.decide(v);
 if(move&&ally(v.terrain[move.to])){this.path=[];this.lastAttempt=null;return null;}
 const safe=protectGeneral(v,this.me,move,this.adj);if(safe.override){this.path=[];this.lastAttempt=null;this.reason='检查两次敌方行动后保护主城';return safe.move;}return move;
 }
}
module.exports={StrongBot,Bot:StrongBot};
