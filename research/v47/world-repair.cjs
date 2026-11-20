'use strict';
// V0.47 controlled episodic world: separate physics and observation faults.
function module47(){
  'use strict';
  const modes=['none','gain','drift','sensor','mixed','nonlinear'];
  const methods=['frozen','passive','random','designed'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  const rms=a=>Math.sqrt(mean(a.map(x=>x*x)));
  function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return (s+.5)/4294967296;};}
  function normal(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
  const nominal={a:.65,b:.45,c:0,bias:0};
  function predict(m,x,u){return m.a*x+m.b*u+m.c;}
  function world(mode,seed){const r=rng(seed^0xabcdef),sign=()=>r()<.5?-1:1,mag=()=>.18+.27*r(),p={...nominal};if(mode==='gain'||mode==='mixed')p.b+=sign()*mag();if(mode==='drift')p.c=sign()*mag();if(mode==='sensor'||mode==='mixed')p.bias=sign()*mag();const curve=mode==='nonlinear'?sign()*(.45+.35*r()):0;return {p,curve,change:30+Math.floor(r()*16)};}
  function solve(A,b){const m=A.map((row,i)=>[...row,b[i]]),n=b.length;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[k][i]))k=j;[m[k],m[i]]=[m[i],m[k]];if(Math.abs(m[i][i])<1e-9)return null;let d=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){let f=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=f*m[i][j];}}return m.map(row=>row[n]);}
  function fit(rows){const A=Array.from({length:3},()=>[0,0,0]),b=[0,0,0];for(const r of rows){const f=[r.x,r.u,1];for(let i=0;i<3;i++){b[i]+=f[i]*r.ref;for(let j=0;j<3;j++)A[i][j]+=f[i]*f[j];}}const beta=solve(A,b);return beta?{a:beta[0],b:beta[1],c:beta[2],bias:mean(rows.map(r=>r.y-r.ref))}:null;}
  function det(rows,x,u){const A=[[.01,0,0],[0,.01,0],[0,0,.01]];for(const r of [...rows,{x,u}]){const f=[r.x,r.u,1];for(let i=0;i<3;i++)for(let j=0;j<3;j++)A[i][j]+=f[i]*f[j];}const [[a,b,c],[d,e,f],[g,h,i]]=A;return a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);}
  const grid=[-1,-.5,0,.5,1].flatMap(x=>[-1,-.5,0,.5,1].map(u=>({x,u})));
  function plan(method,rows,op,r){if(method==='passive')return op;if(method==='random')return grid[Math.floor(r()*grid.length)];let best=null;for(const p of grid){const score=det(rows,p.x,p.u);if(!best||score>best.score+1e-12)best={...p,score};}return {x:best.x,u:best.u};}
  function classify(m){const physical=Math.max(Math.abs(m.a-nominal.a),Math.abs(m.b-nominal.b),Math.abs(m.c))>.12,sensor=Math.abs(m.bias)>.12;return physical?(sensor?'mixed':'physical'):(sensor?'sensor':'none');}
  function actualClass(mode){return ['gain','drift'].includes(mode)?'physical':mode==='nonlinear'?'unknown':mode;}
  function run(mode,seed,method,noise=.045){
    if(!modes.includes(mode)||!methods.includes(method))throw Error('invalid mode or method');
    const w=world(mode,seed),r=rng(seed),q=rng(seed^0x123456),ledger=Array.from({length:100},()=>({x:2*r()-1,target:.25+.4*r(),z:normal(r),zref:normal(r)})),auditNoise=Array.from({length:12},()=>({z:normal(r),zref:normal(r)}));
    let m={...nominal},phase='monitor',alarm=null,diagnosis=null,commit=null,queries=0,rows=[],audit=[],scores=[],log=[],rejected=false;
    function measure(t,x,u,z,zref){const p=t>=w.change?w.p:nominal,cur=t>=w.change?w.curve:0,truth=predict(p,x,u)+cur*(x*x-.4);return {x,u,y:truth+p.bias+noise*z,ref:truth+noise*zref,truth};}
    for(let t=0;t<ledger.length;t++){
      const op=ledger[t],u=clamp((op.target-m.a*op.x-m.c)/(Math.abs(m.b)<.08?.08:m.b),-1,1);
      const v=measure(t,op.x,u,op.z,op.zref);
      const residual=v.y-predict(m,op.x,u)-m.bias;
      scores.push(residual);if(scores.length>6)scores.shift();
      if(phase==='monitor'&&scores.length===6&&rms(scores)>.14){alarm=t;phase=method==='frozen'?'disabled':'probe';}
      log.push({t,phase,x:op.x,u,target:op.target,truth:v.truth,observed:v.y,residual,tracking:Math.abs(v.truth-op.target)});
      if(phase==='probe'){
        const point=queries<8?plan(method,rows,{x:op.x,u},q):grid[[1,7,17,23][queries-8]];
        const nz=auditNoise[queries],z=measure(t,point.x,point.u,nz.z,nz.zref);
        const row={x:z.x,u:z.u,y:z.y,ref:z.ref};queries++;
        if(queries<=8)rows.push(row);else audit.push(row);
        if(queries===12){const candidate=fit(rows);const error=candidate?rms(audit.map(s=>s.ref-predict(candidate,s.x,s.u))):Infinity;const biasError=candidate?rms(audit.map(s=>s.y-s.ref-candidate.bias)):Infinity;
          if(candidate&&error<=.15&&biasError<=.15&&Math.abs(candidate.b)>=.05&&Math.abs(candidate.b)<=1.2){m=candidate;diagnosis=classify(m);commit=t;phase='repaired';}else{rejected=true;diagnosis='unknown';phase='rejected';}
        }
      }
    }
    const tail=log.filter(x=>x.t>=w.change+15);
    return {mode,seed,method,noise,change:w.change,alarm,diagnosis,commit,queries,rejected,tracking:rms(tail.map(x=>x.tracking)),excursions:tail.filter(x=>x.tracking>.35).length,correct:diagnosis===actualClass(mode)||(mode==='none'&&alarm===null),falseAlarm:alarm!==null&&(mode==='none'||alarm<w.change),trace:log,fitRows:rows,auditRows:audit};
  }
  function benchmark(seeds=24){const tasks=[];for(const mode of modes)for(const noise of [.045,.075])for(let s=0;s<seeds;s++)for(const method of methods)tasks.push(run(mode,470001+s*7919,method,noise));const report={};for(const method of methods){const a=tasks.filter(r=>r.method===method),changed=a.filter(r=>r.mode!=='none'),known=changed.filter(r=>r.mode!=='nonlinear'),unknown=changed.filter(r=>r.mode==='nonlinear'),healthy=a.filter(r=>r.mode==='none');report[method]={cases:a.length,detected:changed.filter(r=>r.alarm!==null&&r.alarm>=r.change).length,changed:changed.length,falseAlarms:a.filter(r=>r.falseAlarm).length,healthy:healthy.length,healthyFalseAlarms:healthy.filter(r=>r.falseAlarm).length,correctKnown:known.filter(r=>r.correct).length,known:known.length,unknownRejected:unknown.filter(r=>r.rejected).length,unknown:unknown.length,committed:changed.filter(r=>r.commit!==null).length,tracking:mean(changed.map(r=>r.tracking)),excursions:changed.reduce((s,r)=>s+r.excursions,0),queries:mean(a.map(r=>r.queries))};}
  return {seeds,report,cases:tasks.map(({trace,fitRows,auditRows,...x})=>x)};}
  return {run,benchmark,fit,plan,predict,modes,methods};
}
const instance=module47();
if(typeof module!=='undefined'){module.exports=instance;if(require.main===module)console.log(JSON.stringify(instance.benchmark(24),null,2));}
