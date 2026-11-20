'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./world.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),core=fs.readFileSync(path.join(__dirname,'world.js'),'utf8');
let n=0;function check(x,m){if(!x)throw Error(m);n++;}
check(html.includes(core),'embedded source');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);check(ids.length===new Set(ids).size,'unique ids');
const nominal={terms:[2],beta:[.35]};
const rows=Array.from({length:60},(_,i)=>{const j=Math.floor(i/2),x=j<15?-1:1,axis=j%2,vx=.7;return {x,y:.2,vx,vy:0,axis,yobs:(axis===0?-.35*vx:0)+(x>0?.8:0)};});
const a=E.splitAudit(nominal,rows,.06,'tree_guard'),b=E.splitAudit(nominal,rows.map((r,i)=>({...r,yobs:r.yobs+(i%2?2:0)})),.06,'tree_guard');
check(a.discover===30&&a.confirm===30,'separate label counts');check(JSON.stringify(a.assessment.map(r=>r.path))===JSON.stringify(b.assessment.map(r=>r.path)),'confirmation labels cannot choose tree');check(a.assessment.some(r=>r.status==='supported')&&a.assessment.some(r=>r.status==='failed'),'synthetic spatial counterexample');check(b.assessment.every(r=>r.status!=='supported'),'confirmation veto');
check(E.authorized(a.assessment,{x:-1,y:.2,vx:.7,vy:0}),'supported');check(!E.authorized(a.assessment,{x:-5,y:.2,vx:.7,vy:0}),'envelope');check(!E.authorized(a.assessment,{x:1,y:.2,vx:.7,vy:0}),'failed region');
for(const mode of E.modes)for(const policy of E.policies){
 const s=E.create(mode,92381,policy,.06,30,.35),q=E.create(mode,92381,policy,.06,30,.35);let uses=0,fallback=0,scoped=policy.startsWith('scope_')||policy.startsWith('fixed_')||policy.startsWith('tree_');
 while(!s.snapshot().done){const p=s.snapshot();s.step();q.step();const tr=s.trace.at(-1);if(scoped&&p.repairs>0)for(const u of tr.usage){const [x,y,vx,vy]=u.state,allowed=E.authorized(p.approved,{x,y,vx,vy});check(u.learned===allowed,'runtime authorization');if(allowed)uses++;else fallback++;}}
 const p=s.snapshot();check(JSON.stringify(p)===JSON.stringify(q.snapshot()),'repeatability');check(p.approvedFrames===uses&&p.fallbackFrames===fallback,'usage counts');check(p.missing+p.available===p.eligible&&p.acquired<=p.available,'sensor ledger');check(p.totalSamples<=p.acquired&&p.totalSamples<=p.attempts*(p.trainLimit+p.selectLimit+p.auditLimit),'budget');check(p.approved.every(c=>c.status==='supported'),'approval evidence');
 check(s.trace.every(r=>r.bodies.every(v=>v.every(Number.isFinite)&&Math.hypot(v[4],v[5])<=6+1e-9)),'bounded controls');
 if(policy.startsWith('fixed_')||policy.startsWith('tree_')){check(p.discoveryLabels===p.confirmationLabels,'balanced labels');check(p.lastAssessment.every(c=>c.status!=='supported'||(c.n>=7&&c.axes.every(x=>x>=2))),'minimum evidence');}
 if(mode==='healthy')check(p.events.length===0,'healthy');
}
function harness(){
 const elems=Object.fromEntries(ids.map(id=>[id,{clientWidth:510,clientHeight:280,width:0,height:0,value:'',disabled:false,textContent:'',innerHTML:'',style:{},scrollHeight:0,scrollTop:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}]));
 elems.mode.value='hidden';elems.seed.value='92381';elems.speed.value='12';elems.strategy.value='tree_guard';elems.budget.value='30';elems.drop.value='.35';elems.noise.value='.06';let next,download,resize;
 const doc={getElementById:id=>{if(!elems[id])throw Error('missing '+id);return elems[id]},createElement:()=>({click(){}})},win={devicePixelRatio:1,addEventListener:(k,fn)=>{if(k==='resize')resize=fn;}},url={createObjectURL:b=>{download=JSON.parse(b.parts[0]);return 'blob:mock'},revokeObjectURL(){}},BlobMock=class{constructor(parts){this.parts=parts;}};
 const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 new Function('document','window','requestAnimationFrame','URL','Blob','setTimeout','module',js)(doc,win,f=>next=f,url,BlobMock,()=>{},undefined);
 let t=100;function tick(k){for(let i=0;i<k;i++){t+=120;let f=next;next=null;f(t);if(!next)throw Error('frame stopped');}}
 return {e:elems,tick,exp:()=>{elems.export.onclick();return download;},resize:()=>resize()};
}
const {e,tick,exp,resize}=harness();check(exp().adaptive.policy==='tree_guard','initial');e.start.onclick();tick(6);let t0=exp().adaptive.t;check(t0>0&&e.drop.disabled,'run');e.pause.onclick();tick(4);check(exp().adaptive.t===t0,'pause');e.start.onclick();tick(65);let z=exp();check(z.adaptive.t===72&&z.adaptive.repairs===1,'hidden demo');check(z.adaptive.lastAssessment.some(c=>c.status==='failed')&&e.scope.innerHTML.includes('验证失败'),'failed domain panel');check(e.approved.innerHTML.includes('速度'),'approved region');check(z.adaptive.discoveryLabels===30&&z.adaptive.confirmationLabels===30,'export evidence');e.reset.onclick();check(exp().adaptive.t===0,'reset');e.mode.value='spatial';e.mode.onchange();e.start.onclick();tick(65);check(exp().adaptive.lastAssessment.length>0&&e.scope.innerHTML.includes('RMSE'),'spatial evidence');e.reset.onclick();e.strategy.value='fixed_guard';e.strategy.onchange();e.drop.value='.65';e.drop.onchange();e.inject.onclick();check(exp().adaptive.policy==='fixed_guard'&&exp().adaptive.drop===.65&&exp().adaptive.first===0,'parameters');resize();
function same(a,b,k){if(typeof b==='number')check(Math.abs(a-b)<1e-7,'replay '+k);else if(Array.isArray(b)){check(Array.isArray(a)&&a.length===b.length,'array '+k);for(let j=0;j<b.length;j++)same(a[j],b[j],k);}else if(b&&typeof b==='object'){for(const p of Object.keys(b))same(a[p],b[p],k+'.'+p);}else check(a===b,'replay '+k);}
for(let i=0;i<3;i++){const f=JSON.parse(fs.readFileSync(path.join(__dirname,'benchmark-'+i+'.json'),'utf8')),g=f.group,x=E.benchmark(g.n,g.budget,g.seedBase,g.methods,g.drop);check(x.cases.length===g.cases.length,'case count');same(x.report,g.report,'report');for(let j=0;j<x.cases.length;j++)for(let k=0;k<f.columns.length;k++)same(x.cases[j][f.columns[k]],g.cases[j][k],f.columns[k]);}
console.log('PASS '+n+' assertions; split isolation, authorization, complete replay, mocked UI.');
