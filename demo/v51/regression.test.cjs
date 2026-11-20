'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./world.js'),ref=require('./benchmark.json');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),core=fs.readFileSync(path.join(__dirname,'world.js'),'utf8');
let n=0;const check=(x,m)=>{if(!x)throw Error(m);n++;};
check(html.includes(core),'embedded core identity');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique IDs');
for(const mode of E.modes)for(const policy of E.policies){const a=E.create(mode,51,policy,.04,30),b=E.create(mode,51,policy,.04,30);while(!a.snapshot().done){a.step();b.step();}const s=a.snapshot();check(JSON.stringify(s)===JSON.stringify(b.snapshot()),'deterministic');check(a.trace.every(r=>r.bodies.every(b=>b.every(Number.isFinite)&&Math.hypot(b[4],b[5])<=6+1e-9)),'bounded controls');check(s.totalSamples<=s.attempts*(s.trainLimit+240),'budget');check(s.repairs+s.rejects<=s.attempts,'attempts');check(s.planEvaluations===(['info','info_safe'].includes(policy)?8*s.planCalls:0),'scoring workload');if(mode==='healthy')check(!s.events.length,'healthy');if(mode==='unknown'&&policy!=='frozen')check(s.repairs===0,'default unknown refusal');}
const a=E.create('mixed',51,'info',.04,30).snapshot(),p=E.plan(a.bodies,[],a.model,0,'info',()=>.5),q=E.plan(a.bodies,[],a.model,0,'fixed',()=>.5);
check(p.evaluations===8,'8 candidates');for(let i=0;i<E.N;i++)check(Math.abs(Math.hypot(...p.action[i])-Math.hypot(...q.action[i]))<1e-9,'equal excitation amplitude');
let invalid=false;try{E.create('mixed',51,'info',.04,0);}catch(e){invalid=true;}check(invalid,'invalid budget rejected');
function harness(){
 const elements=Object.fromEntries(ids.map(id=>[id,{clientWidth:510,clientHeight:280,width:0,height:0,value:'',disabled:false,textContent:'',innerHTML:'',style:{},scrollHeight:0,scrollTop:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}]));
 Object.assign(elements.mode,{value:'sequential'});elements.seed.value='51';elements.speed.value='12';elements.strategy.value='info_safe';elements.budget.value='30';let next,download,resize;
 const doc={getElementById:id=>{if(!elements[id])throw Error('missing '+id);return elements[id]},createElement:()=>({click(){}})},win={devicePixelRatio:1,addEventListener:(name,fn)=>{if(name==='resize')resize=fn;}},u={createObjectURL:b=>{download=JSON.parse(b.parts[0]);return 'blob:mock'},revokeObjectURL(){}},B=class{constructor(parts){this.parts=parts;}};
 const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 new Function('document','window','requestAnimationFrame','URL','Blob','setTimeout','module',js)(doc,win,f=>{next=f},u,B,()=>{},undefined);
 let t=100;function tick(k){for(let i=0;i<k;i++){t+=120;let f=next;next=null;f(t);if(!next)throw Error('frame stopped');}}
 return {e:elements,tick,exp:()=>{elements.export.onclick();return download;},resize:()=>resize()};
}
const {e,tick,exp,resize}=harness();check(exp().adaptive.trainLimit===30,'selected budget');e.start.onclick();tick(6);let t0=exp().adaptive.t;check(t0>0&&e.strategy.disabled,'running');e.pause.onclick();tick(4);check(exp().adaptive.t===t0,'pause');e.start.onclick();tick(65);let s=exp();check(s.adaptive.t===72&&s.fixed.t===72&&s.adaptive.repairs===2,'sequential demo');check(s.adaptive.planEvaluations>0,'planner active');e.reset.onclick();check(exp().adaptive.t===0,'reset');e.strategy.value='fixed240';e.strategy.onchange();check(e.budget.disabled&&exp().adaptive.trainLimit===240,'long baseline');e.strategy.value='random';e.strategy.onchange();e.mode.value='unknown';e.mode.onchange();e.inject.onclick();e.start.onclick();tick(65);s=exp();check(s.adaptive.first===0&&s.adaptive.repairs===0&&s.adaptive.rejects===1,'refusal flow');e.reset.onclick();e.mode.value='healthy';e.mode.onchange();check(e.inject.disabled,'healthy injection gate');resize();
for(const g of ref.groups){const x=E.benchmark(g.n,g.budget,g.seedBase,g.methods);check(x.cases.length===g.cases.length,'count');for(let i=0;i<x.cases.length;i++){const a=x.cases[i],b=g.cases[i];for(const k of Object.keys(b)){if(typeof b[k]==='number')check(Math.abs(a[k]-b[k])<1e-7,'replay '+k);else check(JSON.stringify(a[k])===JSON.stringify(b[k]),'replay '+k);}}}
console.log('PASS '+n+' assertions; benchmark replay and mocked UI.');
