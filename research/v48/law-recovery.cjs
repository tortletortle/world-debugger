'use strict';
// V0.48: guarded sparse nonlinear law recovery, dependency-free.
function module48(){
'use strict';
const modes=['healthy','gain','bias','quadratic','coupled','saturation','oscillation','compound','hidden_step','hidden_wave'];
const methods=['frozen','linear','polynomial','random','residual'];
const terms=['1','x','u','x²','xu','u²','x³','x²u','xu²','sin(πx)','tanh(2x)','|x|','sin(πu)','sin(πx)u','tanh(2xu)'];
const base=[0,1,2],pool=terms.slice(3).map((_,i)=>i+3);
const nominal={ids:base,beta:[0,.65,.45],bias:0};
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const rms=a=>Math.sqrt(mean(a.map(x=>x*x)));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return(s+.5)/4294967296;};}
function normal(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
function features(x,u){return [1,x,u,x*x,x*u,u*u,x*x*x,x*x*u,x*u*u,Math.sin(Math.PI*x),Math.tanh(2*x),Math.abs(x),Math.sin(Math.PI*u),Math.sin(Math.PI*x)*u,Math.tanh(2*x*u)];}
function pred(m,f){return m.ids.reduce((s,k,i)=>s+m.beta[i]*f[k],0);}
function solve(A,b){const a=A.map((row,i)=>[...row,b[i]]),n=b.length;for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;[a[i],a[p]]=[a[p],a[i]];const d=a[i][i];if(Math.abs(d)<1e-10)return null;for(let k=i;k<=n;k++)a[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){const f=a[j][i];for(let k=i;k<=n;k++)a[j][k]-=f*a[i][k];}}return a.map(row=>row[n]);}
function fit(ids,rows){const p=ids.length,A=Array.from({length:p},(_,i)=>Array.from({length:p},(_,j)=>i===j?1e-6:0)),b=Array(p).fill(0);for(const r of rows)for(let i=0;i<p;i++){const x=r.f[ids[i]];b[i]+=x*r.ref;for(let j=0;j<p;j++)A[i][j]+=x*r.f[ids[j]];}const beta=solve(A,b);if(!beta||beta.some(x=>!Number.isFinite(x)))throw Error('nonfinite fit');return{ids:ids.slice(),beta,bias:mean(rows.map(r=>r.y-r.ref))};}
const err=(m,rows)=>rms(rows.map(r=>pred(m,r.f)-r.ref));
function search(method,train,val,seed){let fits=0;const checked=new Set(),candidates=[];const tryFit=(extras)=>{const ids=base.concat(extras.slice().sort((a,b)=>a-b)),key=ids.join(',');if(checked.has(key))return null;checked.add(key);const m=fit(ids,train);fits++;m.score=err(m,val)+.012*(ids.length-3);candidates.push(m);return m;};const lin=tryFit([]);
const rank=(m)=>{const residual=train.map(r=>r.ref-pred(m,r.f)),scores=pool.filter(k=>!m.ids.includes(k)).map(k=>{const z=train.map(r=>r.f[k]);let a=0,b=0;for(let i=0;i<z.length;i++){a+=z[i]*residual[i];b+=z[i]*z[i];}return{k,score:Math.abs(a)/Math.sqrt(b+1e-9)};});return scores.sort((a,b)=>b.score-a.score||a.k-b.k);};
if(method==='polynomial'){tryFit([3,4,5,6,7,8]);}
if(method==='random'){const r=rng(seed),combinations=pool.flatMap((k,i)=>[[k],...pool.slice(i+1).map(l=>[k,l])]);for(let i=combinations.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[combinations[i],combinations[j]]=[combinations[j],combinations[i]];}for(const c of combinations.slice(0,24))tryFit(c);}
if(method==='residual'){for(const p of rank(lin).slice(0,8))tryFit([p.k]);const parents=candidates.filter(m=>m.ids.length===4).sort((a,b)=>a.score-b.score).slice(0,4);for(const m of parents){let n=0;for(const p of rank(m)){if(tryFit([m.ids[3],p.k]))n++;if(n===4||fits===25)break;}}for(const k of pool)for(const l of pool)if(l>k&&fits<25)tryFit([k,l]);if(fits!==25)throw Error('budget');}
candidates.sort((a,b)=>a.score-b.score||a.ids.length-b.ids.length);return{model:candidates[0],fits};}
function audit(m,rows){const prediction=err(m,rows),bias=rms(rows.map(r=>r.y-r.ref-m.bias));let max=0;for(const x of [-1.2,-.6,0,.6,1.2])for(const u of [-1,0,1])max=Math.max(max,Math.abs(pred(m,features(x,u))));return{prediction,bias,max,accept:prediction<=.16&&bias<=.18&&max<=3};}
function world(mode,seed){const r=rng(seed^0xa9f132),s=r()<.5?-1:1,k=s*(.42+.28*r()),change=25+Math.floor(16*r());return{change,bias:mode==='bias'?k*.6:0,law(x,u){let f=.65*x+.45*u;switch(mode){case'gain':return f+k*.6*u;case'quadratic':return f+k*(x*x-.3);case'coupled':return f+k*x*u;case'saturation':return f+k*Math.tanh(2*x);case'oscillation':return f+k*Math.sin(Math.PI*x);case'compound':return f+k*.7*Math.sin(Math.PI*x)*u+k*.55*x*x;case'hidden_step':return f+k*(x+.4*u>0?1:-1);case'hidden_wave':return f+k*Math.sin(7*x+3*u);default:return f;}}};}
function control(m,x,target){let best=0,loss=Infinity;for(let i=0;i<=40;i++){const u=-1+i/20,delta=Math.abs(pred(m,features(x,u))-target)+1e-6*Math.abs(u);if(delta<loss){best=u;loss=delta;}}return best;}
const trainPoints=[[-1,-1],[-1,1],[1,-1],[1,1],[0,-1],[0,1],[-1,0],[1,0],[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]];
const valPoints=[[-.8,.3],[.8,-.3],[-.25,.9],[.25,-.9],[0,0],[.6,.7]];
const gatePoints=[[-1.2,.6],[1.2,-.6],[-.65,-.85],[.65,.85],[-.15,.35],[.15,-.35]];
function run(mode,seed,method,noise=.04){
if(!modes.includes(mode)||!methods.includes(method))throw Error('unknown mode or method');
const w=world(mode,seed),r=rng(seed),g=rng(seed^0x87ca),ops=Array.from({length:120},()=>({x:2*r()-1,target:.2+.4*r(),n:normal(r)})),probeNoise=Array.from({length:24},()=>[normal(g),normal(g)]),test=Array.from({length:64},()=>[2.4*g()-1.2,2*g()-1]);let m=nominal,alarm=null,commit=null,phase='monitor',queries=0,train=[],val=[],gate=[],scores=[],log=[],candidate=null,decision=null,fits=0;
function measure(t,x,u,n,nref){const truth=t>=w.change?w.law(x,u):pred(nominal,features(x,u)),bias=t>=w.change?w.bias:0;return{f:features(x,u),ref:truth+noise*nref,y:truth+bias+noise*n,truth};}
for(let t=0;t<ops.length;t++){const o=ops[t],u=control(m,o.x,o.target),z=measure(t,o.x,u,o.n,0);scores.push(z.y-pred(m,z.f)-m.bias);if(scores.length>6)scores.shift();if(phase==='monitor'&&scores.length===6&&rms(scores)>.14){alarm=t;phase=method==='frozen'?'frozen':'probe';}log.push({t,phase,x:o.x,u,target:o.target,truth:z.truth,error:Math.abs(z.truth-o.target)});
if(phase==='probe'){const [x,v]=[...trainPoints,...valPoints,...gatePoints][queries],nz=probeNoise[queries],row=measure(t,x,v,...nz);const datum={f:row.f,y:row.y,ref:row.ref};queries++;if(queries<=12)train.push(datum);else if(queries<=18)val.push(datum);else gate.push(datum);
// Candidate is frozen before any independent audit observation.
if(queries===18){const found=search(method,train,val,seed^0xbda2);candidate=found.model;fits=found.fits;}
if(queries===24){decision=audit(candidate,gate);if(decision.accept){m=candidate;commit=t;phase='repaired';}else phase='rejected';}}
}
const tail=log.filter(o=>o.t>=w.change+30),modelError=rms(test.map(([x,u])=>pred(m,features(x,u))-w.law(x,u)));
return{mode,seed,method,noise,change:w.change,alarm,commit,queries,fits,rejected:phase==='rejected',falseAlarm:alarm!==null&&(mode==='healthy'||alarm<w.change),modelError,tracking:rms(tail.map(o=>o.error)),bad:commit!==null&&modelError>.2,formula:candidate?candidate.ids.map((k,i)=>[terms[k],candidate.beta[i]]):null,decision,trace:log};
}
function benchmark(seeds=12){const cases=[];for(const mode of modes)for(const noise of [.04,.075])for(let s=0;s<seeds;s++)for(const method of methods){const {trace,...row}=run(mode,480101+s*7919,method,noise);cases.push(row);}const report={};for(const method of methods){const a=cases.filter(c=>c.method===method),non=a.filter(c=>['quadratic','coupled','saturation','oscillation','compound'].includes(c.mode)),open=a.filter(c=>c.mode.startsWith('hidden')),changed=a.filter(c=>c.mode!=='healthy'),healthy=a.filter(c=>c.mode==='healthy'),committed=non.filter(c=>c.commit!==null);report[method]={cases:a.length,nonlinearCases:non.length,nonlinearCommitted:committed.length,nonlinearGood:committed.filter(c=>c.modelError<=.2).length,nonlinearTracking:mean(non.map(c=>c.tracking)),nonlinearModelError:mean(non.map(c=>c.modelError)),openCases:open.length,openRejected:open.filter(c=>c.rejected).length,openBadCommits:open.filter(c=>c.bad).length,allBadCommits:changed.filter(c=>c.bad).length,tracking:mean(changed.map(c=>c.tracking)),meanFits:mean(a.map(c=>c.fits)),healthyFalseAlarms:healthy.filter(c=>c.falseAlarm).length};}return{seeds,report,cases};}
return{run,benchmark,search,audit,fit,features,pred,modes,methods,terms};
}
const instance=module48();
if(typeof module!=='undefined'){module.exports=instance;if(require.main===module)console.log(JSON.stringify(instance.benchmark(12),null,2));}
