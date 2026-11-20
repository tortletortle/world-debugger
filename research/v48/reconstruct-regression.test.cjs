'use strict';
const assert=require('node:assert/strict');
const E=require('./reconstruct.cjs');
const stored=require('./benchmark-32-corrected.json');
let checks=0;
for(const mode of E.modes)for(const noise of [.045,.075]){
 const a=E.run(mode,481337,noise),b=E.run(mode,481337,noise);
 assert.deepEqual(a,b);checks++;
 assert.equal(new Set(a.probeIds).size,a.probeIds.length);checks++;
 assert([0,40].includes(a.probeIds.length));checks++;
 for(const method of E.methods){
  const m=a.methods[method];
  assert.equal(m.queries,method==='frozen'?0:a.probeIds.length);checks++;
  assert(Number.isFinite(m.tracking)&&Number.isFinite(m.modelError));checks++;
  if(!m.accepted){assert.deepEqual(m.terms,['1','x','u']);checks++;}
  if(m.accepted&&method!=='reconstruct_unguarded'){assert(m.auditError<=Math.max(.13,2*noise)&&m.biasError<=Math.max(.14,2.5*noise));checks++;}
 }
 assert.deepEqual(a.methods.reconstruct.selectedTerms,a.methods.reconstruct_unguarded.selectedTerms);checks++;
 assert.equal(a.methods.reconstruct.fits,a.methods.reconstruct_unguarded.fits);checks++;
}
const r=E.benchmark(stored.seeds);
assert.deepEqual(r.report,stored.report);checks++;
assert.deepEqual(r.cases.map(c=>[c.mode,c.seed,c.noise,c.change,c.alarm,c.probeIds,...E.methods.map(m=>stored.metricKeys.map(k=>c.methods[m][k]))]),stored.cases);checks++;
console.log('PASS: '+checks+' assertions');
