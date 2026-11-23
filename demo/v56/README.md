# V0.56 — Shadow monitoring for unsupported regions

## Run
Open `index.html` directly in a modern browser. Offline, dependency-free. V0.55 remains unchanged in `../v55/`.

## What changed
V0.56 adds a read-only shadow monitor for observations outside the currently authorized model support. It compares those observations with the nominal model and maintains separate energy-CUSUM statistics for the two coarse spatial half-planes (`x < 0`, `x ≥ 0`). An alarm records an unsupported-region candidate and its evidence. It does not change the controller, revoke existing approvals, or automatically promote a candidate to learned knowledge.

For residual e and configured observation-noise scale sigma, the monitor computes q=min(100,(e/max(sigma,0.02))^2), then S=max(0,S_previous+q-2). It alarms when S≥24 after at least three observations in that region. These are initial engineering settings, not calibrated statistical guarantees.

## Reproduce
Requires Node.js 22; no npm dependencies:

```sh
node regression.test.cjs
```

The regression suite includes 200 seeded null-noise streams, persistent-shift detection, high-noise/dropout integration, and an invariance check against the actual V0.55 baseline source.

## Limits
Only observations outside the authorized support are monitored. The two-region x-sign partition is deliberately coarse; it can miss localized effects or mix distinct regimes. The CUSUM parameters are uncalibrated. A shadow alarm indicates mismatch against the nominal baseline in an unsupported region; it does not prove a new causal law and does not automatically authorize a model. Evidence remains from the synthetic three-disc simulator; real browser QA and external benchmarks remain outstanding.