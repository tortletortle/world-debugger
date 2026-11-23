# V0.56 — Shadow monitor validation

## Scope and baseline
V0.56 adds a read-only monitor for observations outside the currently authorized model support. It does not change the controller, learned-model authorization, training, or audit. V0.55 remains unchanged.

Baseline V0.55 head: `e25c15e0d4c0eebef434789031515dfebad7a45b`.

## Algorithm
For an unsupported observation, calculate signed nominal-model residual:
`e_t = F_nominal(x_t)[axis] - y_t`

Normalize squared residual energy using configured observation noise `σ`:
`q_t = min(100, (e_t / max(σ, 0.02))²)`

Maintain independent one-sided energy CUSUMs for two coarse spatial regions, `x < 0` and `x ≥ 0`:
`S_t = max(0, S_(t-1) + q_t - 2)`

Raise a latched candidate alarm after at least 3 observations in that region and `S_t ≥ 24`. Each region records sample count, first/last observation time, maximum absolute residual, current CUSUM and alarm state. A successful new model authorization resets the per-epoch region accumulators while preserving cumulative observation/alarm counters.

A shadow alarm only appends an event and exposes evidence. It does not revoke the current model, change the phase, alter control actions, trigger training, or automatically authorize new knowledge.

## Null-stream check
200 deterministic streams × 2,000 observations each, alternating noise scales `σ=0.06` and `σ=0.12`; observations follow the simulator's bounded uniform-noise model `Uniform(-√3σ, +√3σ)`, routed into two region accumulators. Observed false-alarm streams: **0 / 200**.

This is a finite synthetic null-stream check, not a calibrated false-alarm probability or a real-world guarantee.

## Paired V0.55/V0.56 experiment
24 paired deterministic runs: six seeds × two noise levels × two dropout rates. Scenario: `hidden`; policy: `tree_guard`; budget 30; horizon 72 s; step 0.05 s. Every pair uses identical seed, noise and dropout settings.

- V0.55 produced an authorized learned model in 23/24 runs.
- V0.56 raised at least one shadow candidate in 20/23 runs with an authorized model (87.0%).
- Total shadow alarms: 28; total unsupported observations processed: 349.
- Mean first shadow-alarm time among detected runs: 41.44 s.
- Body trajectories were byte-for-byte identical between V0.55 and V0.56 in 24/24 pairs.
- Per-frame controller-usage traces were byte-for-byte identical in 24/24 pairs.

Three authorized runs did not produce an alarm because available unsupported observations were too few or too weak to cross the threshold. One of 24 runs did not obtain an authorization, so its shadow monitor remained inactive. Per-case details are in `paired-shadow-monitor.json`.

## Regression suite
`node demo/v56/regression.test.cjs`

The suite passes 73,164 sandbox assertions. It covers all V0.55 assertions, 200 seeded null streams, minimum-evidence and threshold behavior, low-residual tolerance, region assignment, integrated hidden-regime monitoring, high-noise/high-dropout behavior, UI evidence, and direct paired invariance against the V0.55 source.

## Limitations
- The `x < 0` / `x ≥ 0` partition is intentionally coarse and may miss or merge localized regimes.
- Squared-residual CUSUM is an engineering heuristic; reference value 2 and threshold 24 are not statistically calibrated.
- Comparing unsupported observations with the nominal model can flag a known law that is simply outside the learned model's authorized support. This means “unexplained under current authorization,” not necessarily “newly changed.”
- A shadow alarm is a candidate signal, not causal proof. It does not trigger active probing or local model fitting in V0.56.
- Evidence is synthetic. Native Node.js 22 GitHub Actions and real browser rendering remain pending. V0.56 push run #45114278936, PR run #45114283647, and the PR run's second attempt all terminated before any job step was recorded; the jobs expose no step summaries or logs. This does not establish a source-level test failure, but it also does not constitute native CI validation.