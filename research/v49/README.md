# V0.49 — Continuous-state repair

## Reproduce
```sh
node research/v49/continuous-repair.cjs
node research/v49/continuous-repair.test.cjs
```
Requires Node.js and the unchanged V0.48 module. The test regenerates both committed benchmark datasets. The browser game is not modified.

## Protocol
360 dependent state transitions per run, six scenario families (healthy, parameter switches, nonlinear switches, mixed physics/sensor faults, rapid changes, open-set), two noise levels, six control policies. Development: 12 seeds per family/noise (864 runs); held-out: 16 new seeds per family/noise (1152 runs). The low-disturbance policy was selected after examining the development runs; the held-out seeds use the same scenario generators, not independently designed law families. Common exogenous noise and target schedules, but trajectories differ endogenously. True state is available as a trusted input; a noisy reference channel supports identification. The controller does not receive regime labels or change times.

Adaptive attempts collect 24 training, 12 selection and 12 audit transitions if uninterrupted; the candidate is frozen before audit. V0.48 residual search uses 25 fits per completed selection. The ungated policy collects audit observations but ignores the acceptance result. Rollback checks a 14-step probation window. Guarded adds a heuristic state-threshold override and feedback fallback in cooldown. Budgeted reduces probe magnitude and maximum attempts (3 vs 6) and adds a relative improvement gate: either prediction RMS improves by 20% or bias RMS by 35%. These three changes are bundled, not individually ablated. The gate can accept a tradeoff between prediction and sensor fit. No randomized reset experiments; every actual probe changes the next state. Both probe and ordinary transitions contribute to tracking cost. Escape (absolute state >8) ends plant evolution; a signed absorbing penalty state of magnitude 8 is used for the rest of the run. Metrics include post-step-50 tracking RMSE (mean of per-case RMSEs), all transitions exceeding absolute state 1.5, and escape counts. Healthy cases excluded from the aggregate changed-case metrics.

## Held-out results
| Policy | Tracking RMSE | Excursions | Escapes |
|---|---:|---:|---:|
| Frozen | .254448 | 0 | 0 |
| Ungated | .584045 | 1020 | 6 |
| Audited | .619279 | 1218 | 6 |
| Rollback | .644386 | 1299 | 7 |
| Guarded | .415709 | 38 | 0 |
| Budgeted | .306231 | 80 | 0 |

Each row covers 160 changed runs. Budgeted reduces tracking error relative to guarded but increases excursions. Frozen is the strongest strategy in this test. Probe disturbance is a plausible contributor; the present comparison cannot isolate every cause. No claim of superior recovery or formal safety. The guard is a heuristic relying on nominal actuator direction and may fail under gain reversal. Audit samples are temporally disjoint, not independent IID data; changes during training/audit may invalidate a candidate. No browser integration, no hardware test, no external algorithm benchmark, no Node CI. 368 assertions including exact replay of both committed datasets passed against remote source in a JavaScript runtime with equivalents for Node assertions.

## Next direction
Treat information gathering as a control cost. Compare passive identification, minimal excitation, an explicit probe-only control, and a no-adaptation baseline. Measure persistent excitation, cumulative tracking cost, constraint violations, and recovery benefit. Add separately held-out abrupt-change environments. Consider a PySINDy/SINDy-MPC external baseline (https://github.com/dynamicslab/pysindy; https://arxiv.org/abs/1711.05501). Existing work already studies sparse dynamics identification with online control; no novelty claim for that combination.
