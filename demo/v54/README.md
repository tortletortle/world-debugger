# V0.54 — Residual-guided multidimensional knowledge boundaries

## Run
Download index.html and open offline. The existing V0.53 dashboard is reused with discovered region evidence and currently authorized regions displayed separately. Default spatial scenario (seed 92381, .06 noise, .35 dropout, tree_guard) demonstrates a rejection and a potentially spurious oblique split. For a reproducible positive example select hidden-speed physics, keep these settings: the first learned split is speed approximately 1.181 m/s; low-speed leaf supported (21 labels, scalar RMSE .0880), upper leaf failed (9 labels, .4046). The true hidden threshold in that synthetic family is 1.15 m/s. This is an illustrative single case, not an unbiased aggregate boundary accuracy estimate. Prior versions retained.

## Method
Based on V0.53 continuous three-body simulator and scalar sensor. Training 30 and validation 20 observations by default. Contrast experiment planning and candidate force-law search unchanged. New strategies use 60 audit labels (30 ordinary reference + 30 speed sweep at 1.9x), partitioned by even/odd observation index into 30 boundary-discovery labels and 30 confirmation labels. These are disjoint, but adjacent time labels are correlated; no i.i.d. or statistical independence claim. The candidate model has already been selected and is frozen before audit. No confirmation labels are used to choose the tree. The sweep is still hand-designed, not autonomous.

Candidate features: speed, x, y, vx, vy, (x+y)/sqrt(2), (x-y)/sqrt(2), radius. Discover splits using reduction in SSE of clipped squared scalar residuals (clip at 4), minimum 7 discovery observations per child, depth <=2, gain > max(.006,.22*parent SSE). Thresholds are midpoints of adjacent distinct feature values. Confirmation labels separately determine leaf support: >=7 labels and >=2 per axis, scalar RMSE <=max(.18,2.5*known noise SD); otherwise failed or unknown. Guard adds a rectangular support envelope of confirmation sample ranges for speed, x, y, vx, vy, with fixed margins .08,.22,.22,.16,.16. These thresholds and margins are engineering heuristics, not calibrated confidence bounds. No independent directions or state sufficiency guarantee. Runtime model selection uses noisy measured states, switches to the initial nominal model outside supported authorization, and logs state and decision per body. It inherits terminal rejection, skipped out-of-domain monitoring and stale authorization issues. No new model fitted in each region: a single candidate force law is scoped. No autonomous repeated boundary revision except existing re-identification triggers.

## Controls
- frozen: no update.
- contrast: V0.53 ordinary global audit, 30 audit labels, no sweep.
- scope_dual: V0.53 fixed speed bins, 60 labels, no discovery/confirmation split.
- fixed_split, fixed_guard, tree_split, tree_guard: same precommit experiment schedule and label budget, same confirmation counts/rules, differing only fixed versus data-driven partitions and optional envelope. Fixed bins [0,1.1), [1.1,1.45), [1.45,2), >=2; unlike scope_dual the new fixed methods use the new confirmation rule (including the fourth bin). All four may diverge after first authorization via control/re-learning. Wall-time and total interventions are not matched.

10 synthetic modes: healthy, linear, quadratic, hidden, hidden_shift, spatial, oblique, directional, sequential, unknown. Oblique adds a force after crossing a seed-dependent threshold on (x+y)/sqrt(2); directional adds an omitted force depending on vy. The hypothesis feature library includes candidate projections, so these are neither unconstrained feature invention nor blind law families. Simulator truth is not provided to the controller or split algorithm. Evaluation uses 256 independently generated clean state points per case (128 near orbit and 128 broader spatial/radial/speed states), final true regime, vector-force error norm > .35 counts as bad; authorization evaluated using ideal state coordinates, not noisy sensor coordinates. Coverage = authorized/all changed-case points, conditional error = bad/authorized, correct coverage = good/all. Includes stale final models; global commit authorizes all points. These are pooled point counts on synthetic test distributions, not independent trials or real-world probabilities. Known complete counts interval commits, not proof of exact equations. Original task tracking includes challenge cost; force-squared integral is not joules.

## Reproduce
```sh
cd demo/v54
node -e "console.log(require('./world.js').benchmark(6,30,92381,undefined,.35).report)"
node regression.test.cjs
```
Three compact benchmark files contain columns and group.cases arrays. Source SHA 53edbbcc206e8af4ee28f02d65d503c44c004f84. 560 development runs + 840 secondary (.35 dropout) + 840 secondary (.65 dropout) = 2,240 continuous evaluations. 10 modes x 2 noise levels x 7 policies x 4 or 6 seeds. Secondary seed base 92381 distinct from development 54011; same secondary seeds across dropout groups. Development explored tree before adding fixed-guard ablation; secondary group is an internal fresh-seed check, not external validation.

| Secondary .35 | Coverage | Conditional bad rate | Correct coverage | Known complete /36 | Post-change tracking RMSE |
|---|---:|---:|---:|---:|---:|
| contrast | 67.59% | 24.17% | 51.26% | 36 | .167606 |
| scope_dual | 50.15% | 7.62% | 46.33% | 36 | .580564 |
| fixed_split | 47.45% | 7.46% | 43.91% | 36 | .574506 |
| fixed_guard | 30.49% | 7.37% | 28.24% | 35 | .579214 |
| tree_split | 56.08% | 11.46% | 49.66% | 36 | .577355 |
| tree_guard | 34.65% | 4.86% | 32.96% | 36 | .576093 |

At .65 dropout fixed_guard coverage 28.77%, error 8.21%; tree_guard 34.28%, error 9.13%; both 24/36 known complete. No stable superiority at higher dropout. At .35 across spatial/oblique/directional modes only: fixed_guard coverage 13.08%, error 38.76%; tree_guard coverage 10.45%, error 28.45%. Correct coverage falls from 8.01% to 7.48% in these three modes; reduced conditional errors do not imply more correct usable knowledge. Automatic split without envelope is not superior to fixed split in error in either secondary group. In .35 secondary tree_guard assessment paths selected speed in 39 cases, vy 11, x-y 7, y 3, x 3, vx 3, radius 1 (case counts with that feature, not mutually exclusive). No proof of identifying causal boundary variables; correlated orbital state features can act as proxies. No stops. No confidence intervals/significance claims or external benchmark. Sweep substantially worsens whole-task tracking even relative to frozen; not a control improvement claim.

## Prior work and verification
Recursive partitioning and selective regression are established families, e.g. model-based recursive partitioning discussion https://pmc.ncbi.nlm.nih.gov/articles/PMC2927982/ and selective regression risk/coverage https://proceedings.mlr.press/v162/shah22a.html. This is a research integration prototype, not a novel decision-tree claim.

266,771 assertions passed using actual fetched GitHub source and data in JS runtime with Node/DOM/Canvas stand-ins. Includes confirmation-label perturbation (tree structure unchanged), spatial test split, envelope checks, per-step authorization, deterministic replay of all stored cases and report fields, mocked run/pause/reset/export. Counts include repeated comparisons, not distinct scenarios. Native Node CI and real browser rendering remain unverified. Next focus: budget-aware targeted experiments for confounded features, region-specific residual model repair, and revocation on change. 
