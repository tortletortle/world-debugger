# V0.51 — Budgeted multi-body experiment planning

## Run
Download index.html and open in a modern browser. Offline, self-contained. Existing V0.50 visual design reused with strategy and training-budget selectors; no major visual redesign. Left is frozen control; right executes the selected policy. Export provides measured trajectories and model/session counters. Previous versions unchanged.

## Method and controlled comparisons
This is a centralized planner for three controlled discs, not three independently reasoning agents. The V0.50 simulator, controller, candidate model library, fixed alarm threshold, audit threshold and rejection latch remain. The planner sees current position/velocity, current model, and accumulated collision-free training samples. Every five simulation steps during fitting-data acquisition it considers eight rotations of the common deterministic excitation pattern, identical vector magnitude per body at the decision time. Actions held between replans. Random chooses a uniformly drawn rotation. Fixed chooses rotation zero; fixed240 uses the same block-held protocol with 240 training observations, not a bit-identical V0.50 baseline. Info predicts a half-second constant-acceleration lookahead using the current model and saturated control, then sums log(1+leverage) of the anticipated feature rows against the regularized six-term Gram matrix. This is a surrogate information score, not exact mutual information or exact joint log-det gain. info_safe subtracts four times a squared proximity penalty; it is not a safety certificate. No oracle force, mutation label or future observed state is used. Validation and audit each keep 120 disjoint chronological observations and fixed V0.50 excitation. This is a comparison of training-stage planning, not an adaptive validation method.

## Reproduction
```sh
cd demo/v51
node -e "console.log(require('./world.js').benchmark(8,120,51013).report)"
node regression.test.cjs
```
benchmark.json contains every per-case summary and the settings. Main 384 runs: 4 modes x 2 noise levels x 8 seeds x 6 strategies. Secondary 896 runs: disjoint seed base 63179, 30/60 training budgets with 4 short-budget policies each, 120 budget with all 6 policies. 1,280 total evaluations, not independent observations because of paired seeds and reused environments. New seeds, not new law families. Noise .04/.08. Identical initial conditions, exogenous force field and noise stream by paired case; resulting states/contacts differ by policy. Report averages over 48 changed cases per policy and budget. Contact counts per pair per step. Probe force squared integral is the **requested excitation** before saturation, not physical energy (joules); actEnergy is applied total control-force squared integral. No wall-clock matching; info variants do extra planning work.

| Main 120 group | Known updates /32 | late tracking RMSE | mean total observations | mean probe seconds |
|---|---:|---:|---:|---:|
| frozen | 0 | .574520 | 0 | 0 |
| fixed240 | 32 | .463501 | 640 | 11.4833 |
| fixed120 | 32 | .469010 | 480 | 8.3323 |
| random | 32 | .469190 | 480 | 8.3990 |
| info | 32 | .465663 | 480 | 8.4635 |
| info + proximity | 32 | .467680 | 480 | 8.5417 |

Secondary fixed results (same seed group): 240/120/60/30 training observations mean total observations 640/480/400/360; all 32/32 known cases committed in relevant intervals, late RMSE .477580/.462118/.465717/.459094. At 30 training samples random late RMSE .453329, info .464702, info+proximity .461540; random beats info in this metric. The fixed240 policy is redundantly evaluated in both 120 groups, not in 30/60 groups. All adaptive policies rejected the omitted oscillatory family in these tested configurations; no stops. Commit-count metric is not proof of exact equation recovery. Main gain is reducing unnecessary training observations: 30 vs 240 = 87.5% fewer fitting observations; all stages per attempted repair 270 vs 480 = 43.75% fewer. Both are conditional on this synthetic setting. The planning variants show no stable advantage over random or fixed; proximity penalty does not consistently reduce contacts. No significance or general safety claim. Known family features remain represented in the library, x/v and contact flags are trusted. Next experiment should vary excitation accessibility or identifiability (near-collinear motions, sparse measurements, restricted actuation), evaluate model error on independently sampled states, and include a new holdout physics family. Do not infer general superiority from low-budget success.

## Verification
27,031 assertions passed using fetched remote source and benchmark with JS runtime, Node/DOM/Canvas stand-ins, including all per-case replay, equal rotation amplitude, budget, bounded-force, deterministic behavior and UI interactions (strategy/budget, run/pause, reset, injection, export). Not native Node CI or actual browser rendering. Source and embedded engine match. Rejection remains terminal for the run; V0.50 sample-regime mixing issue not independently fixed. No third-party code imported; information-matrix planning and nonlinear model identification are established techniques, not claimed as novel.
