# V0.51 — Information-guided experiments and regime restart

## Reproduce
```sh
node research/v51/benchmark.cjs > /tmp/wd51.json
node research/v51/regression.test.cjs
```
Independent research module extended from V0.50. Browser builds remain unchanged. The four-policy comparison isolates direction planning and restart/retry. No third-party dependencies.

## Methods
- Fixed: V0.50 periodic excitation, disjoint 240/120/120 samples, same model and audit gate.
- Active: greedy joint information planning, every 8 simulation steps during fitting, over 8 excitation directions per body. Scores approximate log determinant information gain via nominal 0.45 s state rollout, subtracting predicted tracking and proximity penalties. Sequential assignment uses predicted states of other bodies. No oracle field or mutation schedule is used by the planner. Amplitude at choice time matches the periodic excitation norm; holding the action changes total energy slightly. Selection and audit use original periodic excitation.
- Restart: fit a provisional full model after 120 fitting rows; if its fitting RMS <= .16, monitor subsequent residuals. Restart on ten-frame RMS > max(.32, 3 times provisional error); discard all previous blocks and reset information. A rejected audit can also return to monitoring. Total at most three attempts, 1,440 collected rows including discarded ones. No true change times supplied to detection decisions.
- Joint: both mechanisms.

## Holdout protocol
5 conditions x 2 noise levels x 12 new seeds x 4 methods = 480 runs. Conditions: healthy, mixed field, sequential (second change 32–44.5 s), rapid sequential (18–25.5 s), omitted oscillatory field. Same per-case noise seed and scheduled changes across policies. Not new physical formula families; tests vary seed, noise and timing. Historical failure seed 137110 checked separately, not included in results. All runs last 72 s or stop on bounds. Known recovery requires a commit after final mutation AND independent final force-field RMS <= .25 on 81 Cartesian grid states. Time/field truth used only in evaluation. Tracking late (t>=55) and whole post-change (t>=10) includes probe periods when applicable; stops penalized as in V0.50. Cost is mean samples, probe seconds and integral of squared pre-saturation excitation norm over all three bodies, not actual actuator energy or computational runtime.

| Method | Known recovery /72 | Rapid recovery /24 | Mean post RMSE | Late RMSE | Mean observations | Mean probing s |
|---|---:|---:|---:|---:|---:|---:|
| Fixed | 68 | 20 | .526332 | .462305 | 700.0 | 12.6734 |
| Active | 68 | 20 | .502795 | .462907 | 700.0 | 12.6240 |
| Restart | 72 | 24 | .525746 | .459342 | 957.9 | 17.0755 |
| Joint | 72 | 24 | .499878 | .462912 | 957.8 | 17.1125 |

All methods had zero stops, no healthy alarms (24 each), and no committed omitted-family case (24 each). Restart improves terminal known-field error but consumes additional observations (including reattempts on omitted fields); active alone shows no recovery-rate gain or late tracking gain. Joint reduces whole post-change tracking error about 5% relative to fixed, not late error. No strict equal wall-clock/energy budget; no significance claim, external benchmark, real sensor or formal safety validation. Existing collision model and crossing targets remain limitations. Related principles (information-optimal design and residual change detection) are established; no claim of algorithm novelty.

## Verification
13,291 assertions passed in JavaScript runtime against fetched committed sources and data; includes V0.50 parity on selected cases, historical failure reproduction and recovery, determinism, effort accounting and all 480 case summaries replayed. Native Node CI and actual browser integration not run. See results.json for complete per-case records.
