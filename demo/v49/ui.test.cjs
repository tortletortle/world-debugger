'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),core=fs.readFileSync(path.join(__dirname,'world.js'),'utf8');
assert(html.includes(core));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size);
function harness(){
 const node=()=>({clientWidth:560,clientHeight:200,width:0,height:0,value:'',disabled:false,textContent:'',innerHTML:'',style:{},scrollTop:0,scrollHeight:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})});
 const elements=Object.fromEntries(ids.map(x=>[x,node()]));
 elements.mode.value='drag';elements.seed.value='49';elements.speed.value='12';
 let next,download=null,resize=null;
 const document={getElementById:id=>{assert(elements[id],'missing DOM id '+id);return elements[id];},createElement:()=>({click(){}})};
 const window={devicePixelRatio:1,addEventListener:(name,fn)=>{if(name==='resize')resize=fn;}};
 const URL={createObjectURL:b=>{download=JSON.parse(b.parts[0]);return 'blob:mock';},revokeObjectURL:()=>{}};
 const Blob=class{constructor(parts){this.parts=parts;}};
 const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 new Function('document','window','requestAnimationFrame','URL','Blob','setTimeout','module',js)(document,window,f=>{next=f;},URL,Blob,()=>{},undefined);
 let now=100;function tick(n=1){for(let i=0;i<n;i++){now+=120;const f=next;next=null;f(now);assert(next);}}
 return {e:elements,tick,resize:()=>resize(),export:()=>{elements.export.onclick();return download;}};
}
const h=harness(),e=h.e;
assert(e.start.disabled===false&&e.pause.disabled===true);
assert.equal(e.phase.textContent,'观察世界');
e.start.onclick();h.tick(5);assert(e.pause.disabled===false);let t=h.export().adaptive.t;assert(t>0);
e.pause.onclick();h.tick(5);assert.equal(h.export().adaptive.t,t);
e.start.onclick();h.tick(65);let r=h.export();assert.equal(r.adaptive.phase,'repaired');assert.equal(r.adaptive.queries,320);assert.equal(r.adaptive.t,60);assert.equal(r.fixed.t,60);assert(e.start.disabled);
e.reset.onclick();assert.equal(h.export().adaptive.t,0);assert(e.start.disabled===false);
e.mode.value='ripple';e.mode.onchange();e.inject.onclick();e.start.onclick();h.tick(65);r=h.export();assert.equal(r.adaptive.mutation,0);assert.equal(r.adaptive.phase,'rejected');assert.equal(r.adaptive.commit,null);assert.equal(r.adaptive.stopped,false);
e.reset.onclick();e.mode.value='healthy';e.mode.onchange();assert(e.inject.disabled);e.start.onclick();h.tick(65);r=h.export();assert.equal(r.adaptive.phase,'monitor');assert.equal(r.adaptive.events.length,0);
h.resize();assert(e.formula.textContent.includes('-0.350'));console.log('PASS: DOM/canvas stand-ins; start, pause, resume, reset, injection, export, refusal and healthy flow');
