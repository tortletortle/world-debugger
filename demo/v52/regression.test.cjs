'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./world.js'),ref=require('./benchmark.json');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),core=fs.readFileSync(path.join(__dirname,'world.js'),'utf8');
let n=0;function check(x,m){if(!x)throw Error(m);n++;}
check(html.includes(core),'embedded source');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique ids');
for(const mode of E.modes)for(const policy of E.policies){
 const a=E.create(mode,76321,policy,.06,30,.35),b=E.create(mode,76321,policy,.06,30,.35);
 while(!a.snapshot().done){a.step();b.step();}
 const s=a.snapshot();check(JSON.stringify(s)===JSON.stringify(b.snapshot()),'determinism');
 check(s.missing+s.available===s.eligible&&s.acquired<=s.available,'sensor ledger');
 check(s.totalSamples<=s.acquired&&s.totalSamples<=s.attempts*80,'budget');
 check(s.blockSamples[0]<=30&&s.blockSamples[1]<=20&&s.blockSamples[2]<=30,'split budget');
 check(s.auditHighSpeed<=s.auditRows&&s.auditRows<=s.totalSamples,'coverage ledger');
 check(s.planEvaluations===(['info','contrast','contrast_random_audit','contrast_challenge','contrast_speed_sweep'].includes(policy)?8*s.planCalls:0),'plan work');
 check(s.auditEvaluations===(policy==='contrast_challenge'?8*s.auditPlanCalls:0),'audit work');
 check(a.trace.every(r=>r.bodies.every(b=>b.every(Number.isFinite)&&Math.hypot(b[4],b[5])<=6+1e-9)),'bounded control');
 check(s.repairs+s.rejects<=s.attempts,'attempt ledger');
 if(mode==='healthy')check(!s.events.length,'healthy');
 if(mode==='unknown')check(s.repairs===0,'oscillating holdout');
 if(mode==='hidden'&&policy==='contrast_speed_sweep')check(s.repairs===0&&s.rejects>0,'hidden pressure challenge');
}
for(const d of [-1,2,NaN]){let rejected=false;try{E.create('hidden',1,'contrast',.06,30,d);}catch(e){rejected=true;}check(rejected,'invalid dropout');}
const s=E.create('linear',1,'fixed',.06,30,0).snapshot();for(const p of ['fixed','random','info','contrast']){const a=E.plan(s.bodies,[],s.model,0,p,()=>.5);check(a.action.every(x=>Math.abs(Math.hypot(...x)-1.35)<1e-9),'matched directions');}
function harness(){
 const elems=Object.fromEntries(ids.map(id=>[id,{clientWidth:510,clientHeight:280,width:0,height:0,value:'',disabled:false,textContent:'',innerHTML:'',style:{},scrollHeight:0,scrollTop:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}]));
 Object.assign(elems.mode,{value:'hidden'});elems.seed.value='76321';elems.speed.value='12';elems.strategy.value='contrast_speed_sweep';elems.budget.value='30';elems.drop.value='.35';elems.noise.value='.06';let next,download,resize;
 const doc={getElementById:id=>{if(!elems[id])throw Error('missing '+id);return elems[id]},createElement:()=>({click(){}})},win={devicePixelRatio:1,addEventListener:(name,fn)=>{if(name==='resize')resize=fn;}},u={createObjectURL:b=>{download=JSON.parse(b.parts[0]);return 'blob:mock'},revokeObjectURL(){}},B=class{constructor(parts){this.parts=parts;}};
 const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 new Function('document','window','requestAnimationFrame','URL','Blob','setTimeout','module',js)(doc,win,f=>{next=f},u,B,()=>{},undefined);
 let t=100;function tick(k){for(let i=0;i<k;i++){t+=120;let f=next;next=null;f(t);if(!next)throw Error('frame stopped');}}
 return {e:elems,tick,exp:()=>{elems.export.onclick();return download;},resize:()=>resize()};
}
const {e,tick,exp,resize}=harness();check(exp().adaptive.drop===.35&&exp().adaptive.noise===.06,'sensor controls');e.start.onclick();tick(6);let t0=exp().adaptive.t;check(t0>0&&e.drop.disabled,'run');e.pause.onclick();tick(4);check(exp().adaptive.t===t0,'pause');e.start.onclick();tick(65);let r=exp();check(r.adaptive.t===72&&r.fixed.t===72&&r.adaptive.repairs===0&&r.adaptive.rejects>0,'hidden demo');check(r.adaptive.auditHighSpeed>0,'speed coverage');check(e.counts.textContent.includes('丢包'),'sensor panel');e.reset.onclick();check(exp().adaptive.t===0,'reset');e.strategy.value='contrast';e.strategy.onchange();e.start.onclick();tick(65);r=exp();check(r.adaptive.repairs>0,'ordinary audit accepts hidden model');e.reset.onclick();e.drop.value='.65';e.drop.onchange();e.noise.value='.12';e.noise.onchange();check(exp().adaptive.drop===.65&&exp().fixed.noise===.12,'paired sensors');e.inject.onclick();check(exp().adaptive.first===0&&exp().fixed.first===0,'manual mutation');resize();
for(const g of ref.groups){const x=E.benchmark(g.n,g.budget,g.seedBase,g.methods,g.drop);check(x.cases.length===g.cases.length,'case count');for(let i=0;i<x.cases.length;i++)for(let j=0;j<g.columns.length;j++){const a=x.cases[i][g.columns[j]],b=g.cases[i][j];if(typeof b==='number')check(Math.abs(a-b)<1e-7,'replay '+g.columns[j]);else check(JSON.stringify(a)===JSON.stringify(b),'replay '+g.columns[j]);}}
console.log('PASS '+n+' assertions including all recorded cases and mocked UI.');
