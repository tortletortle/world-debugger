'use strict';
// WORLD.DEBUG V0.46: budgeted counterexample audit, using the frozen V0.45 search engine.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const code=[40,41,42,43,44,45].map(i=>{const m=html.match(new RegExp('<script id="v'+i+'Core" type="text/plain">([\\s\\S]*?)</script>'));if(!m)throw Error('missing core '+i);return m[1];}).join('\n');
const E=vm.runInNewContext(code+'\n;({dataset41,dataset45,truth45,truth41,trainMemory44,discover42,committee42,scale42,policy45,predict,metric,makeRng,normal,HOLD45})');
const laws={bend:(a,b)=>.2*(a+.3*b)**3+.4*Math.sin(b),hinge:(a,b)=>.8*Math.max(0,a-b-.5)+.25*b,ring:(a,b)=>Math.sin(.6*(a*a+b*b))+.15*a,product:(a,b)=>.3*a*b*Math.abs(a-b),rational:(a,b)=>1.3*b/(1+.6*(a-.8*b)**2),nested:(a,b)=>Math.sin(a*Math.tanh(b))+.15*a};
const grid=Array.from({length:289},(_,i)=>[(Math.floor(i/17)-8)/2,(i%17-8)/2]);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
const modes=['random','disagree','hybrid'];
function plan(models,train,pool,method,seed,budget=12){
  if(!modes.includes(method)||!models.length||!train.length||!Number.isInteger(budget)||budget<1||budget>pool.length)throw Error('bad audit inputs');
  const rng=E.makeRng(seed),items=pool.map((x,id)=>{const v=models.map(m=>E.predict(m,x));return {id,x,gap:Math.sqrt(avg(v.map(y=>(y-avg(v))**2))),novel:Math.min(...train.map(r=>dist(x,r.x))),jitter:rng()};});
  if(items.some(i=>!Number.isFinite(i.gap)))throw Error('nonfinite committee prediction');
  const maxGap=Math.max(1e-12,...items.map(i=>i.gap)),maxNovel=Math.max(1e-12,...items.map(i=>i.novel)),chosen=[];
  for(let k=0;k<budget;k++){
    const score=i=>{const coverage=chosen.length?Math.min(1,Math.min(...chosen.map(j=>dist(i.x,j.x)))/2):1;return method==='random'?i.jitter:method==='disagree'?i.gap/maxGap:(.25*i.gap/maxGap+.45*i.novel/maxNovel+.30*coverage);};
    items.sort((a,b)=>score(b)-score(a)||a.id-b.id);chosen.push(items.shift());
  }return chosen.map(({id,x})=>({id,x}));
}
function audit(model,probes,query){const residuals=probes.map(({id,x})=>{const y=query(id);return Math.abs(E.predict(model,x)-y);});return Math.sqrt(avg(residuals.map(v=>v*v)));}
function task(mode,shift,seed,memory,calibration){
  const truth=calibration?(a,b)=>E.truth45(mode,a,b):laws[mode];
  const d=calibration?E.dataset45(seed,mode,shift,100):E.dataset41(seed,'linear',shift,100);
  if(!calibration)for(const r of [...d.train,...d.validation.flatMap(g=>g.rows),...d.test.flatMap(g=>g.rows)])r.y+=truth(...r.x)-E.truth41('linear',...r.x);
  const sd=E.scale42(d.train),disc=E.discover42(d.train,d.validation,seed^0x9e3779b9,24,240,'adaptive'),bank=E.committee42(disc,sd);
  const p=E.policy45(bank,d.train,d.validation,sd,seed^0x7f4a7c15,'mixed',memory),best=p.best;
  assert.equal(p.fits,96);
  const rng=E.makeRng(seed^0x21345678),ledger=grid.map(x=>truth(...x)+.30*E.normal(rng));
  const scores={validation:best.valWorst},probes={};
  for(const method of modes){const q=plan([best,...bank],d.train,grid,method,seed^12345);assert.equal(new Set(q.map(r=>r.id)).size,12);scores[method]=audit(best,q,id=>ledger[id]);probes[method]=q.map(r=>r.id);}
  // The final test is accessed only after all audit actions and scores are fixed.
  const clean=d.test.flatMap(g=>g.rows).map(r=>({...r,y:truth(...r.x)})),error=E.metric(best,clean).rmse;
  assert(Number.isFinite(error)&&Object.values(scores).every(Number.isFinite));return {mode,shift,seed,error,scores,probes};
}
function evaluate(cal,test){const output={};for(const key of ['validation',...modes]){const n=Math.floor(cal.length*.75),threshold=cal.map(r=>r.scores[key]).sort((a,b)=>a-b)[n-1];const accepted=test.filter(r=>r.scores[key]<=threshold),sorted=test.slice().sort((a,b)=>a.scores[key]-b.scores[key]),matched=sorted.slice(0,Math.floor(test.length*.75));const stat=a=>({accepted:a.length,coverage:a.length/test.length,mean:a.length?avg(a.map(r=>r.error)):null,severe:a.filter(r=>r.error>2).length});output[key]={threshold,frozen:stat(accepted),matched75:stat(matched),rejectedSevere: test.filter(r=>r.scores[key]>threshold&&r.error>2).length};}return output;}
if(require.main===module){const memory=E.trainMemory44(),cal=[],test=[];for(const [isCal,ms,out] of [[true,E.HOLD45,cal],[false,Object.keys(laws),test]])for(const mode of ms)for(const shift of ['combined'])for(const seed of (isCal?[76001]:[86021])){out.push(task(mode,shift,seed,memory,isCal));process.stderr.write('.');}const report={budget:12,initialFits:240,extraFits:96,cal,test,summary:evaluate(cal,test)};console.log(JSON.stringify(report,null,2));}
module.exports={plan,audit,evaluate,task};
