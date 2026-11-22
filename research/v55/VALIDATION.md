# V0.55 — Revocable model authorization validation

## Scope

V0.55 is an engineering correction to the V0.54 runtime. It does not change the boundary-discovery tree, label split, model-fitting procedure, residual threshold, or synthetic physics. It changes only the lifecycle of a learned model's authorization after a residual alarm.

Baseline: `demo/v54/world.js` SHA `53edbbcc206e8af4ee28f02d65d503c44c004f84`; baseline regression source SHA `14a1b86f9d96bc00f8e7ad5747cb29b521924d8d`.

## Defect reproduction

In the deterministic sequential scenario (seed 92381, tree_guard, noise .06, dropout .35), V0.54 commits the first learned model at 27.1 s, detects the second residual alarm at 40.8 s, and commits the second model at 58.3 s. Its previous authorization remains usable during re-identification. Under the paired trace definition below, V0.54 records 932 stale learned object-control frames in this interval (the earlier exploratory counter included boundary frames; this report excludes the alarm and re-commit frames).

## V0.55 correction

- Every control step now checks `authorizationActive` before applying the learned model.
- A residual alarm immediately sets authorization inactive and clears scoped approvals.
- The controller uses the nominal model while training, validation, and audit run.
- A successful audit increments `authorizationEpoch` and grants a new authorization.
- A failed audit leaves authorization inactive and approvals empty; retry exhaustion also fails closed.
- Trace and snapshots expose authorization state, epoch, revocation count, last revocation time, and reason.

## Paired regression experiment

24 paired deterministic runs: six seeds × two observation-noise levels (.06/.12) × two dropout rates (.35/.65), all using the sequential two-change scenario, `tree_guard`, training budget 30, 72 s horizon, and identical seeds/settings for V0.54 and V0.55. A stale frame is an entity-control usage with `learned=true` after the second alarm/revocation frame and before the next successful commit frame; if no later commit occurs, counting continues to the end. The detection frame and re-commit frame are excluded.

| Metric | V0.54 | V0.55 |
|---|---:|---:|
| Runs with second alarm/revocation | 21 / 24 | 21 / 24 |
| Stale learned-control frames, total | 23413 | 0 |
| Stale learned-control frames, mean among alarmed runs | 1114.9 | 0.0 |
| Mean post-change tracking RMS | 0.8526 | 0.8318 |
| Mean late tracking RMS (t ≥ 55 s) | 0.8858 | 0.8276 |

V0.55 successfully re-authorized after the second change in 12 of 21 alarmed runs; the remaining runs stayed revoked because the new audit did not pass. 7 of 24 runs ended with an active authorization. No stale learned-control frame was observed after revocation in the paired test.

Tracking RMS is descriptive only. The small deterministic synthetic grid is not a statistical significance test or external benchmark. V0.55 does not claim that nominal fallback is physically safe.

## Regression command

```sh
node demo/v55/regression.test.cjs
```

The suite covers deterministic replay, split isolation, per-step scope authorization, synchronous revocation, no learned-model use during re-identification, fail-closed second-audit rejection, initial audit rejection, and the mocked UI. GitHub Actions is configured to run it under Node.js 22 on the pull request. The first three hosted-runner attempts terminated before any job step was recorded; the jobs expose no step logs, so this is not evidence of a test assertion failure. The workflow is pinned to Ubuntu 22.04 for the next attempt; native CI remains pending.

## Remaining limitations

- The existing drift detector still uses an uncalibrated engineering threshold: eight residual samples with RMS > 0.25.
- Samples outside currently authorized regions are still excluded from the active-model drift window; discovering new dynamics outside the approved support needs a separate shadow monitor.
- Authorization boxes/balls remain heuristic support restrictions, not calibrated confidence sets or safety guarantees.
- The simulator is synthetic; real browser rendering and independent external benchmarks remain outstanding.
