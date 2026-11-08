'use strict';
const {StrongBot:Base}=require('./bot-defense');
const {protectGeneral}=require('./bot-tactics');
class StrongBot extends Base {
 constructor(p,cfg={}){super(p,cfg);this.returnFrom=-1;this.cityScale=2;}
 decide(v){
  const base=super.decide(v),p=this.me,t=v.terrain,a=v.armies,home=v.generals[p];
  if(home<0||v.scores?.find(s=>s.i===p)?.dead)return base;
  const enemy=o=>o>=0&&o!==p&&(!v.teams||v.teams[o]!==v.teams[p]);
  const use=(move,reason)=>{this.path=[];this.lastAttempt=null;this.reason=reason;return move;};
  if(base&&v.generals.some((g,o)=>enemy(o)&&g===base.to))return base;
  if(this.returnFrom>=0){const from=this.returnFrom;this.returnFrom=-1;
   if(t[from]===p&&a[from]>1&&this.adj[from].includes(home)){
    const move={from,to:home,half:false};if(!protectGeneral(v,p,move,this.adj).override)return use(move,'解围后撤回主城');
   }
  }
  const targets=this.adj[home].filter(i=>enemy(t[i])&&a[i]>=18&&a[i]>=a[home]*.4&&a[home]-1>a[i]).sort((x,y)=>a[y]-a[x]);
  for(const to of targets){const move={from:home,to,half:false};
   if(!protectGeneral(v,p,move,this.adj).override){this.returnFrom=to;return use(move,'主动消灭贴近主城的大军');}
  }
  return base;
 }
}
module.exports={StrongBot,Bot:StrongBot};
