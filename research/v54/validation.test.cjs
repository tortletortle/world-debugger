'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('./domain-validation.cjs');
let n=0;function check(v,m){if(!v)throw Error(m);n++;}
const model={terms:[2],beta:[.35]};
const row=(i,extra=0)=>{const x=i<15?-1:1,vx=.8,axis=i%2;return {x,y:0,vx,vy:0,axis,yobs:axis===0?-.35*vx+extra:extra};};
const discovery=Array.from({length:30},(_,i)=>row(i,i<15?0:.8));
const confirm=Array.from({length:30},(_,i)=>row(i,i<15?0:.8));
const a=E.splitAudit(model,[...discovery,...confirm],.06,'tree_split');
const c=E.splitAudit(model,[...discovery,...confirm.map(r=>({...r,yobs:r.yobs+1}))],.06,'tree_split');
check(a.assessment.some(r=>r.status==='supported')&&a.assessment.some(r=>r.status==='failed'),'learn residual boundary');
check(JSON.stringify(a.assessment.map(r=>r.path))===JSON.stringify(c.assessment.map(r=>r.path)),'confirmation labels cannot change partition');
check(a.discover===30&&a.confirm===30,'temporal split');
const b=E.splitAudit(model,[...discovery,...confirm],.06,'tree_ball');
const ok={x:-1,y:0,vx:.8,vy:0},far={x:-1,y:9,vx:.8,vy:0};
check(E.authorized(b.assessment,ok)&&!E.authorized(b.assessment,far),'joint axis coverage guard');
for(const p of E.policies){const s=E.create('spatial',94117,p,.06,30,.35);
while(!s.snapshot().done){const prior=s.snapshot();s.step();const tr=s.trace.at(-1);for(const u of tr.usage){const [x,y,vx,vy]=u.state;const allowed=prior.repairs>0&&E.authorized(prior.approved,{x,y,vx,vy});check(u.learned===allowed,'per body gate');}check(tr.bodies.every(b=>b.every(Number.isFinite)&&Math.hypot(b[4],b[5])<=6+1e-9),'control bound');}
const r=s.snapshot();check(r.totalSamples<=r.attempts*110,'label budget');check(r.missing+r.available===r.eligible,'sensor ledger');}
function compare(a,b,k){if(typeof b==='number')check(Math.abs(a-b)<1e-7,'replay '+k);else if(Array.isArray(b)){check(a.length===b.length,'length '+k);for(let j=0;j<b.length;j++)compare(a[j],b[j],k);}else if(b&&typeof b==='object'){for(const p of Object.keys(b))compare(a[p],b[p],k+'.'+p);}else check(a===b,'replay '+k);}
const sets=[['validation-0.json'],['validation-1-part-0.json','validation-1-part-1.json'],['validation-2-part-0.json','validation-2-part-1.json']];
for(const files of sets){let chunks=files.map(p=>JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8'))),g=chunks[0].group,x=E.benchmark(g.n,g.budget,g.seedBase,g.methods,g.drop);compare(x.report,g.report,'report');let count=0;for(const chunk of chunks){for(let i=0;i<chunk.group.cases.length;i++){const a=x.cases[(chunk.offset||0)+i],b=chunk.group.cases[i];for(let j=0;j<chunk.columns.length;j++)compare(a[chunk.columns[j]],b[j],chunk.columns[j]);count++;}}check(count===x.cases.length,'case count');}
console.log('PASS '+n+' assertions: partition independence, coverage, applied gate, accounting, full replay.');
