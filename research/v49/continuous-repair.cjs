'use strict';
// V0.49 continuous-state repair; reuses V0.48 search implementation.
function module49(E){
'use strict';
const modes=['healthy','switches','nonlinear','mixed','rapid','open'];
const methods=['frozen','ungated','audited','rollback','guarded'];
const N=360,nominal={ids:[0,1,2],beta:[0,.65,.45],bias:0};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mean=a=>a.reduce((s,v)=>s+v,0)/a.length,rms=a=>Math.sqrt(mean(a.map(v=>v*v)));
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return(s+.5)/4294967296;};}
function normal(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
function scenario(mode,seed){const r=rng(seed^0x49ab),sgn=()=>r()<.5?-1:1;const a={a:.65,b:.45,c:0,z:0,g:0,k:0,h:0,bias:0};
const reg=(changes)=>({...a,...changes});
const p=sgn(),q=sgn(),w=sgn();
const seq=mode==='healthy'?[]:mode==='switches'?[reg({b:.20,c:p*.13}),reg({b:.75,c:q*.15}),reg({a:.87,b:.32,c:w*.12})]:mode==='nonlinear'?[reg({z:p*.28}),reg({g:q*.30}),reg({k:w*.26,z:-p*.16})]:mode==='mixed'?[reg({b:.24,bias:p*.22,c:q*.10}),reg({z:q*.25,bias:-p*.18}),reg({g:w*.28,b:.65})]:mode==='rapid'?[reg({z:p*.30}),reg({g:q*.35,c:.1}),reg({b:.24,bias:w*.22}),reg({k:p*.32})]:[reg({h:p*.43}),reg({b:-.30,c:q*.13}),reg({h:w*.50,bias:p*.16})];
const times=mode==='rapid'?[65,87,115,245]:[65,170,275];const jitter=Math.floor(r()*9)-4;return [{t:0,p:a},...seq.map((v,i)=>({t:times[i]+jitter,p:v}))];}
function plant(p,x,u){return p.a*x+p.b*u+p.c+p.z*x*x+p.g*Math.sin(Math.PI*x)+p.k*x*u+p.h*Math.sin(7*x+3*u);}
function action(m,x,target){let best=0,cost=Infinity;for(let i=0;i<=40;i++){const u=-1+i*.05,y=E.pred(m,E.features(x,u)),v=(y-target)**2+.012*u*u;if(v<cost){cost=v;best=u;}}return best;}
function fallback(x){return clamp(-.55*x,-.55,.55);}
function simulate(mode,seed,method,noise=.025){if(!modes.includes(mode)||!methods.includes(method))throw Error('mode/method');const worlds=scenario(mode,seed),r=rng(seed),ledger=Array.from({length:N},(_,t)=>({n:normal(r),nr:normal(r),np:normal(r),d:r()<.5?-1:1,target:.38*Math.sin(t*.115)+.17*Math.sin(t*.039)}));
let x=.1,model=nominal,previous=nominal,phase='monitor',cool=0,prob=0,scores=[],train=[],val=[],audit=[],candidate=null,attempts=0,accepted=0,rejected=0,rollbacks=0,fits=0,probes=0,aborts=0,guardOverrides=0,events=[],trace=[],regime=0,dead=false;const maxAttempts=6;
const event=(t,type,extra={})=>events.push({t,type,...extra});
const reset=()=>{train=[];val=[];audit=[];candidate=null;scores=[];};
function start(t){attempts++;reset();phase='train';event(t,'alarm',{attempt:attempts});}
function fail(t,why){rejected++;phase='cooldown';cool=18;reset();event(t,'reject',{why});}
for(let t=0;t<N;t++){
if(regime+1<worlds.length&&t>=worlds[regime+1].t)regime++;
const p=worlds[regime].p,o=ledger[t];let u=0;
if(!dead){
const probing=['train','select','audit'].includes(phase);
u=action(model,x,o.target);
if(probing){const amp=phase==='train'?.88:phase==='select'?.65:.72;u=clamp(.25*u+amp*o.d,-1,1);}
if(method==='guarded'&&phase==='cooldown')u=fallback(x);
if(method==='guarded'&&Math.abs(x)>1.15){const v=fallback(x);if(Math.abs(u-v)>1e-10)guardOverrides++;u=v;}
const f=E.features(x,u),pred=E.pred(model,f),next=plant(p,x,u)+.012*o.np,y=next+p.bias+noise*o.n,ref=next+noise*o.nr,row={f,y,ref};const residual=y-pred-model.bias;
trace.push({t,x,u,next,target:o.target,phase,regime,residual});
x=next;
if(!Number.isFinite(x)||Math.abs(x)>8){dead=true;event(t,'escape');x=8*Math.sign(x||1);continue;}
if(method==='frozen')continue;
if(phase==='monitor'){scores.push(residual);if(scores.length>6)scores.shift();if(scores.length===6&&rms(scores)>.105&&attempts<maxAttempts)start(t);}
else if(probing){probes++;if(phase==='train'){train.push(row);if(train.length===24)phase='select';}
else if(phase==='select'){val.push(row);if(val.length===12){const z=E.search('residual',train,val,(seed^Math.imul(attempts,0x9e3779b9))>>>0);fits+=z.fits;candidate=z.model;phase='audit';event(t,'candidate',{ids:candidate.ids});}}
else {audit.push(row);if(audit.length===12){const gate=E.audit(candidate,audit);if(method==='ungated'||gate.accept){previous=model;model=candidate;accepted++;event(t,'commit',{gate,ids:model.ids,beta:model.beta});reset();if(method==='rollback'||method==='guarded'){phase='probation';prob=0;}else phase='monitor';}else fail(t,'independent audit');}}}
else if(phase==='probation'){prob++;scores.push(residual);if(scores.length>4)scores.shift();if((scores.length===4&&rms(scores)>.14)||Math.abs(x)>1.5){model=previous;rollbacks++;phase='cooldown';cool=18;reset();event(t,'rollback');}else if(prob>=14){phase='monitor';scores=[];event(t,'confirmed');}}
else if(phase==='cooldown'){if(--cool<=0){phase='monitor';scores=[];}}
}else trace.push({t,x,u:0,next:x,target:o.target,phase:'escaped',regime,residual:null});
}
if(['train','select','audit'].includes(phase)){aborts++;event(N,'unfinished');}
const evalRows=trace.filter(z=>z.t>=50),violations=trace.filter(z=>Math.abs(z.next)>1.5).length,tracking=rms(evalRows.map(z=>z.next-z.target)),maxState=Math.max(...trace.map(z=>Math.abs(z.next)));
return {mode,seed,method,noise,tracking,violations,maxState,dead,attempts,accepted,rejected,rollbacks,fits,probes,aborts,guardOverrides,events,trace};
}
function benchmark(seeds=12){const cases=[];for(const mode of modes)for(const noise of [.025,.055])for(let i=0;i<seeds;i++)for(const m of methods){const {trace,events,...z}=simulate(mode,490001+i*7919,m,noise);cases.push(z);}const report={};for(const m of methods){const all=cases.filter(c=>c.method===m),a=all.filter(c=>c.mode!=='healthy'),h=all.filter(c=>c.mode==='healthy');report[m]={cases:all.length,changed:a.length,tracking:mean(a.map(c=>c.tracking)),violations:a.reduce((s,c)=>s+c.violations,0),escape:a.filter(c=>c.dead).length,attempts:a.reduce((s,c)=>s+c.attempts,0),accepted:a.reduce((s,c)=>s+c.accepted,0),rejected:a.reduce((s,c)=>s+c.rejected,0),rollbacks:a.reduce((s,c)=>s+c.rollbacks,0),probes:mean(a.map(c=>c.probes)),healthyAlarms:h.filter(c=>c.attempts).length,guards:a.reduce((s,c)=>s+c.guardOverrides,0)};}return{seeds,report,cases};}
return {simulate,benchmark,modes,methods,scenario};
}
const instance=module49(require('../v48/law-recovery.cjs'));
module.exports=instance;
if(require.main===module)console.log(JSON.stringify(instance.benchmark(12),null,2));
