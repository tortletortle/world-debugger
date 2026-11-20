# V0.50 — Multi-body 2D world lab

## Run
Download index.html from this directory (GitHub: Download raw file), then open it in a modern browser. It embeds the exact world.js source and runs offline. The V0.49 demo and older root game are unchanged.

## What changed
Three independently controlled equal-mass discs, two-dimensional paths and environmental force vector. Contact resolution uses positional correction and normal impulses with restitution 0.7; no rotation, walls, continuous collision detection or general rigid-body solver. Contact markings are assumed available and mask affected acceleration observations. Contact counts are **per pair per simulation step**, not unique collision events. Targets cross; collision avoidance is not implemented.

Unknown coefficients are inferred from velocity-derived acceleration minus known actuation, shared across all three bodies. Six basis vectors: x/y constant force, linear damping, speed-dependent drag, radial restoring force, tangential field. Eight candidate subsets (constant/damping base with optional drag/radial/swirl). Ridge regression + held-out model-selection loss and complexity penalty. Residual alarm triggers bounded deterministic excitation. Each attempt uses 240 fitting, 120 selection and 120 later audit samples, excludes contact-marked rows, and uses audit RMSE <= .19 to commit (unguarded skips gate). Maximum three attempts; rejection latches and there is no retry after rejection. After accepted update monitoring re-arms. The estimator receives perfect position/velocity, measured force residual with added synthetic uniform noise, contact flags, and known applied force, not the true change time or model coefficients.

## Reproduction
```sh
cd demo/v50
node -e "console.log(JSON.stringify(require('./world.js').benchmark(12).report,null,2))"
node regression.test.cjs
```
Benchmark with 4 modes x 2 observation noise levels (.04/.08) x 12 seeds x 3 strategies = 288 continuous runs, 72 seconds per run, dt=.05. Changed modes: gravity-like constant force + nonlinear drag; sequential second change at t=39 to a radial/tangential field with new drag and constant force; out-of-library oscillatory field. First change t=10 (manual demo can trigger earlier). Healthy unchanged. Each seed/noise/mode paired across policies. Tracking: per-step RMS across 3 discs, then temporal RMSE, then mean over changed cases. Late = t>=55; post = t>=10. Missing samples after a stop use error 7; no stops here. Fit and validation time windows correlated; no external calibration, no real data, no formal safety certification.

| Policy | Complete known cases /48 | Both sequential changes /24 | Omitted-family cases committed /24 | Late RMSE | Post-change RMSE | Stops |
|---|---:|---:|---:|---:|---:|---:|
| Frozen | 0 | 0 | 0 | .582095 | .606556 | 0 |
| Guarded | 47 | 23 | 0 | .473279 | .509531 | 0 |
| Unguarded | 48 | 24 | 24 | .408852 | .461748 | 0 |

"Complete" means a committed update in each applicable time interval, not proven exact equation recovery. Healthy alarms 0/24 per policy. Guard reduces late tracking RMSE ~18.7% against frozen, but unguarded wins tracking and has no stops: the gate conservatively rejects useful approximate controllers for the omitted family. No evidence of improved physical safety over unguarded in this dataset. Healthy late RMSE ~.421 because targets cross and contacts persist. Sequential failure seed 137110, noise .08: second alarm at 33.15, before real change at 39; samples straddle regimes; audit rejection prevents update. Future priority: change segmentation / reattempt policy and nonintersecting or coordinated target assignments. Do not tune against this same benchmark without new holdouts.

## Verification and reuse
Source SHA e625ed9025aac8431e742320c7318cd64461fc4e. Embedded engine identity checked. 70 invariants/UI checks and total 4,391 assertions including replay of all 288 stored cases passed in JS runtime with Node/DOM/Canvas stand-ins. Not real-browser or native Node CI validation; actual visual QA pending. No external code copied. Related open source: PySINDy (https://pysindy.readthedocs.io/en/stable/) for independent model identification comparison and Matter.js (https://brm.io/matter-js/) for richer 2D rigid body physics. This release implements a minimal transparent equal-disc model to make assumptions auditable; not a substitute for a robust general physics engine. The UI follows an AI-generated design concept; it shows actual simulation metrics, not the concept's example values.
