# V0.53 — Frozen scope-approval review

This independent snapshot preserves the V0.53 engine observed at blob 9d7156c34583a104f5146c641ec750b117c3c3a3. The live demo/v53 directory changed while the review was underway, so this directory does not overwrite that work. The standalone page embeds the frozen source exactly. Download index.html and open offline; select a method and run.

## Protocol
Same V0.52 sparse scalar sensors, noisy state estimates, 6 N actuation and continuous three-disc simulator. V0.53 extends the synthetic laws with a variable hidden-speed threshold and a spatially dependent omitted force. Four reviewed policies: contrast (global, 30 audit observations), scope_local (local, 30 audit observations), global_single and scope_single (60 audit observations; last 30 challenge one rotating body at a time). All use 30 fitting and 20 selection observations. No new label after selection is used to refit the candidate. Speed cells predefined [0,1.1), [1.1,1.45), [1.45,2), [2,infinity); last is never authorized by scoped methods. A cell needs at least 10 audit rows with 3 of each scalar axis, and RMSE <= max(.18,2.5*assumed noise SD). Otherwise unknown or failed. A scoped commit requires support in cell 0 or 1. Outside approved speed cell the controller falls back to nominal model; this is not known to be safe. Residual monitoring skips unsupported bins; stale model and failure latching are unresolved. The last audit assessment can differ from the still-active approval after a rejection. No exact equation recovery, multidimensional domain guarantee, or calibrated uncertainty claim.

Evaluation only: 48 independently generated synthetic states per speed cell, random angle and x/y in [-2,2], speed upper limit 2.6. Cell error = vector force RMSE; >.35 considered poor. Global commit implies all four cells authorized; local authorizes selected cells only. Good local = cell 0 authorized with error <= .35; bad high = at least one cell >=1 authorized with error >.35. These are case-level counts, not safety event counts. 9 modes x 2 noise levels (.06,.12) x 8 seeds (97341 + 7919*i) x 2 dropout levels (.35,.65) x 4 policies = 1,152 paired runs. Common seeds reused across dropout settings and policies. New seed is not a new external law family.

| Drop / policy | Known complete /64 | Hidden-speed good local /32 | Hidden-speed bad high /32 | Mean post-change tracking RMSE | Mean late RMSE |
|---|---:|---:|---:|---:|---:|
| .35 contrast | 62 | 32 | 32 | .135576 | .074047 |
| .35 scope_local | 62 | 32 | 0 | .135008 | .073703 |
| .35 global_single | 58 | 15 | 15 | .306228 | .149183 |
| .35 scope_single | 61 | 32 | 0 | .303801 | .130182 |
| .65 contrast | 60 | 30 | 32 | .167294 | .091002 |
| .65 scope_local | 60 | 30 | 0 | .166510 | .088972 |
| .65 global_single | 47 | 19 | 19 | .462274 | .146872 |
| .65 scope_single | 48 | 30 | 1 | .456188 | .097633 |

At .35, contrast authorizes 412 cells of which 203 poor; scope_local authorizes 102 of which 15 poor. At .65, corresponding 428/212 vs 106/17. Lower poor-cell count comes partly from lower coverage. Scoped local restricts use but does not discover the omitted high-speed force; zero bad-high cases is achieved by abstaining from unsupported regions, not correct high-speed inference. Spatial counterexample: bad authorized cell 0 in 6/16 (.35) and 10/16 (.65) scope_local cases; contrast 7/16 and 11/16. Separate challenge spatial limits remain. No stops. Single-body pressure audit has larger sample, actuation and tracking cost than no pressure. No evidence that it improves task tracking over scope_local. No external or real robot results or significance tests.

## Reproduce
```sh
cd research/v53-scope-review
node -e "const E=require('./world.cjs');console.log(E.benchmark(8,30,97341,['contrast','global_single','scope_single','scope_local'],.35).report)"
node regression.test.cjs
```
benchmark.json stores compact rows with columns and exact source blob. 47,684 assertions passed on fetched snapshot and data using JavaScript runtime with Node/DOM/Canvas stand-ins. Includes all recorded rows replay, evidence counts, authority checks and mocked UI. Not native Node CI / browser visual validation. The layout is inherited from V0.52. Future research: multidimensional cells or adaptive partitioning, auditable coverage-vs-error metrics, localized contradicting evidence, safe fallback and re-audit on newly observed regimes.
