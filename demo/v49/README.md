# V0.49 — Continuous World Lab

## Run
Download `index.html` in this directory (GitHub: Download raw file) and open with a modern browser. No network, installation or external API required. The original repository root game is unchanged. The inline core matches world.js. UI layout based on AI-generated visual design, with model values coming exclusively from live simulation.

## Protocol
One-dimensional point mass, 1 kg. Semi-implicit Euler dt=.05, target 1.6 sin(.62 t), 60 seconds. Baseline damping -.35 v. Mutation at t=12 unless triggered early by the operator. Healthy has no mutation. Three modeled families (constant external force, nonlinear drag plus drift, cubic spring) and one omitted high-frequency force. 20 seeds x 2 synthetic acceleration observation noise levels x 5 worlds x 3 policies = 600 runs. Seed changes magnitude/sign. Policies share seed, target and noise stream up to termination. Position/velocity are perfect simulated observations; acceleration estimated from consecutive velocities plus uniform noise (SD .025 or .06); input force known. Controller uses PD plus feedforward compensation, saturates at ±6 N. Observation residual RMS triggers alarm; after alarm bounded periodic excitation, 160 training samples, 80 selection samples and 80 disjoint temporal audit samples. Fixed basis of 7 candidate term sets, ridge fit, validation score plus term count penalty. Audit threshold .12. No true mutation time or true formula used by learner. Rejected update retains old model. Stop on |x|>8 or |v|>6. Only one mutation supported per run.

| Policy | Known repaired | Omitted family accepted | Stops | Mean late RMSE |
|---|---:|---:|---:|---:|
| Frozen | 0/120 | 0/40 | 0 | .346707 |
| Guarded | 120/120 | 0/40 | 0 | .063288 |
| Unguarded | 120/120 | 40/40 | 14 | .200984 |

Late RMSE is mean of per-case t>=32 errors, using observed portion for stopped cases and penalty 8 if no late observations; healthy excluded. This is not a censoring-adjusted estimate. Whole post-change means (observed portion) .343128/.232656/.301260. Guarded and frozen do not stop, so their late RMSE comparison is directly interpretable. 0/40 healthy alarms per policy. Three modeled generator families are deliberately represented in basis. This is proof of integration, not novel symbolic regression, generalized rejection or a certified safety result. Fixed probe excitation, not adaptive experiment design. Disjoint blocks are serially correlated, not i.i.d. True position/velocity and noise model simplify reality. No comparison to SINDYc, MPC or real data. PySINDy (https://pysindy.readthedocs.io/en/stable/) is a relevant external comparison; Matter.js (https://github.com/liabru/matter-js) is relevant for future 2D collision rendering/physics, but a direct scalar integrator is sufficient here. No third-party code imported.

## Regression
```sh
node -e "console.log(require('./world.js').benchmark(20).report)"
node ui.test.cjs
```
Actual committed core executed twice in JS runtime. 69 invariant checks passed, including inline-code identity, repeatability, bounded force, experiment budget, audit ordering, healthy/injection. UI script evaluated with DOM/canvas stand-ins: start/pause/resume/reset, mutation injection, export, repair/refusal, healthy mode passed. Not a real browser visual or interaction test. Native Node replay of local retyped core agrees up to floating point differences, but local copy was not byte-verified; use the committed files as authority. Benchmark JSON stores complete per-case summaries, not full time series. Demo session export stores traces. Earlier V0.48 research and root V0.45 are unchanged.
