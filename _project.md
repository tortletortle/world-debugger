# 世界调试器

- 仓库：https://github.com/tortletortle/world-debugger （Private）
- 当前候选：V0.56（授权范围外只读影子监测）
- 开发分支：`feature/v0.56-shadow-monitor`
- 基线：V0.55 候选分支 `feature/v0.55-revocable-model-authorization`
- V0.55 PR #1：保持 Draft，未合并；原生 Actions Runner 失败状态未解决
- V0.56 交付：影子监测、能量 CUSUM、UI 状态、73,164 项沙箱断言、200 条空模型噪声流、24 组配对实验；Actions Runner 启动失败且无步骤日志
- 下一步：更细粒度区域发现；研究主动探测与局部知识更新
- 约束：V0.56 PR 以 V0.55 分支为 base，不合并 main；未完成原生 CI 与真实浏览器验收不得标记为正式发布