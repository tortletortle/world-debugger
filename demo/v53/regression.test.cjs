'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./world.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),core=fs.readFileSync(path.join(__dirname,'world.js'),'utf8');
let n=0;function check(x,m){if(!x)throw Error(m);n++;}
check(html.includes(core),'embedded source');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique ids');
for(const [v,i] of [[0,0],[1.099,0],[1.1,1],[1.449,1],[1.45,2],[1.999,2],[2,3],[4,3]])check(E.cellOf({vx:v,vy:0})===i,'bin boundary');
const nominal={terms:[2],beta:[.35]},row=(v,i,e=0)=>({x:0,y:0,vx:v,vy:0,axis:i%2,yobs:i%2?e:-.35*v+e});
const rows=[...Array.from({length:10},(_,i)=>row(.8,i)),...Array.from({length:10},(_,i)=>row(1.2,i,.7)),...Array.from({length:9},(_,i)=>row(1.7,i)),...Array.from({length:12},(_,i)=>row(2.2,i))];
const cells=E.scopeAudit(nominal,rows,.06);check(cells.map(x=>x.status).join(',')==='supported,failed,unknown,unknown','coverage and residual gate');check(E.scopeAudit(nominal,Array.from({length:15},()=>row(.8,0)),.06)[0].status==='unknown','axis coverage');check(E.authorized(cells,{vx:.8,vy:0})&&!E.authorized(cells,{vx:1.2,vy:0}),'authorization');
for(const mode of E.modes)for(const policy of E.policies){
 const a=E.create(mode,84631,policy,.06,30,.35),b=E.create(mode,84631,policy,.06,30,.35);let allowed=0,fallback=0;
 while(!a.snapshot().done){const p=a.snapshot();a.step();b.step();const tr=a.trace.at(-1);if(policy.startsWith('scope_')&&p.repairs>0)for(const u of tr.usage){const expected=p.approved.some(c=>c.cell===u.cell&&c.status==='supported');check(u.learned===expected,'scope enforcement');if(expected)allowed++;else fallback++;}}
 const s=a.snapshot();check(JSON.stringify(s)===JSON.stringify(b.snapshot()),'determinism');
 check(s.approvedFrames===allowed&&s.fallbackFrames===fallback,'usage counts');
 check(s.missing+s.available===s.eligible&&s.acquired<=s.available,'sensor ledger');
 check(s.totalSamples<=s.acquired&&s.totalSamples<=s.attempts*(s.trainLimit+s.selectLimit+s.auditLimit),'budget');
 check(s.approved.every(c=>c.status==='supported'&&c.n>=10&&c.axes.every(x=>x>=3)&&c.cell<3),'authorization evidence');
 check(a.trace.every(r=>r.bodies.every(b=>b.every(Number.isFinite)&&Math.hypot(b[4],b[5])<=6+1e-9)),'bounded control');
 if(mode==='healthy')check(!s.events.length,'healthy');
 if(mode==='hidden'&&policy==='scope_dual')check(s.repairs>0&&s.approved.some(c=>c.cell===0)&&!s.approved.some(c=>c.cell>0)&&s.lastAssessment[1].status==='failed','hidden domain example');
}
function harness(){
 const elems=Object.fromEntries(ids.map(id=>[id,{clientWidth:510,clientHeight:280,width:0,height:0,value:'',disabled:false,textContent:'',innerHTML:'',style:{},scrollHeight:0,scrollTop:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}]));
 elems.mode.value='hidden';elems.seed.value='84631';elems.speed.value='12';elems.strategy.value='scope_dual';elems.budget.value='30';elems.drop.value='.35';elems.noise.value='.06';let next,download,resize;
 const doc={getElementById:id=>{if(!elems[id])throw Error('missing '+id);return elems[id]},createElement:()=>({click(){}})},win={devicePixelRatio:1,addEventListener:(name,fn)=>{if(name==='resize')resize=fn;}},u={createObjectURL:b=>{download=JSON.parse(b.parts[0]);return 'blob:mock'},revokeObjectURL(){}},B=class{constructor(parts){this.parts=parts;}};
 const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 new Function('document','window','requestAnimationFrame','URL','Blob','setTimeout','module',js)(doc,win,f=>{next=f},u,B,()=>{},undefined);
 let t=100;function tick(k){for(let i=0;i<k;i++){t+=120;let f=next;next=null;f(t);if(!next)throw Error('frame stopped');}}
 return {e:elems,tick,exp:()=>{elems.export.onclick();return download;},resize:()=>resize()};
}
const {e,tick,exp,resize}=harness();check(exp().adaptive.policy==='scope_dual','initial');e.start.onclick();tick(6);let t0=exp().adaptive.t;check(t0>0&&e.drop.disabled,'run');e.pause.onclick();tick(4);check(exp().adaptive.t===t0,'pause');e.start.onclick();tick(65);let z=exp();check(z.adaptive.t===72&&z.adaptive.approved.length===1&&z.adaptive.fallbackFrames>0,'scoped demo');check(e.scope.innerHTML.includes('验证失败')&&e.scope.innerHTML.includes('已授权'),'evidence panel');check(z.adaptiveTrace.some(r=>r.usage.some(u=>u.learned)),'export usage');e.reset.onclick();check(exp().adaptive.t===0,'reset');e.strategy.value='scope_local';e.strategy.onchange();e.start.onclick();tick(65);check(exp().adaptive.lastAssessment[1].status==='unknown','local does not claim high-speed failure');e.reset.onclick();e.drop.value='.65';e.drop.onchange();e.inject.onclick();check(exp().adaptive.drop===.65&&exp().adaptive.first===0,'parameter and trigger');resize();
function same(a,b,k){if(typeof b==='number')check(Math.abs(a-b)<1e-7,'replay '+k);else if(Array.isArray(b)){check(Array.isArray(a)&&a.length===b.length,'array '+k);for(let j=0;j<b.length;j++)same(a[j],b[j],k);}else if(b&&typeof b==='object'){for(const p of Object.keys(b))same(a[p],b[p],k+'.'+p);}else check(a===b,'replay '+k);}
for(let i=0;i<3;i++){const f=JSON.parse(fs.readFileSync(path.join(__dirname,'benchmark-'+i+'.json'),'utf8')),g=f.group,x=E.benchmark(g.n,g.budget,g.seedBase,g.methods,g.drop);check(x.cases.length===g.cases.length,'case count');same(x.report,g.report,'report');for(let j=0;j<x.cases.length;j++)for(let k=0;k<f.columns.length;k++)same(x.cases[j][f.columns[k]],g.cases[j][k],f.columns[k]);}
console.log('PASS '+n+' assertions; all cases and scoped-use trace replay; UI mocked.');
