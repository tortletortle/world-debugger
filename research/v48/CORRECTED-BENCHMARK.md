# V0.48 — Corrected nonlinear reconstruction pilot (32 seeds)

## Scope
Independent episodic, one-step identification/control experiment. V0.45 browser build and V0.47 module are unchanged. No third-party dependency or code copied. Related prior work: SINDy (https://doi.org/10.1073/pnas.1517384113), SINDYc (https://arxiv.org/abs/1605.06682), rapid model recovery (https://arxiv.org/abs/1803.00894). Sparse nonlinear identification and updating a known model are established directions; no algorithm novelty or superiority over these methods is claimed.

## Reproduce
```sh
node research/v48/reconstruct.cjs > /tmp/wd48-full.json
node research/v48/reconstruct-regression.test.cjs
```
Corrected compact per-case data: benchmark-32-corrected.json. The earlier file results.json was already present with a different schema; it is preserved and is not used by the corrected regression test. Core blob SHA d0e73b5de145334f66e1a08c5f26582822b6085d.

## Protocol
10 synthetic modes x 2 known noise levels x 32 seeds = 640 paired conditions; 5 policies = 3,200 evaluations. 9 changed modes, one healthy mode; two out-of-library generator families (switch, ripple). Fixed, noisy operational observations trigger a six-sample residual RMS alarm > .15, no access to true change time for model fitting or activation. A corrected implementation removed an earlier oracle-based gate; probes are now observed at their actual episode times. 40 unique probes per alarm: 16 training, 8 selection, 16 independent audit. Shared coordinates and noise across methods. Known sensor reference and resettable x assumed. Fixed audit threshold uses known noise scale, not calibrated externally. Audit does not select or refit the candidate. Search fits linear base + zero, one or two features from polynomial or broader fixed libraries, ranks using validation RMSE + .008 per added term. Same reconstruction with and without audit isolates acceptance-gate effect. All methods use same input-grid inversion; rejected proposals retain nominal model. Test grid has no overlap with probe grid. Tracking measured in common post-change tail; probe actions and waiting cost not scored. No continuous trajectory or formal safety certification.

| Method | Mean tracking (changed) | Nonlinear tracking | Known nonlinear acceptance /320 | Out-of-library acceptance /128 | Bad acceptance (clean grid RMSE > .15) |
|---|---:|---:|---:|---:|---:|
| Frozen | .302340 | .284763 | 0 | 0 | 0 |
| Linear | .281178 | .256460 | 59 | 0 | 0 |
| Polynomial | .242869 | .187516 | 268 | 0 | 0 |
| Guarded reconstruction | .241239 | .184373 | 267 | 0 | 0 |
| Unguarded reconstruction | .230317 | .184709 | 272 | 128 | 131 |

533/576 changed cases alarmed; 1/64 healthy cases alarmed and guarded reconstruction accepted its update. Known nonlinear includes quadratic, interaction, saturation, mixed sine/bias, rotated cubic. Some generator terms are present in the fixed library. Mean fit counts on changed conditions: linear .917, polynomial 21.083, reconstruct 43.083; mean probes for all nonfrozen 36.667. Fit counts differ and runtime is not controlled. Richer library has a small average benefit over polynomial, not enough to claim an algorithmic breakthrough. Guard rejects all 128 out-of-library cases in this synthetic set, and no accepted model exceeds the clean grid RMSE threshold; this is not a universal guarantee. Guarded overall tracking is worse than unguarded because it refuses some useful approximate controllers. No true structural equivalence claim, no external benchmark, no unknown reference/noise experiment, no browser integration. 386 assertions including replay of corrected committed dataset executed in JS runtime using Node assertion equivalents, not Node CI.
