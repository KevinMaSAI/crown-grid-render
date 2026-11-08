'use strict';
const {StrongBot:Base}=require('./bot-core'),{rushDefense}=require('./bot-rush-defense'),{protectGeneral}=require('./bot-tactics');
class StrongBot extends Base{
 constructor(p,cfg={}){super(p);this.forecastCfg={radius:14,calendar:true,...cfg};this.rushMemory={active:new Map()};this.defenseInterventions=0;}
 decide(v){let base=super.decide(v);if(v.scores?.find(s=>s.i===this.me)?.dead)return null;let response=rushDefense(v,this.me,base,this.adj,this.rushMemory,this,this.forecastCfg);if(!response)return base;let safe=protectGeneral(v,this.me,response.move,this.adj);this.path=[];this.lastAttempt=null;this.reason=response.reason;this.defenseInterventions++;return safe.move;}
}
module.exports={StrongBot,Bot:StrongBot};
