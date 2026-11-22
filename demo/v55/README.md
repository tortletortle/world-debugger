# V0.55 — Revocable model authorization

## Run

Open `index.html` directly in a modern browser. It remains an offline, dependency-free demo. V0.54 is preserved unchanged in `../v54/`.

## What changed

V0.55 fixes a stale-authorization defect in the V0.54 runtime. When a residual alarm is raised while a learned model is active, V0.55 immediately revokes that authorization, clears the approved regions, and uses the nominal model for subsequent control. Training, validation, and audit continue without the old learned model being applied. Only a successful audit creates a new authorization epoch. Failed audits and retry exhaustion remain fail-closed.

The UI now displays authorization status, epoch, cumulative revocations, and the most recent revocation time/reason. During re-identification it explicitly displays the nominal fallback controller rather than the inactive learned model. The event log records the revoke transition. Export metadata and filenames identify V0.55.

## Reproduce

Requires Node.js 22; no npm dependencies:

```sh
node regression.test.cjs
```

The deterministic regression uses the sequential two-change scenario (seed 92381, `tree_guard`, noise .06, dropout .35). The paired validation grid is in [research/V0.55 validation](../../research/v55/VALIDATION.md), with machine-readable cases in `../../research/v55/paired-sequential.json`.

## Limits

The V0.54 residual alarm remains unchanged: eight residual samples with RMS > 0.25. This is an uncalibrated engineering threshold, not a statistical guarantee. Samples outside the currently authorized region are still skipped by the old model's drift monitor. The nominal model fallback is not a safety certification. All evidence is from the synthetic three-disc simulator; real browser QA and external benchmarks remain outstanding.
