# V0.47 — Dynamic world diagnosis and guarded repair

Independent research module. The V0.45 browser build is unchanged.

## Reproduce
```sh
node research/v47/world-repair.cjs > /tmp/wd47-results.json
node research/v47/world-repair.test.cjs
```

The committed results.json contains every case summary. 6 modes (healthy, gain shift, physical drift, sensor bias, mixed gain/bias, nonlinear out-of-model), 2 Gaussian noise levels, 24 random seeds and 4 methods = 1,152 runs. Each uses 100 independent one-step trials, a randomized change time, bounded input u in [-1,1], shared exogenous operating conditions and common noise within paired cases. An alarm is triggered by a six-sample residual RMS > 0.14. All adaptive approaches obtain exactly 12 reference measurements per alarm: 8 training and 4 common audit points; fixed thresholds are not independently calibrated. The D-optimal method greedily maximizes the regularized information determinant. Model update requires independent audit RMS and bias-consistency checks plus bounded control gain. No update on refusal. Frozen control does not query.

| Method | Correct known fault /192 | Mean post-change tracking RMSE | Out-of-model rejections /48 |
|---|---:|---:|---:|
| Frozen | 0 | 0.351226 | 0 |
| Passive | 123 | 0.330893 | 48 |
| Random | 166 | 0.319836 | 48 |
| D-optimal | 172 | 0.318062 | 48 |

All methods detected 240/240 changed cases and had 1/48 false alarm in healthy cases. D-optimal has 3023 tracking excursions versus 3019 for random. No significance claim. Known diagnostic count excludes healthy and nonlinear cases. Tracking is mean case RMSE after change+15; probe trials do not count toward operating tracking cost. A separate trusted initial state and reference sensor are assumed. The one-step independent resets are not a continuous closed-loop plant, and sensor bias does not directly affect current state feedback. Only one nonlinear form is studied, and validation points are designed for this domain. No independent external data, no timing comparison, no browser integration, no automatic nonlinear structure rediscovery, and no certified safety guarantee. V0.45/V0.46 engines are not connected to this pilot. The 98 regression assertions were executed against fetched source and results in a JavaScript runtime using assertion equivalents, not Node CI.

Related prior art: active fault diagnosis/input design (Annual Reviews in Control, 2019, https://www.sciencedirect.com/science/article/pii/S1367578819300070); review https://doi.org/10.1146/annurev-control-030123-015422. No external library code copied; small linear algebra implemented locally for a dependency-free experiment. This is system integration research, not a claim of a novel D-optimal method.
