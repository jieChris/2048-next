# 架构红线与门禁规则

> 目标：把“理想状态”转为可执行、可阻断、可审计的工程规则。  
> 生效范围：全仓库（含页面入口、核心逻辑、测试、CI）。

## 1. 红线清单（不可违反）

### R1. 禁止新增 legacy 依赖
- 规则：禁止新增对 legacy loader、历史 runtime 主链路的依赖。
- 检测方式：`rg -n "legacy|runtime" js src *.html`，并结合 `npm run audit:entry-manifest` 检查入口是否回流到旧壳。
- 失败判定：新增页面、入口或运行链路必须依赖 legacy 才能工作，或在主流程中出现新的 legacy import/调用。

### R2. 禁止绕过 Engine 修改核心状态
- 规则：任何棋盘状态变更必须经 Engine 统一入口。
- 检测方式：`npm run test:unit` + `npm run test:smoke:runtime-contract`，并对 `GameManager` 相关变更点做静态扫描。
- 失败判定：页面层、feature 层、UI 层直接改核心状态对象，或测试证明存在绕过 Engine 的状态写入路径。

### R3. 禁止绕过 contracts 传递核心数据
- 规则：状态、回放、提交、同步、存档必须使用 contracts 定义。
- 检测方式：`npm run test:unit` 中的 contract/schema 相关用例 + 对 API/storage 结构做差异检查。
- 失败判定：页面/API/storage 层存在隐式结构并进入主链路，或序列化/反序列化不经过 contracts。

### R4. 禁止页面层直接读写 localStorage 业务数据
- 规则：页面不得直接写本地业务状态，统一通过 storage 抽象层访问。
- 检测方式：`rg -n "localStorage\\." src js`，并结合相关单测确认写入路径只落在 storage 模块。
- 失败判定：`app/pages/ui` 或业务页面出现 direct `localStorage.*` 业务调用，且未列入白名单。

### R5. 禁止页面层直接拼装业务网络协议
- 规则：页面层不直接组装业务请求体，统一通过 service/api 层。
- 检测方式：`rg -n "fetch\\(|/api/" src/entries js`，再由对应单测或 smoke 验证请求体由 service 层生成。
- 失败判定：页面层出现核心业务 API 字段拼装逻辑，或页面直接向后端发送未经 service 封装的协议数据。

### R6. 禁止新增散点 html 入口
- 规则：新页面必须登记到统一页面系统与入口 manifest。
- 检测方式：`npm run audit:entry-manifest` + `tests/unit/html-module-entry-pages.spec.ts`。
- 失败判定：根目录新增未纳管业务 html 入口，或页面没有进入统一入口映射。

### R7. 禁止 PKU 逻辑分叉
- 规则：PKU 功能必须与普通玩法共享同一 Engine/contracts 核心。
- 检测方式：PKU 相关 smoke + 对比普通玩法的核心调用链，确认共用同一协议与引擎。
- 失败判定：PKU 复制出一套独立规则实现，或出现双套核心逻辑并行维护。

## 2. 自动化门禁映射

| 红线 | 对应门禁 | 当前命令 |
|---|---|---|
| R1 | refactor gate + 入口扫描 | `npm run verify:prepush`（含 `legacy-boundary-audit`） / `npm run audit:entry-manifest` |
| R2 | 核心行为 unit + smoke | `npm run test:unit` / `npm run test:smoke:runtime-contract` |
| R3 | contracts 单测 + 集成校验 | `npm run test:unit` |
| R4 | 静态扫描（localStorage） | `rg -n "localStorage\\." src js` |
| R5 | service 边界审计 | `rg -n "fetch\\(|/api/" src/entries js` |
| R6 | entry-manifest 审计 | `npm run audit:entry-manifest` |
| R7 | replay/competition/pku 回归 | `npm run test:smoke:play-replay` + PKU 相关 smoke |

## 3. PR 阶段与主分支阶段的 CI 阻断策略

### 3.1 PR 阶段最小必跑项
PR 进入合并前，至少跑以下项：
1. `npm run test:unit`
2. `npm run audit:entry-manifest`
3. `npm run test:smoke:runtime-contract`

阻断规则：
- 任一项失败，PR 直接阻断，不能合并。
- 若失败指向 R1-R7 任一红线，必须同步补充对应测试或规则说明。
- 若失败属于临时环境问题，必须在 PR 评论中标注复现条件和替代验证证据。

### 3.2 主分支阶段最小必跑项
主分支合并后，至少跑以下项：
1. `npm run verify:prepush`
2. `npm run test:smoke:ci`
3. `npm run build`

阻断规则：
- 任一项失败，主分支发布链路阻断。
- 若失败是门禁规则失效，优先修门禁，不允许只修业务代码绕过。
- 若失败是 smoke 超时或不稳定，必须先稳定测试再恢复合并通道。

## 4. 违规分流处理时限（SLA）

### P0
- 定义：已影响主链路、发布或数据正确性，且有明确用户可见风险。
- 处理时限：2 小时内响应，24 小时内给出修复或回滚方案。
- 处理要求：必须立即升级给 A/E/F，优先阻断后续合并。

### P1
- 定义：高概率引发回归、门禁失败或核心功能异常，但未扩大到全量阻断。
- 处理时限：当日响应，2 个工作日内修复并补回归测试。
- 处理要求：进入当前迭代最高优先级，必要时冻结相关子任务。

### P2
- 定义：中等风险的架构债或测试缺口，不影响当天发布但会持续积累风险。
- 处理时限：3 个工作日内排期，5 个工作日内关闭或给出延期理由。
- 处理要求：写入 `docs/EXECUTION_LOG.md`，并在里程碑看板中跟踪。

### P3
- 定义：低风险、文档缺口、可维护性瑕疵或非阻断性告警。
- 处理时限：一周内评审，进入下个批次或显式放弃。
- 处理要求：不允许长期悬挂；超过一周必须升级为 P2 或关闭。

## 5. PR 检查清单（提交前必答）
1. 本次改动是否引入新的 legacy 依赖？
2. 是否存在绕过 Engine 的状态修改？
3. 是否有绕过 contracts 的隐式数据结构？
4. 页面层是否出现 direct localStorage 或业务 API 拼装？
5. 新页面是否纳入统一入口体系？
6. 对应单测/smoke 是否覆盖到边界行为？

任一项回答“是”且没有 ADR 或白名单说明，则不得合并。

## 6. 违规处理
1. 发现违规后立即按 P0-P3 分级，并在当日登记到执行日志。
2. 触发 P0/P1 时，先阻断合并，再给出修复或回滚路径。
3. 触发 P2/P3 时，必须写明负责人、截止时间和下一次复核点。
4. 修复完成后补回归测试，并更新 `docs/ROADMAP_MILESTONES.md` 和 `docs/EXECUTION_LOG.md` 中的验证状态。
