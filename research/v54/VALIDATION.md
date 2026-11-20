# V0.54 — Independent domain-boundary validation

This is an independent validation variant, not a replacement for the parallel demo/v54/world.js implementation. V0.53 baseline SHA 9d7156c34583a104f5146c641ec750b117c3c3a3 was checked first. A different V0.54 source appeared during development; GitHub rejected the competing create request. That source (7e4d4c3340b6f1f1bb578a389902c37f76599723) was used as the variant's base without overwriting it. Variant SHA c5302d5878923cf56f6c9d2a0e4b3677b754c7b6.

## Method
Three-disc continuous synthetic dynamics, 72 s, dt .05; masked scalar acceleration observations, known noise SD, .35/.65 dropout, noisy position/velocity estimates, contact flags and bounded force. Candidate vector force model uses 30 fitting and 20 model-selection labels. All adaptive policies get 60 audit labels: first chronological 30 for discovering partition, later 30 for confirming leaves. Within each block a common predetermined two-phase orbit challenge varies reference angular speed (1 then 1.65) and radius (1 then .9). All compared adaptive policies share the first intervention schedule and observation budget; later decisions/trajectories and attempts can differ. Temporal separation does not imply independent samples. A new designed joint spatial/directional interaction family is added to the base modes. No external blind benchmark.

The depth-2 regression tree searches residual SSE reduction over speed, x, y, vx, vy, diagonal coordinates and radius. Partition is fitted exclusively from the first 30 audit labels. Confirmation uses at least seven labels and two per axis per leaf, RMSE <= max(.18,2.5*known noise SD); heuristic, not calibrated. Global/fixed/tree variants differ in partition; box and ball variants additionally restrict measured-state support. Axis-aligned box uses confirmation envelope plus fixed padding. Ball guard requires a nearby confirmation anchor for both observation axes, in normalized four-dimensional position/velocity space (radius .65). Uncovered states use nominal controller; no safe-control guarantee. Existing residual-monitor skip outside authorized scope and rejection latch remain. No online autonomous boundary-expansion planner or retry is implemented.

Methods: frozen, global_split, fixed_split (fixed four speed bins), tree_split, tree_guard (tree+box), box_only, tree_ball, ball_only. All adaptive methods use same temporal split. Global is one confirmed leaf without coverage restriction. The original parallel source's contrast/scope policies are not included in this equal-budget variant.

Independent evaluator samples 256 states per case (128 near orbital state distribution, 128 wider state samples), using true final regime only in evaluation. Authorized points with clean vector force error > .35 count as errors. Coverage is authorized points/all test points; conditional risk is errors/authorized points (undefined for zero coverage). Correct coverage = correct authorizations/all points. It measures sampled final-model validity, not safety or exact boundary recovery. Post-change tracking counts deviation during experimental interventions. Seeds are paired across policies; not independent observations. Development seed group 54711 (3 seeds), secondary group 94117 (6 new seeds) reused at two dropout rates, both noise levels .06/.12, 11 modes and 8 policies: 528+1056+1056=2640 evaluations.

## Secondary results
| policy | .35 coverage | .35 conditional error | .65 coverage | .65 conditional error |
|---|---:|---:|---:|---:|
| global_split | .441667 | .195755 | .366667 | .199130 |
| fixed_split | .401530 | .066802 | .432813 | .127332 |
| tree_split | .483268 | .134110 | .437077 | .196023 |
| tree_guard | .226270 | .064163 | .213867 | .090411 |
| box_only | .208008 | .091549 | .180208 | .085621 |
| tree_ball | .242839 | .081635 | .206348 | .080297 |
| ball_only | .219531 | .097716 | .172689 | .078040 |

At .35, the learned tree alone gains coverage at higher risk than fixed bins. Tree+box vs box only improves both coverage and risk in this group, but not conditional risk at .65; tree+ball vs ball only exhibits the same tradeoff reversal. For the spatial/oblique/directional/joint families at .35, tree+box conditional error .1501 vs box only .2024, but coverage .0591 vs .0680; tree+ball conditional error .2410 vs ball only .2567, coverage .0817 vs .0669. These are descriptive results, not a matched-coverage or significance claim. Fixed speed bins remain strong. At .35 known-case completion is 35/36 fixed, 34/36 tree, 32/36 tree+box; no stops. Whole post-change tracking RMSE for all adaptive policies is ~.547–.555 vs frozen .263; at .65 ~.953–.964 vs frozen .263. The common challenge is costly and this version does not show a net control improvement. Later work should make challenges cost-aware and explicitly separate knowledge acquisition from operational control. No claim of novelty over regression trees, selective prediction, support estimation or existing system-identification methods.

## Reproduce
```sh
cd research/v54
node -e "console.log(require('./domain-validation.cjs').benchmark(6,30,94117,undefined,.35).report)"
node validation.test.cjs
```
All 2640 individual cases saved: validation-0.json; validation-1.json and validation-2.json (large originals); equivalent part-0/part-1 files for each large group because connector read-back truncated the originals. Regression reads the verified smaller files. Column names map compact case arrays. 322880 assertions passed against remote source and split data using JavaScript runtime with Node fs/path stand-ins; includes boundary fit/confirmation separation, neighbor restriction, actual per-step authorization and all case/summary replay. This is not native Node CI. No UI modification, actual browser QA, or external algorithm comparison completed in this variant. The parallel demo source has been left untouched.
