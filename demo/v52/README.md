# V0.52 — Sparse-sensor hypothesis discrimination and challenge audit

## Run
Download index.html and open offline. V0.51 visual layout reused. Select physics scenario, experiment strategy, training budget, dropout and observation-noise standard deviation, then run and export. Both worlds share settings and seeded observation schedules; the left uses the frozen model. The default example is hidden-speed drag with speed-sweep audit. Change strategy to ordinary contrast audit to see the failure. Earlier demos remain unchanged.

## Model and observability
Three equal discs, dt=.05 s, 72 s, same-direction orbital goals (near constant speed, making linear vs quadratic drag difficult to distinguish). No collisions occurred in this benchmark; collision masking is inherited, not validated by these cases. Control and planner use noisy x/y (uniform ±.012 m) and vx/vy (uniform ±.025 m/s) each step. At each even step a separate seeded sensor selects one body and one acceleration axis uniformly, with independent Bernoulli dropout probability .35 or .65. Simulator emits only a single scalar acceleration-residual observation if this sensor slot succeeds and is contact-free; sensor noise is uniform with SD .06 or .12. True pre/post velocity difference is used *inside the sensor simulation* to synthesize the scalar observation, not exposed as an extra acceleration/velocity label to the learner. This is a partial acceleration observation task, not a fully partially observable control system: noisy state estimates and applied force are always available, and contact flags/noise SD assumed known. The same schedule/noise seeds are used across policies. Physics changes at 10 s (and 39 s in sequential) but the learner uses only the residual alarm. These times and truth are available to the simulator and evaluator only.

Seven modes: healthy, linear drag, quadratic drag, mixture, two successive drag/rotational regimes, omitted oscillatory field, hidden speed-dependent damping. Hidden mode adds strong piecewise drag above 1.15 m/s, outside the candidate library. The development stress law is intentionally constructed; not an external blind dataset. Eight candidate sets share constant/linear damping base and optional quadratic drag, radial and swirl terms. Scalar masked ridge fits use 30 training labels, 20 model-selection labels, 30 later audit labels per completed attempt. Model remains frozen during audit. Threshold max(.18, 2.5*known noise SD), not independently calibrated. Rejection retains old model and latches; up to 3 successful/alarmed attempts. Mixed-regime data and late detection remain unresolved.

## Methods
- frozen: no repair.
- fixed/random/info: fixed rotating schedule, random direction, and lookahead information proxy, respectively.
- contrast: adds disagreement of four competing structure fits once 10 training observations are available.
- contrast_random_audit and contrast_challenge: same contrast training, same-amplitude random or novelty-based audit excitation, held for five steps, scored using only observed state features and current model, not audit labels.
- contrast_speed_sweep: contrast training, then a predetermined 1.9x orbital reference speed during audit (not a learned autonomous sweep strategy). Equal label budget, unequal intervention and computation cost. Original task goal still defines error during intervention, so the whole-change metric explicitly charges the cost of departure. The 1.15 speed threshold is a diagnostic reporting bin for this synthetic stress case, not used for selecting or approving the model.

The planner uses a regularized Gram matrix and sum-log-leverage approximation, not exact information gain. Unknown structure discovery remains constrained to the fixed library. Independent final force-model RMSE uses 64 seeded off-trajectory states (x/y in [-2,2], vx/vy in [-1.5,1.5]) and the final true regime, strictly for evaluation. KnownComplete counts a commit in each relevant time interval, not proof that its formula is correct. knownBadAccepted counts known cases with any commit and final off-trajectory RMSE > .35 (can include stale models after later changes). HiddenAccepted counts any commit in a hidden-law case, not a theorem of global invalidity. No stops occurred.

## Reproduce
```sh
cd demo/v52
node -e "console.log(require('./world.js').benchmark(8,30,76321,undefined,.35).report)"
node regression.test.cjs
```
benchmark.json uses compact arrays in cases; columns supplies field names. Source SHA c5ef72b72902f4dfa1138c6ff1c40fd46e841e53.

Development 672 runs: 7 modes x 2 noise levels x 6 seeds x 8 policies at .35 dropout. Secondary disjoint seed base 76321, 8 seeds x 2 noise levels x 7 modes x 8 policies x 2 dropout settings = 1,792 runs. Total 2,464 paired evaluations, not independent experiments. Same secondary seeds reused across dropout conditions. Independent seeds, not independent law families.

| Secondary settings / method | Known complete /64 | Hidden accepted /16 | Mean late tracking RMSE | Mean post-change tracking RMSE |
|---|---:|---:|---:|---:|
| .35 fixed | 62 | 16 | .078209 | .169437 |
| .35 contrast | 61 | 16 | .077033 | .132985 |
| .35 novelty challenge | 61 | 16 | .075917 | .124585 |
| .35 speed sweep | 54 | 0 | .209815 | .560055 |
| .65 contrast | 57 | 16 | .086861 | .163579 |
| .65 speed sweep | 53 | 2 | .428660 | .910876 |

All adaptive policies rejected or did not commit the omitted oscillatory family across the recorded cases. In the development group, speed sweep accepted 0/12 hidden cases; contrast accepted 12/12. In the secondary .35 group, mean count of audit observations above 1.15 m/s over changed runs (including repeated attempts) was 1.406 for contrast, 3.313 for novelty audit, 29.854 for speed sweep. Active sweep improves detection of this hidden family, but worsens completion and tracking, increases control-force squared integral (.35 contrast 268.412 vs speed sweep 395.539), and is not a matched-actuation-cost comparison. Force-squared integral is not physical energy. Known-bad-accepted for .35 contrast 18 vs sweep 13; .65 contrast 18 vs sweep 15; reduction is not proof of general calibration. No statistical significance, no safety certification, no physical robot results, no external benchmark. Ordinary contrast still has useful local control even with wrong extrapolation, and non-completion of known cases need not mean a correct model was rejected.

## Verification
79,391 assertions passed via fetched remote source, JavaScript runtime and Node/DOM/Canvas stand-ins, including all stored case summaries, deterministic action bounds, sensor accounting, budgets and user interactions. The source is embedded byte-for-byte in the page. Native Node CI and actual browser visual QA have not been performed in this session. The next research target is domain-scoped model acceptance, adaptive challenge planning and retry after failure, not universal rejection based on a single threshold.
