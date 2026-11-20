# V0.53 — Domain-scoped model authorization

## Run
Download index.html and open in a modern browser offline. Existing V0.52 layout reused, with a live speed-domain evidence/authorization panel. Default example: hidden speed law, scoped dual audit, seed 84631, noise .06, dropout .35. Switch to ordinary contrast or local-only scope to compare. Export includes the per-body domain usage ledger. All earlier versions preserved.

## Implementation
Uses V0.52 simulator, scalar noisy observations, control saturation and 30/20 fit/selection labels unchanged in benchmarks. Speed cells fixed before evaluation: [0,1.1), [1.1,1.45), [1.45,2), [2,infinity) m/s. A cell has audit support only if at least 10 disjoint chronological audit labels and >=3 of each axis occur there, the scalar RMSE <= max(.18,2.5*known noise SD), and cell is not the final unbounded cell. Failed means adequate sample counts but residual threshold violated; unknown means insufficient support or unbounded cell. This is heuristic evidence, not uniform validity or a calibrated confidence region. Scoped policies commit if either of the first two cells has support, and authorize only supported cells. At each control step select authorization using measured speed, otherwise fall back to the initial nominal model. Unsupported observations are excluded from post-commit residual alarms; this prevents some inappropriate re-learning but can miss later changes. Last assessment is separate from authorization of the currently deployed model. Rejected update retains the previous model and latches; stale authorizations are possible after later change; no retry or safe-plant guarantee. No autonomous region partitioning yet.

Methods: frozen; ordinary contrast (30 audit labels); V0.52 global speed sweep (30 labels); global_dual/scope_dual (30 ordinary + 30 speed sweep labels); global_single/scope_single (same dual schedule, rotating one body every 1.5s during sweep); scope_local (ordinary audit with scoped decisions, no extra challenge). Sweeps use 1.9x orbit reference speed; rotation can cause contacts. Global and scoped versions within each pair match observation budget and intervention protocol before first decision; later actions and number of attempts may diverge. Total applied force-squared integral and task tracking are reported, not wall-time matched. The original task reference is used for tracking even during experiments.

Added two synthetic stress modes: hidden_shift has seed-dependent high-speed drag onset (1.02+.42*k, k in [.8,1.2)); spatial adds unmodeled vertical force for x>.8 after mutation. The existing hidden mode threshold 1.15 is unchanged. These are designed families, not external blind datasets. State-space test uses 48 independent seeded positions/directions/speeds per speed cell, speeds sampled up to 2.6 m/s. Test truth is evaluator-only. Final model RMSE for each cell measured against final true regime; stale models count as errors. Global commit authorizes all four cells by definition; scoped only actually approved cells. Bad cell = authorized final model with clean vector-force RMSE > .35. Good local = authorized cell 0 and RMSE <= .35. HiddenBadHigh counts hidden cases with >=1 bad authorized cell 1–3. Lower bad-cell totals may reflect lower coverage rather than more accurate formulas. KnownComplete counts commits in each relevant change interval, not exact formula recovery.

## Results and reproduction
```sh
cd demo/v53
node -e "console.log(require('./world.js').benchmark(6,30,84631,undefined,.35).report)"
node regression.test.cjs
```
Three compact benchmark files use columns and group.cases arrays. Source SHA 9d7156c34583a104f5146c641ec750b117c3c3a3. 576 development + 864 secondary .35 dropout + 864 secondary .65 dropout = 2,304 continuous evaluations. 9 modes x 2 noise levels x 8 policies; 4 development seeds, 6 fresh secondary seeds (reused across dropout). Independent seed group, not independent families or 2,304 independent samples.

| Secondary .35 | Known complete /48 | Hidden good local /24 | Hidden bad high /24 | Bad / authorized cells | Late RMSE | Post-change RMSE |
|---|---:|---:|---:|---:|---:|---:|
| contrast | 46 | 22 | 24 | 157/316 | .073705 | .130598 |
| speed sweep | 40 | 9 | 9 | 76/216 | .158782 | .514867 |
| global_dual | 42 | 10 | 11 | 84/228 | .203319 | .533651 |
| scope_dual | 46 | 23 | 0 | 25/151 | .221697 | .551446 |
| global_single | 40 | 8 | 8 | 73/208 | .156606 | .290100 |
| scope_single | 46 | 22 | 0 | 19/91 | .128074 | .286283 |
| scope_local | 46 | 22 | 0 | 13/79 | .072799 | .129609 |

At .65 dropout: contrast 44/48 known, 24/24 hidden local, 24/24 bad high; scope_local 44/48, 24/24, 0/24; scope_dual 36/48, 24/24, 1/24; scope_single 36/48, 24/24, 0/24. Scope_local does not perform a high-speed challenge and generally leaves high cells unknown: it is not evidence of discovering the hidden law. Scope_dual at .35 improves retention and reduces bad authorizations versus matched global_dual but costs more tracking error and control force. Scope_single lowers the sweep's tracking cost relative to scope_dual but adds contacts. The spatial counterexample exposes a real flaw: in secondary .35, scope_dual accepted 7/12 spatial cases; none had a good local cell by the clean-state test. Speed-only regions cannot establish spatial or directional validity. No stops across recorded runs. No external algorithm comparison, confidence calibration or formal safety claim.

## Verification
219,506 assertions passed using actual fetched remote source and data in JavaScript runtime, with Node/DOM/Canvas stand-ins. Includes exact domain boundaries, axis-count support, per-step authorization ledger consistency, budget/force invariants, all per-case/report replay, and mocked UI start/pause/reset/export. Counts include repeated field/step comparisons, not distinct test scenarios. No real browser rendering or native Node CI in this turn. Next priority: multidimensional domain discovery and cost-aware coverage, then evidence-based retry and stale-authorization invalidation.
