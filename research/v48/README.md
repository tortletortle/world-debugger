# V0.48 — Guarded nonlinear law recovery

Independent research prototype. V0.45 browser entry point and V0.47 module remain unchanged. This iteration extends the V0.47 concept, but uses a new simulator and a common evaluator rather than importing the earlier simulator or the V0.45 symbolic regression engine.

## Reproduce
```sh
node research/v48/law-recovery.cjs > /tmp/wd48-results.json
node research/v48/law-recovery.test.cjs
```
No dependencies. All 1,200 case summaries are committed as results.json.

## Protocol
10 modes × 2 noise levels (.04, .075) × 12 seeds × 5 methods. Every run uses 120 independently reset one-step operations. After a residual alarm, adaptive methods collect 24 observations with trusted reference outputs: 12 fit, 6 model selection, 6 independent audit. Common fixed probe points and noise across methods. The candidate is frozen before audit observations. Random and residual-guided search each fit 25 unique structures (including linear) using the same 12-term nonlinear dictionary, adding at most two terms. Selection score: validation RMSE + .012 per added term. The fixed polynomial comparator fits linear and one full polynomial model. Audit checks prediction RMSE ≤ .16, sensor residual RMS ≤ .18, and bounded prediction magnitude on a finite grid; thresholds are heuristic. Controller minimizes predicted target error on 41 bounded candidate inputs. Refusal retains the nominal controller; it does not establish plant safety. The oracle-only final model error uses 64 fresh test inputs; successful reconstruction is defined as a committed model with clean RMSE ≤ .2. Control tracking is mean per-case RMSE from change+30 onward, not a trajectory or physical safety metric. Probe cost is excluded from tracking.

| Method | Successful nonlinear reconstruction /120 | Nonlinear tracking RMSE | Nonlinear final model RMSE |
|---|---:|---:|---:|
| Frozen | 0 | .353173 | .308950 |
| Linear | 19 | .333444 | .258072 |
| Fixed polynomial | 62 | .322615 | .189007 |
| Random structure | 90 | .295802 | .106499 |
| Residual guided | 107 | .289371 | .070399 |

Paired successful outcomes: both 89, residual only 18, random only 1, neither 12. Both search policies rejected all 48 held-out step/high-frequency cases; the other adaptive baselines also rejected all 48. All methods had one healthy false alarm in 24 healthy runs; adaptive methods committed a needless update in that case. No accepted changed-case model exceeded .2 clean RMSE in this finite benchmark.

## Limits and next steps
The five representable nonlinear laws use primitives in the candidate dictionary; this is not unrestricted discovery or a blind third-party benchmark. Two out-of-dictionary laws are only a small open-set test. Residual-guided search has extra ranking work; equal fit counts do not establish equal runtime. Fixed trial resets and externally trusted inputs/reference sensor are strong assumptions. Sensor bias does not enter the state feedback. The simulator does not model continuous state propagation, intervention safety, repeated regime switches, closed-loop stability or real hardware. No certified guarantees or comparison with SINDy/PySR. No UI integration. 274 assertions including deterministic benchmark replay passed in a JavaScript runtime using equivalents for Node's assertion API; Node CI not run.

Prior art: SINDy (https://doi.org/10.1073/pnas.1517384113), SINDYc (https://arxiv.org/abs/1605.06682), rapid model recovery (https://arxiv.org/abs/1803.00894). These motivate sparse library search and model recovery; no third-party implementation code is included. The research question is reliable gated recovery, not originality of sparse regression. Next: continuous closed-loop simulator, independent structural benchmark, safety fallback and repeated change detection.
