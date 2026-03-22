# [2026-03-22] Batch-WS4-02D3
- Goal:
  - complete the final `WS4-02` cut by migrating `user-profile` into unified direct-page bootstrap and reducing remaining `direct-module` to `0`
- Completed:
  1. changed [src/entries/user-profile.ts](G:\2048\2048undo\2048-next\src\entries\user-profile.ts) to `bootstrapDirectPage("user-profile", bootstrapUserProfilePage)`
  2. added [src/pages/user-profile-page.ts](G:\2048\2048undo\2048-next\src\pages\user-profile-page.ts) as the thin page shell over the existing legacy profile runtime
  3. expanded [src/entries/runtime-manifest.ts](G:\2048\2048undo\2048-next\src\entries\runtime-manifest.ts), [src/bootstrap/page-bootstrap.ts](G:\2048\2048undo\2048-next\src\bootstrap\page-bootstrap.ts), and [src/entries/home-family-shared.ts](G:\2048\2048undo\2048-next\src\entries\home-family-shared.ts) so `user-profile` is a first-class manifest-managed page
  4. upgraded [scripts/entry-manifest-audit.mjs](G:\2048\2048undo\2048-next\scripts\entry-manifest-audit.mjs) and related unit coverage to guard the new architecture
  5. added validation:
     - [tests/unit/user-profile-entry-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\user-profile-entry-bootstrap.spec.ts)
     - [tests/smoke/pages-user-profile-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-user-profile-page-system.smoke.spec.ts)
     - reused [tests/smoke/pages-user-profile-title.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-user-profile-title.smoke.spec.ts)
  6. resolved one unrelated smoke timing issue in [tests/smoke/index-ui-settings-models.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\index-ui-settings-models.smoke.spec.ts) by waiting for post-change sync to settle before sampling checkbox state
  7. A-F conclusions closed in this batch:
     - `A`: `user-profile` belongs to `profile-history-replay`, not `auth-security`
     - `B`: no need to force this migration into `core/contracts`; keep it at page/service/runtime boundary for now
     - `D/E`: no new top-level gate was needed; existing `entry-manifest + unit + smoke + verify:prepush` remained sufficient
     - `F`: page-entry closure can be signed as `stage pass`, but deeper de-legacy work remains open
- Verification Evidence:
  - command: `npx vitest run tests/unit/user-profile-entry-bootstrap.spec.ts tests/unit/runtime-manifest.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/bootstrap-page-bootstrap.spec.ts`
  - result: `29 passed`
  - command: `npm run audit:entry-manifest`
  - result: `PASS`
  - command: `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-user-profile-page-system.smoke.spec.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - result: `7 passed`
  - command: final `npm run verify:prepush`
  - result: full pass, `audit/unit/smoke/build` all green
- Risk And Blockers:
  - risk level: `P1`
  - description:
    - `src/pages/* -> ../../js/*.js` is still an intentional transitional adapter pattern and remains the next-stage debt
    - repeated local `verify:prepush` attempts still showed unrelated Playwright startup/server instability before the final successful pass
- Next Steps (1-3):
  1. start `WS4-03`: define and enforce the `legacy-runtime-import boundary` for `src/pages/*` transitional adapters
  2. keep `WS4 stage pass` under CI observation now that `direct-module = 0` has been reached
  3. continue `WS6-01A` owner-aware service-boundary work in parallel

# [2026-03-22] Batch-WS4-02D1
- 目标：
  - 冻结 `account-family` 的第一层边界，并将 `account_settings` 正式纳入 unified direct-page bootstrap。
- 完成项：
  1. 将 [account-settings.ts](G:\2048\2048undo\2048-next\src\entries\account-settings.ts) 改为 `bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage)`。
  2. 新增 [account-settings-page.ts](G:\2048\2048undo\2048-next\src\pages\account-settings-page.ts)，把 `account_settings` 页的统一页面标记下沉到 `src/pages`。
  3. 扩展 [runtime-manifest.ts](G:\2048\2048undo\2048-next\src\entries\runtime-manifest.ts) 与 [page-bootstrap.ts](G:\2048\2048undo\2048-next\src\bootstrap\page-bootstrap.ts)，引入 `pageId = "account-settings"`。
  4. 升级 [entry-manifest-audit.mjs](G:\2048\2048undo\2048-next\scripts\entry-manifest-audit.mjs)，将 `account_settings` 入口口径改为 `manifest-bootstrap`。
  5. 补充验证：
     - [account-settings-entry-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\account-settings-entry-bootstrap.spec.ts)
     - [account-settings-page-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\account-settings-page-bootstrap.spec.ts)
     - [pages-account-settings-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-account-settings-page-system.smoke.spec.ts)
     - 更新 [runtime-manifest.spec.ts](G:\2048\2048undo\2048-next\tests\unit\runtime-manifest.spec.ts)
  6. A-F 子代理收口结论：
     - `A/F`：`account-settings` 已不应再算作待迁移 direct-module；剩余应重定基线为 `register / password / user-profile` 三页；
     - `B`：`account-family` 不宜直接 contracts 化，应先拆 `auth-session storage/account service`；
     - `D/E`：当前最小门禁已够，但后续需新增独立的 `legacy-runtime-import boundary`，并为剩余三页准备 dedicated page-system smoke。
- 验证证据：
  - 命令：`npx vitest run tests/unit/account-settings-entry-bootstrap.spec.ts tests/unit/account-settings-page-bootstrap.spec.ts tests/unit/runtime-manifest.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
  - 结果：`22 passed`
  - 命令：`npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-account-settings-page-system.smoke.spec.ts tests/smoke/pages-account-settings.smoke.spec.ts`
  - 结果：`2 passed`
  - 命令：`npm run verify:prepush`
  - 结果：全链路通过，`smoke` 通过耗时约 `269.96s`
- 风险与阻塞：
  - 风险级别：P1
  - 描述：
    - 文档基线若不及时改为“剩余 3 个 direct-module”，会误导 `WS4-02D` 的阶段签收。
    - `register / password / user-profile` 仍缺统一 page-system 迁移闭环，且 `user-profile` 实际更接近 `profile-history-replay` family。
  - 缓解动作：
    - 立即对齐 `MASTER_PLAN / ROADMAP / EXECUTION_LOG` 的 direct-module 数量和 family 分类；
    - 下一批优先迁 `register + password`，再单独处理 `user-profile` 的重分类与迁移。
- 下一步（1-3条）：
  1. 启动 `WS4-02D` 第二刀：`register + password` auth-security family 迁移。
  2. 将 `user-profile` 从 auth/security 口径移出，改挂 `profile-history` 轨。
  3. 评估并落地独立的 `legacy-runtime-import boundary` 审计。
# [2026-03-22] Batch-WS4-02C
- 鐩爣锛?  - 瀹屾垚 `history + account` 鐨勯〉闈㈢郴缁熸牱鏉胯縼绉伙紝鎶?`WS4` 浠庘€滀袱涓牱鏉块〉鈥濇帹杩涘埌鈥滃姛鑳介〉 + 璐﹀彿澹抽〉鈥濅袱绫绘牱鏉块兘宸茶惤鍦般€?- 瀹屾垚椤癸細
  1. 灏?[history.ts](G:\2048\2048undo\2048-next\src\entries\history.ts) 鏀逛负 `bootstrapDirectPage("history", bootstrapHistoryPage)`锛屾柊澧?[history-page.ts](G:\2048\2048undo\2048-next\src\pages\history-page.ts)锛屽苟琛ラ綈 dedicated smoke [pages-history-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-history-page-system.smoke.spec.ts)銆?  2. 灏?[account.ts](G:\2048\2048undo\2048-next\src\entries\account.ts) 鏀逛负 `bootstrapDirectPage("account", bootstrapAccountPage)`锛屾柊澧?[account-page.ts](G:\2048\2048undo\2048-next\src\pages\account-page.ts)锛屽苟琛ラ綈 dedicated smoke [pages-account-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-account-page-system.smoke.spec.ts)銆?  3. 鍗囩骇 [entry-manifest-audit.mjs](G:\2048\2048undo\2048-next\scripts\entry-manifest-audit.mjs)锛屾寮忓皢 `history / account` 鐨勫叆鍙ｅ彛寰勬敼涓?`manifest-bootstrap`锛屽苟琛ュ厖 direct-page 鏍￠獙銆?  4. 琛ュ厖楠岃瘉锛?     - [history-entry-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\history-entry-bootstrap.spec.ts)
     - [account-entry-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\account-entry-bootstrap.spec.ts)
     - 鏇存柊 [entry-manifest-audit-helpers.spec.ts](G:\2048\2048undo\2048-next\tests\unit\entry-manifest-audit-helpers.spec.ts)
  5. A-F 瀛愪唬鐞嗘敹鍙ｇ粨璁猴細
     - `A`锛歚history = storage/contracts-first`锛宍account = services/auth-first`锛屼袱椤垫槸 `WS4-02C` 鐨勪袱绫昏縼绉绘牱鏉匡紱
     - `B`锛歚history` 鏁版嵁鍚堝悓宸茶緝鎴愮啛锛屽綋鍓嶉闄╂槸閲嶅 normalization 涓庢妸椤甸潰琛屼负濉炲叆 `core/contracts`锛?     - `D/E/F`锛氬綋鍓嶆棤闇€鏂板 gate锛屼絾瑕佷繚鐣?dedicated page-system smoke锛屼笖鏈壒鍙兘璁?`WS4-02C pass`锛屼笉鑳借 `WS4 done`銆?- 楠岃瘉璇佹嵁锛?  - 鍛戒护锛歚npx vitest run tests/unit/account-entry-bootstrap.spec.ts tests/unit/history-entry-bootstrap.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/app-bootstrap-direct-page.spec.ts`
  - 缁撴灉锛歚14 passed`
  - 鍛戒护锛歚npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-account-page-system.smoke.spec.ts tests/smoke/pages-account-login-storage.smoke.spec.ts tests/smoke/pages-history-page-system.smoke.spec.ts tests/smoke/pages-local-history-autosave.smoke.spec.ts`
  - 缁撴灉锛歚4 passed`
  - 鍛戒护锛歚npm run verify:prepush`
  - 缁撴灉锛氬叏閾捐矾閫氳繃锛宍smoke` 閫氳繃鑰楁椂绾?`269.61s`
- 椋庨櫓涓庨樆濉烇細
  - 椋庨櫓绾у埆锛歅1
  - 鎻忚堪锛?    - `history / account` 宸茶繘鍏ョ粺涓€椤甸潰绯荤粺锛屼絾 `account-settings / register / password / user-profile` 浠嶆槸鍓╀綑 `direct-module` 鍏ュ彛銆?    - 褰撳墠 `src/pages/*` 浠嶅厑璁哥洿鎺ヤ緷璧?`../../js/*.js` 浣滀负杩囨浮閫傞厤灞傦紝椤甸潰涓昏剳灏氭湭瀹屽叏浠?`js/*_page.js` 閫€鍑恒€?  - 缂撹В鍔ㄤ綔锛?    - 涓嬩竴鎵硅繘鍏?`WS4-02D`锛屽喕缁?`account-family` 鑳藉姏杈圭晫骞舵敹鍙ｅ墿浣?4 涓叆鍙ｏ紱
    - 璇勪及鏄惁鏂板鐙珛鐨?`legacy-runtime-import boundary` 瀹¤锛岄€愭闄愬埗 `src/pages/* -> ../../js/*.js`銆?- 涓嬩竴姝ワ紙1-3鏉★級锛?  1. 鍚姩 `WS4-02D`锛氬鐞?`account-settings / register / password / user-profile` 鐨?capability family 鍐崇瓥涓庤縼绉婚『搴忋€?  2. 缁х画鎺ㄨ繘 `WS6-01A`锛氭妸 `service-boundary` 鍗囩骇涓?owner-aware gate銆?  3. 瑙勫垝 `history/account` 鐨?feature/service 鎶界锛屽噺灏?`js/*_page.js` 缁х画鍏呭綋椤甸潰涓昏剳銆?# [2026-03-22] Batch-WS4-02B
- 閻╊喗鐖ｉ敍?  - 鐏?`palette` 娴?`direct-module` 鏉╀椒璐熺粭顑跨癌娑擃亞绮烘稉鈧?bootstrap 閺嶉攱婢樻い纰夌礉楠炴儼顔€閸忋儱褰涚€孤ゎ吀娑撳酣銆夐棃銏㈤兇缂?smoke 濮濓絽绱￠幍鑳吇鐠囥儴绺肩粔姹団偓?- 鐎瑰本鍨氭い鐧哥窗
  1. 鐏?[palette.ts](G:\2048\2048undo\2048-next\src\entries\palette.ts) 閺€閫涜礋 `bootstrapDirectPage("palette", bootstrapPalettePage)`閿涘奔绗夐崘宥囨暠閸忋儱褰涢惄瀛樺复閹佃儻娴囨い鐢告桨閼存碍婀伴幏鑹邦棅閵?  2. 閺傛澘顤?[palette-page.ts](G:\2048\2048undo\2048-next\src\pages\palette-page.ts)閿涘本濡?`palette` 妞ょ數娈?page host閵嗕巩18n copy 閸滃奔瀵屾０妯款啎缂冾喛顥婇柊宥勭瑓濞屽鍩?`src/pages`閵?  3. 閸楀洨楠?[entry-manifest-audit.mjs](G:\2048\2048undo\2048-next\scripts\entry-manifest-audit.mjs)閿涘苯鐨?`palette` 閸欙絽绶炴禒?`direct-module` 閺€閫涜礋 `manifest-bootstrap`閿涘苯鑻熺悰銉ょ瑐 direct-page 閸忋儱褰涢弽锟犵崣娑?legacy import 闂冪粯鏌囬妴?  4. 鐞涖儱鍘栨宀冪槈閿?     - [palette-entry-bootstrap.spec.ts](G:\2048\2048undo\2048-next\tests\unit\palette-entry-bootstrap.spec.ts)
     - [pages-palette-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-palette-page-system.smoke.spec.ts)
     - 閺囧瓨鏌?[entry-manifest-audit-helpers.spec.ts](G:\2048\2048undo\2048-next\tests\unit\entry-manifest-audit-helpers.spec.ts)
  5. 缂佹挸鎮?A-F 鐎涙劒鍞悶鍡欑波鐠佸搫鐣幋鎰暪閸欙綇绱?     - `A/F` 绾喛顓?`palette` 閺勵垳顑囨禍灞奸嚋閺堝鏅ユい鐢告桨缁崵绮洪弽閿嬫緲閿?     - `B` 绾喛顓婚張顒佸娑撳秷袝绾?`core/contracts`閿涘奔瀵岀憰渚€顥撻梽鈺€绮涢崷?bootstrap/UI 濡亜鍨忔笟婵婄閿?     - `D/E` 绾喛顓婚張顒佸閺冪娀娓堕弬鏉款杻 CI job閿涘苯褰ч棁鈧拋?`entry-manifest-audit` 娑撳海骞囬悩鏈电閼锋番鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/palette-entry-bootstrap.spec.ts tests/unit/app-bootstrap-direct-page.spec.ts`
  - 缂佹挻鐏夐敍姝?3 passed`
  - 閸涙垝鎶ら敍姝歯pm run audit:entry-manifest`
  - 缂佹挻鐏夐敍姝歅ASS`
  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-palette-page-system.smoke.spec.ts tests/smoke/index-ui-settings-models.smoke.spec.ts -g palette`
  - 缂佹挻鐏夐敍姝? passed`
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姘弿闁炬崘鐭鹃柅姘崇箖閿涘畭smoke` 闁俺绻冮懓妤佹缁?`249.54s`
- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍?    - `palette` 瀹稿弶鐗遍弶鍨閿涘奔绲?`history / account` 娴犲秵婀潻浣稿弳缂佺喍绔存い鐢告桨缁崵绮洪敍瀛窼4 娴犲秵妲搁崣宀冨缓閵?    - 瑜版挸澧?page-system 閺嶉攱婢樻禒宥呭帒鐠?`src/pages/*` 閻╁瓨甯村鏇炲弳 `../../js/*.js` 鏉╂劘顢戦弮璁圭礉鏉╂瑦妲告稉鈧粔宥呭綀閹貉嗙箖濞撯剝鈧緤绱濇稉宥嗘Ц閺堚偓缂佸牐绔熼悾灞烩偓?  - 缂傛捁袙閸斻劋缍旈敍?    - 娑撳绔撮幍閫涚喘閸忓牊甯规潻?`history`閿涘苯鍟€婢跺嫮鎮?`account-family`閿?    - 婵″倿娓剁紒褏鐢婚幎顒勭彯缁俱垻鍤庨敍灞藉礋閻欘剙缂撶粩?`legacy-runtime-import boundary` 鐎孤ゎ吀閿涘矁鈧奔绗夐弰顖涜穿閸?`service-boundary`閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?  1. 閸氼垰濮?`WS4-02C`閿涙俺绺肩粔?`history + account`閿涘矁顔€妞ょ敻娼扮化鑽ょ埠閼峰啿鐨憰鍡欐磰娑撯偓娑擃亜濮涢懗浠嬨€夐崪灞肩娑擃亣澶勯崣宄帮紦妞ょ偣鈧?  2. 鐠囧嫪鍙婇獮鎯邦啎鐠?`src/pages/* -> ../../js/*.js` 閻ㄥ嫯绻冨〒锟犫偓鈧崙楦跨熅瀵板嫸绱濋崘鍐茬暰閺勵垰鎯侀弬鏉款杻閻欘剛鐝涙潏鍦櫕鐎孤ゎ吀閵?  3. 缂佈呯敾缁鳖垵顓?`WS6-01` 娑撹鍨庨弨顖溓旂€规碍鈧嗙槈閹诡噯绱濋崙鍡楊槵闂冭埖顔岄幀?sign-off閵?# [2026-03-22] Batch-WS4-02A
- 閻╊喗鐖ｉ敍?  - 鐏?`modes` 娴?`direct-module` 鏉╀椒璐熺粭顑跨娑擃亞绮烘稉鈧?bootstrap 閺嶉攱婢樻い纰夌礉妤犲矁鐦?`app/pages` 妤犮劍鐏︽稉宥嗘Ц缁岃櫣娲拌ぐ鏇樷偓?- 鐎瑰本鍨氭い鐧哥窗
  1. 閺傛澘顤?[bootstrap-direct-page.ts](G:\2048\2048undo\2048-next\src\app\bootstrap-direct-page.ts)閿涘苯鑸伴幋鎰版姜濞撳憡鍨欐い鐢垫畱缂佺喍绔?bootstrap 濡剝婢橀妴?  2. 閺傛澘顤?[modes-page.ts](G:\2048\2048undo\2048-next\src\pages\modes-page.ts)閿涘矁顔€ `modes` 閹存劒璐熺粭顑跨娑擃亞婀＄€圭偞绉风拹?`app/pages` 妤犮劍鐏﹂惃鍕€夐棃顫偓?  3. 鐏?[modes.ts](G:\2048\2048undo\2048-next\src\entries\modes.ts) 娴?direct import 閺冄嗗壖閺堫剚鏁兼稉?`bootstrapDirectPage("modes", bootstrapModesPage)`閵?  4. 閸楀洨楠?[entry-manifest-audit.mjs](G:\2048\2048undo\2048-next\scripts\entry-manifest-audit.mjs)閿涘奔濞囬崗鎯扮槕閸?`bootstrapDirectPage`閿涘苯鑻熼幎?`modes` 閻ㄥ嫭鐏﹂弸鍕經瀵板嫭鏁兼稉?`manifest-bootstrap`閵?  5. 閺傛澘顤?unit 娑?smoke閿?     - [app-bootstrap-direct-page.spec.ts](G:\2048\2048undo\2048-next\tests\unit\app-bootstrap-direct-page.spec.ts)
     - [pages-modes-page-system.smoke.spec.ts](G:\2048\2048undo\2048-next\tests\smoke\pages-modes-page-system.smoke.spec.ts)
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/app-bootstrap-direct-page.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/bootstrap-page-bootstrap.spec.ts`
  - 缂佹挻鐏夐敍姝?6 passed`
  - 閸涙垝鎶ら敍姝歯pm run audit:entry-manifest`
  - 缂佹挻鐏夐敍姝歅ASS`
  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-modes-page-system.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝? passed`
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姘弿闁炬崘鐭鹃柅姘崇箖閿涘畭smoke` 闁俺绻冮懓妤佹缁?`267s`
- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍?    - `modes` 瀹稿弶鐗遍弶鍨閿涘奔绲?`palette / history / account` 娴犲秵婀捄鐔荤箻閿涘矂銆夐棃銏㈤兇缂佺喐娈忛弮鏈电矝閺勵垰寮绘潪銊ｂ偓?    - `entry-manifest-audit` 瀹歌尪鍏樼拠鍡楀焼閺傛壆娈?direct-page bootstrap閿涘奔绲?`runtime-manifest` 娑撳酣銆夐棃銏㈤兇缂佺喓婀″┃鎰矝閺堫亜鐣崗銊ユ値娑撯偓閵?  - 缂傛捁袙閸斻劋缍旈敍?    - 娑撳绔撮幍鍦纯閹恒儱顦查崚鎯邦嚉閺嶉攱婢橀崚?`palette`閿?    - 闂呭繐鎮楅幒銊ㄧ箻 `history + account`閿涘矂浼╅崗?`modes` 閹存劒璐熼崡鏇犲仯閺嶈渹绶ラ懓灞肩瑝閺勵垵绺肩粔鏄忕熅瀵板嫨鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?  1. 閸氼垰濮?`WS4-02B`閿涙俺绺肩粔?`palette`閿涘苯缂撶粩?`page host + feature host + i18n` 濡剝婢橀妴?  2. 閸氼垰濮?`WS6-01A`閿涙艾鐨?`service-boundary` 娴?syntax-level 閸楀洨楠囨稉?owner-aware gate閵?  3. 閸氼垰濮?`CI-GATE-01`閿涙俺顔€ deploy 娓氭繆绂嗙€瑰本鏆?`verify:refactor:ci`閵?

# [2026-03-22] Batch-AF-Sync-01
- 閻╊喗鐖ｉ敍?  - 娴ｈ法鏁?A-F 閸忣厺閲滅憴鎺曞鐎?4 娴犳垝瀵岄弬鍥ㄣ€傞崑姘濞嗏€虫倱濮濄儴顥嗛崘绛圭礉閸嬫粍顒涢垾婊勬＋閸╄櫣鍤庨妴浣规＋閸欙絽绶為妴浣规＋娴兼ê鍘涚痪褉鈧繄鎴风紒顓熺磽缁夋眹鈧?- 鐎瑰本鍨氭い鐧哥窗
  1. 閺€鑸垫殐 `A` 缂佹捁顔戦敍姘秼閸撳秳瀵岄梼璇差敚瀹告彃鍨忛幑顫礋 `M2/M3` 闂傤厾骞嗛妴涔4` 妞ょ敻娼版潻浣盒╅崘宕囩摜閵嗕梗M5` 閺冄冿紦闁偓閸︾尨绱濋懓灞肩瑝閺勵垳鎴风紒顓㈠櫢婢跺秵妫崺铏瑰殠閻╂鍋ｉ妴?  2. 閺€鑸垫殐 `B` 缂佹捁顔戦敍姝歝reateEngineSession()` 鐏忔碍婀幒銉ь吀娑撳鎽肩捄顖ょ礉`window.game_manager` 娴犲秵妲告潻鎰攽閻滄澘鐤勯敍娑欐煀婢?`B-ENG-01 / B-CONTRACT-01 / B-COMP-01` 娴ｆ粈璐熼弽绋跨妇娑撹崵鍤庨妴?  3. 閺€鑸垫殐 `C` 缂佹捁顔戦敍姘躲€夐棃銏㈤兇缂佺喓宸遍崣锝勭瑝閺勵垪鈧粌鍙嗛崣锝嗙础閻╂鍋ｉ垾婵撶礉閼板本妲哥紓?`src/app / src/pages / src/features / src/ui` 鐎圭偘缍嬫銊︾仸閿涙稑鍑￠崷銊ょ波鎼存捁鎯ら張鈧亸蹇涱€囬弸鑸垫瀮娴犺翰鈧?  4. 閺€鑸垫殐 `D` 缂佹捁顔戦敍姝歴ervice-boundary` 瑜版挸澧犳禒宥呬焊 syntax-level閿涘畳eploy 娴犲秵婀涵顒傜拨鐎规艾鐣弫纾嬪窛闁插繘妫粋浣碘偓?  5. 閺€鑸垫殐 `E` 缂佹捁顔戦敍姘舵付鐟曚焦妯夊蹇撶紦缁?`CI blocking topology` 娑?`flake ledger`閿涘本濡?deploy 閺€鎹愵攽妞嬪酣娅撻崪?smoke flake 閸掕泛瀹抽崠鏍モ偓?  6. 閺€鑸垫殐 `F` 缂佹捁顔戦敍姝歐S6` 閹恒儴绻庨梼鑸殿唽閹?pass閿涘奔绲炬潻妯圭瑝閼冲€燁唶 `done`閿涙矖WS4` 娴犲秵婀潏鎯у煂娴溠冩惂閸栨牠銆夐棃銏㈤兇缂佺喐鐖ｉ崙鍡愨偓?  7. 瀹告彃鎮撳銉︽纯閺傚府绱?     - `docs/PLATFORM_REFACTOR_MASTER_PLAN.md`
     - `docs/ARCHITECTURE_GUARDRAILS.md`
     - `docs/ROADMAP_MILESTONES.md`
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姘眽瀹搞儲鏆ｉ崥?6 娑?subagent 鏉堟挸鍤?  - 缂佹挻鐏夐敍娆?B/C/D/E/F 閻ㄥ嫰妯佸▓闈涘灲閺傤厼鍑¤ぐ銏″灇閸楁洑绔存导妯哄帥缁狙囥€庢惔蹇ョ窗
    1. `M2/M3`
    2. `M4`
    3. `M5`
    4. `M6`
- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍?    - 瑜版挸澧?4 娴犺姤鏋冨锝勭瑓閺傞€涚矝娣囨繄鏆€閺冄冨敶鐎归€涚瑢閺冄呯埠鐠佲槄绱濋惌顓熸埂閸愬懍绱版稉搴㈡拱閹佃顐奸弬鏉款杻妞よ泛鐪扮憗浣稿枀楠炶泛鐡ㄩ妴?    - `ARCHITECTURE_GUARDRAILS.md` 娑撳酣鍎撮崚鍡楀坊閸欏弶鏋冨锝勭矝鐎涙ê婀紓鏍垳閸欘垵顕伴幀褔妫舵０妯糕偓?  - 缂傛捁袙閸斻劋缍旈敍?    - 娴犮儲婀伴幍瑙勵偧閺傛澘顤冩い璺虹湴 section 娑撳搫缍嬮崜?authoritative section閿?    - 娑撳绔撮幍閫涚喘閸忓牆浠涙稉缁樻瀮濡楋絽鍙忛弬鍥ㄦ暪缂傛牔绗岀紓鏍垳缂佺喍绔撮敍宀冣偓灞肩瑝閺勵垳鎴风紒顓炲綌閸旂娀娴傞弫锝埶夋稉浣碘偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?  1. 閸氼垰濮?`WS4-02A`閿涙艾鍘涢崑?`modes` 妞ょ敻娼扮化鑽ょ埠閺嶉攱婢樻潻浣盒╅妴?  2. 閸氼垰濮?`WS6-01A + CI-GATE-01`閿涙艾宸遍崠?owner-aware `service-boundary` 楠炶埖濡?deploy 缂佹垵鐣鹃崚鏉跨暚閺佹挳妫粋浣碘偓?  3. 閸氼垰濮?`B-ENG-01` 閹峰棜袙閿涙碍濡搁崬顖欑 Engine 娴兼俺鐦介幒銉ь吀娴犺濮熼崚鍡楀煂閺傚洣娆㈢痪褋鈧?

# 闁插秵鐎幍褑顢戦弮銉ョ箶閿涘牊绮撮崝顭掔礆

> 閻劑鈧棑绱扮拋鏉跨秿濮ｅ繗鐤嗛幒銊ㄧ箻閻ㄥ嫧鈧粌濮╂担?鐠囦焦宓?妞嬪酣娅?娑撳绔村銉⑩偓婵撶礉娣囨繆鐦夐幒銊ㄧ箻閸欘垵鎷峰┃顖樷偓? 
> 鐠佹澘缍嶉崢鐔峰灟閿涙艾鐨幍瑙勵偧閵嗕礁褰叉宀冪槈閵嗕礁褰查崶鐐寸泊閵? 
> 閹恒劏宕樻０鎴犲芳閿涙碍鐦℃稉顏呭腹鏉╂稒澹掑▎锛勭波閺夌喎鎮楅弴瀛樻煀娑撯偓濞喡扳偓?
## 閺冦儱绻斿Ο鈩冩緲

```md
## [YYYY-MM-DD] Batch-XX
- 閻╊喗鐖ｉ敍?- 鐎瑰本鍨氭い鐧哥窗
  1.
  2.
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍?  - 缂佹挻鐏夐敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍鍦?/P1/P2/P3閿涘绱?  - 閹诲繗鍫敍?  - 缂傛捁袙閸斻劋缍旈敍?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?  1.
  2.
```

---

## [2026-03-21] Batch-Init
- 閻╊喗鐖ｉ敍姘紦缁斿閽╅崣鏉垮闁插秵鐎惃鍕埠娑撯偓閹恒劏绻橀弬鍥ㄣ€傛担鎾堕兇閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閺傛澘缂撻幀缁樺腹鏉╂稒鏋冨锝忕窗`PLATFORM_REFACTOR_MASTER_PLAN.md`閵?2. 閺傛澘缂撻弸鑸电€痪銏㈠殠閺傚洦銆傞敍姝欰RCHITECTURE_GUARDRAILS.md`閵?3. 閺傛澘缂撻柌宀€鈻肩喊鎴犳箙閺夊尅绱癭ROADMAP_MILESTONES.md`閵?4. 瀵よ櫣鐝涢張顒佹）韫囨膩閺夊灝鑻熼崚婵嗩潗閸栨牠顩婚弶陇顔囪ぐ鏇樷偓?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歡it status --short`
  - 缂佹挻鐏夐敍姘瑐鏉?4 娑擃亝鏋冨锝嗘煀婢х偛褰茬憴浣碘偓?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秮鈧粌鐔€缁炬寧鏆熼崐灏栤偓婵呯矝娑撳搫绶熺悰銉ョ秿閿涘苯鐨婚張顏勮埌閹存劘鍤滈崝銊ュ韫囶偆鍙庨妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃顐兼导妯哄帥鐞涖儵缍堥崺铏瑰殠閹殿偅寮块崨鎴掓姢娑撳孩鏆熼崐鑹版儰鐞涖劊鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 鐞涖儱缍嶉幀缁樺腹鏉╂稒鏋冨锝囶儑 3 閼哄倸鐔€缁炬寧鏆熼幑顕嗙礄閼存碍婀伴崠鏍櫚闂嗗棴绱氶妴?2. 缂佹瑩鍣风粙瀣暥閻婢樻禒璇插閸掑棝鍘ょ拹鐔荤煑娴滆桨绗岄弮銉︽埂閵?3. 娴?M1 娑撹櫣娲伴弽鍥у帥閽€钘夋勾閳ユ粓妲婚崶鐐寸ウ闂傘劎顩﹂垾婵勨偓?
## [2026-03-21] Batch-Start
- 閻╊喗鐖ｉ敍姘紦缁?A-F 閸忣厺閲滅€涙劒鍞悶鍡楄嫙鐞涘苯宕楁担婊勬簚閸掕绱濋崥灞炬閸氼垰濮╅獮鍐插酱娑撳孩婀囬崝掳鈧線銆夐棃顫偓浣圭壋韫囧啨鈧浇宸濋柌蹇嬧偓浣烽獓閸濅胶娈戦崚鍡椾紣閹恒劏绻橀妴?- 鐎瑰本鍨氭い鐧哥窗
1. 瀹告彃缂撶粩?A-F 鐟欐帟澹婇獮鎯邦攽閺堝搫鍩楅敍宀冧捍鐠愶絽鍨庨崚顐ヮ洬閻╂牗鐏﹂弸鍕┾偓浣圭壋韫囧啫鐤勯悳鑸偓渚€銆夐棃銏犵杽閻滆埇鈧礁閽╅崣鐗堟箛閸斅扳偓浣藉窛闁插繘妫粋浣碘偓浣烽獓閸濅線鐛欓弨韬测偓?2. 閺堫剝鐤嗛獮鎯邦攽娴犺濮熼惄顔界垼瀹稿弶妲戠涵顕嗙窗閸ュ绮崶娑楀敜閹恒劏绻橀弬鍥ㄣ€傜€瑰本鍨氶懕宀冪煑鐎靛綊缍堥妴浣锋崲閸斺剝濯堕崚鍡曠瑢鐠囦焦宓侀梻顓犲箚閵?3. 瑜版挸澧犲銉ょ稊閸樼喎鍨鑼€樼拋銈忕窗娑撳秴顒濈粩瀣紣娴ｆ粣绱濇稉宥呮礀闁偓娴犳牔姹夐弨鐟板З閿涘苯褰傞悳鏉垮暱缁愪礁鍘涢崡蹇氱殶閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歡it -C G:\2048\2048undo\2048-next status --short --branch`
  - 缂佹挻鐏夐敍姘秼閸撳秴鍨庨弨顖欒礋 `main...origin/main`閿涘奔绗栨禒鍛摠閸?`docs/` 娑撳绶熼幓鎰唉閻ㄥ嫭鏋冨锝嗘煀婢х偤銆嶉妴?  - 閸涙垝鎶ら敍姝欸et-Content docs/EXECUTION_LOG.md -TotalCount 120`
  - 缂佹挻鐏夐敍姘嚒绾喛顓?Batch-Init 缂佹挻鐎稉搴㈡拱濞嗏剝鏌婃晶鐐存）韫囨鐗稿蹇庣閼锋番鈧?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘嫙鐞涘本甯规潻娑楃窗鐢附娼甸弬鍥ㄣ€傞弴瀛樻煀娑撳簼鍞惍浣稿綁閺囧娈戞禍銈呭级閸愯尙鐛婇敍灞芥尐閸忚埖妲?`docs/ROADMAP_MILESTONES.md` 娑撳骸閽╅崣?妞ょ敻娼伴弨褰掆偓鐘叉倱閺冭埖甯规潻娑欐閵?  - 缂傛捁袙閸斻劋缍旈敍姘槨娑擃亙鍞悶鍡楀涧閺囧瓨鏌婇懛顏勭箒閻ㄥ嫪瀵岀拹锝嗘瀮濡楋綇绱濇禒锝囩垳閺€鐟板З閹稿鎹㈤崝鈥冲瀼閻楀洦甯规潻娑崇礉閸忓牐顕伴崥搴㈡暭閿涘苯鍟跨粣浣稿祮閺冭泛宕楃拫鍐︹偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹稿瀵屾禒锝囨倞閸掑棝鍘ら敍灞藉瀻閸掝偂璐熼崶娑楀敜閺傚洦銆傜悰銉╃秷鐠愮喕鐭楁禍鎭掆偓浣哄Ц閹礁鎷伴柌宀€鈻肩喊鎴濈摟濞堢偣鈧?2. 閻?D 缂佈呯敾缂佸瓨濮?`EXECUTION_LOG.md` 閻ㄥ嫭澹掑▎陇顔囪ぐ鏇″Ν婵傚繈鈧?3. 鐏忓棙婀版潪顔艰嫙鐞涘奔鎹㈤崝鈩冨閹存劕褰查幍褑顢戦惃鍕付鐏忓繑澹掑▎鈽呯礉楠炴湹璐熷В蹇斿濞嗭紕绮︾€规岸鐛欑拠浣告嚒娴犮們鈧?
## [2026-03-21] Batch-Scan-01
- 閻╊喗鐖ｉ敍姘暚閹存劙顩绘潪顔界仸閺嬪嫮娲忛悙鐟拌嫙閹跺﹦绮ㄩ弸婊冩礀婵夘偄鍩屾稉缁樻瀮濡楋絼绗岄惇瀣緲閵?- 鐎瑰本鍨氭い鐧哥窗
1. 鐎瑰本鍨氭稉鑽ゅ殠缁嬪鐔€缁炬寧澹傞幓蹇ョ窗閸忋儱褰涢幀濠氬櫤閵嗕梗localStorage/fetch` 閻愰€涚秴閵嗕勾egacy 濞堝鏆€閵?2. 閺€璺哄煂 B 閹躲儱鎲￠敍姘辩搏鏉?Engine 閻ㄥ嫮鏋掓导鑲╁Ц閹礁鍟撻崗銉у仯閸?22 婢跺嫸绱濋獮鍓佺舶閸?Top10 妞嬪酣娅撻悙骞库偓?3. 閺€璺哄煂 C 閹躲儱鎲￠敍姘暚閹存劙銆夐棃銏＄閸楁洜娲忛悙鐧哥礉鐠囧棗鍩?4 娑擃亜閽╅崣鏉垮敶闂堢偟绮烘稉鈧崗銉ュ經妞ょ敻娼伴妴?4. 瀹告彃鐨㈤崺铏瑰殠娑撳海娲忛悙鍦波閺嬫粌娲栨繅顐㈠煂 `PLATFORM_REFACTOR_MASTER_PLAN.md` 娑?`ROADMAP_MILESTONES.md`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歡it ls-files "*.html"` / `git ls-files "src/entries/*.ts"`
  - 缂佹挻鐏夐敍姝?7 html` / `22 entry ts`閵?  - 閸涙垝鎶ら敍姝歋elect-String "localStorage\\." src js` 娑?`Select-String "fetch\\(" src js`
  - 缂佹挻鐏夐敍姝歴rc/entries` 娑?`2/0`閿涘畭src+js` 娑?`50/7`閵?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘瘜閸忋儱褰涙禒宥嗘箒 legacy 濞堝鏆€閿涘奔绗栭弽绋跨妇閻樿埖鈧礁鍟撻崗銉у仯閸掑棙鏆庨崷?runtime helper 娑擃厹鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瘻 WS1/WS2 閸忓牆浠涢垾婊冨弳閸欙絾鏁归崣?+ 閺嶇绺鹃崘娆忓弳閺€璺哄經閳ユ繐绱濋崘宥嗗腹鏉?contracts 娑撳酣銆夐棃銏犵秺楠炶翰鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閸氼垰濮?WS1-02閿涙碍濡?legacy 閸ョ偞绁﹂梻銊ь洣缂佸棗瀵查幋鎰讲閹笛嗩攽濡偓閺屻儱鑻熼幒銉ュ弳 CI閵?2. 閸氼垰濮?WS2-02閿涙艾鍘涙径鍕倞 move/undo/replay 閻?Engine 缂佺喍绔撮崗銉ュ經閺€褰掆偓鐘偓?3. 閸氼垰濮?WS4-02閿涙艾顕?4 娑擃亪娼紒鐔剁閸忋儱褰涙い鐢告桨缂佹瑥鍤痪宕囶吀鐠侯垰绶炴稉搴ょ讣缁夌粯澹掑▎掳鈧?
## [2026-03-21] Batch-Gate-01
- 閻╊喗鐖ｉ敍姘暚閹?WS1-02閿涘本濡?legacy 閸ョ偞绁﹂梻銊ь洣閸ュ搫瀵查崚?refactor gate閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閺傛澘顤?`scripts/legacy-boundary-audit.mjs`閿涘苯顕?`src/entries` 閸?legacy-loader 鐎电厧鍙嗘稉搴ょ殶閻劏绔熼悾灞筋吀鐠伮扳偓?2. 鐏?`legacy-boundary-audit` 閹恒儱鍙?`scripts/refactor-gate.mjs` 閻ㄥ嫬宸遍崚鑸殿劄妤犮倓绗?timeout 閺勭姴鐨犻妴?3. 閺囧瓨鏌?`scripts/refactor-timeout-env-keys.mjs`閿涘本鏁幐?`legacy-boundary-audit` 閻ㄥ嫰顣╃粻妤冨箚婢у啫褰夐柌蹇旀Ё鐏忓嫨鈧?4. 閺傛澘顤?閺囧瓨鏌婇崡鏇熺ゴ閿涙瓪legacy-boundary-audit-helpers.spec.ts`閵嗕梗refactor-timeout-env-keys.spec.ts`閵嗕梗release-readiness-check-helpers.spec.ts`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯ode scripts/legacy-boundary-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS閿涘潉importers=1, callsites=1`閿涘鈧?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘畭legacy-boundary-audit` 瀹歌尙鎾奸崗?`verify:refactor:ci` 閸ュ搫鐣惧ù浣衡柤楠炲爼鈧俺绻冮妴?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秹妫粋浣稿嚒闂勬劕鍩?legacy-loader 鏉堝湱鏅敍灞肩稻 Engine/contracts 閻ㄥ嫮绮潻鍥╁仯鐏忔碍婀崗銊╁劥閺€璺哄經閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃顐奸懕姘卞妽 WS2-02 娑?WS3-01閿涘本瀵滈垾婊堢彯妞嬪酣娅撻崘娆忓弳閻?-> contracts 鐟曞棛娲婇惌鈺呮█閳ユ繃甯规潻娑栤偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS2-02閿涙艾顕?`move/undo/replay` 閸忓牆浠涚紒鐔剁閸忋儱褰涚亸浣筋棅閵?2. 閹恒劏绻?WS3-01閿涙艾缂撶粩?contracts 鐟曞棛娲婇惌鈺呮█楠炴儼藟閺堚偓鐏忓繑鏌囩懛鈧妴?3. 閹恒劏绻?WS4-02閿涙碍澧界悰?4 娑擃亪娼紒鐔剁閸忋儱褰涙い鐢告桨閻ㄥ嫮鎾肩粻鈩冩煙濡楀牄鈧?
## [2026-03-21] Batch-WS2-01
- 閻╊喗鐖ｉ敍姘腹鏉?WS2-02 妫ｆ牗澹掗弨褰掆偓鐙呯礉閸忓牊鏁归崣?`move/undo/replay` 閻ㄥ嫭鐗宠箛鍐Ц閹礁鍟撻崗銉ュ弳閸欙絻鈧?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`core_game_manager_runtime_call_helpers_runtime.js` 閺傛澘顤冪紒鐔剁閸愭瑥鍙?helper閿涘潉score/grid/undoStack/replayIndex`閿涘鈧?2. 閸?`core_game_manager_bindings_runtime.js` 閺嗘挳婀剁€电懓绨?Runtime 閸愭瑥鍙嗛弬瑙勭《閿涘瞼绮烘稉鈧禒?manager 閸樼喎鐎风拫鍐暏閵?3. 閸?`move/undo/replay` 娑撳娼柧鎹愮熅閺囨寧宕查崗鎶芥暛閻╁瓨甯寸挧瀣偓闂磋礋缂佺喍绔撮崘娆忓弳閸忋儱褰涢敍灞借嫙娣囨繄鏆€ fallback 闁槒绶穱婵婄槈閸忕厧顔愰妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潊udit/unit/smoke/build 閸忋劑鈧俺绻冮敍灞藉瘶閸?`legacy-boundary-audit`閿涘鈧?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秵鏁归崣锝堫洬閻╂牔绨℃＃鏍ㄥ妤傛﹢顣堕崘娆戝仯閿涘奔绲?`restart/saved-state/import/export` 娴犲秴鐡ㄩ崷銊︽弓閺€璺哄經閻樿埖鈧礁鍟撻崗銉ｂ偓?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃顐肩紒褏鐢婚幐澶愵棑闂勨晠銆庢惔蹇斿腹鏉?`restart/saved-state`閿涘苯鑻熺悰?contracts 鐟曞棛娲婇惌鈺呮█閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹笛嗩攽 WS2-02 缁楊兛绨╅幍鐧哥窗閺€璺哄經 `restart/saved-state` 閻樿埖鈧礁鍟撻崗銉ュ弳閸欙絻鈧?2. 閹笛嗩攽 WS3-01閿涙俺藟姒绘劕顕惔?contracts 閺勭姴鐨犳稉搴㈡焽鐟封偓閵?3. 鐏忓棙鏁归崣锝堫潐閸掓瑨藟閸忓懎鍩岀拹銊╁櫤闂傘劎顩﹂弬顓♀枅娑擃叏绱濋梼鍙夘剾閸ョ偞绁﹂妴?
## [2026-03-21] Batch-WS2-02
- 閻╊喗鐖ｉ敍姘暚閹?WS2-02 缁楊兛绨╅幍瑙勬暭闁媴绱濋弨璺哄經 `restart/saved-state/session-init` 閻ㄥ嫮濮搁幀浣稿晸閸忋儱鍙嗛崣锝冣偓?- 鐎瑰本鍨氭い鐧哥窗
1. 娑?runtime helper 婢х偛濮?`setRuntimeGrid` 娑?`setRuntimeRedoStack`閵?2. 閸?`restart_setup` 娑擃厽濡?`grid/score/undoStack/redoStack/replayIndex` 閻ㄥ嫬鍙ч柨顔炬纯閹恒儱鍟撻崗銉︽暭娑撹櫣绮烘稉鈧崗銉ュ經閵?3. 閸?`saved_state` 娑擃厽濡?`setBoardFromMatrix`閵嗕梗base/replay state` 閻?`grid/score/undoStack/redoStack` 閺€閫涜礋缂佺喍绔撮崗銉ュ經閵?4. 閸?`session_init` 娑擃厽濡?`undoStack/redoStack` 閸掓繂顫愰崠鏍ㄦ暭娑撹櫣绮烘稉鈧崗銉ュ經閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潊udit/unit/smoke/build 閸忋劑鈧俺绻冮敍澶堚偓?  - 閸涙垝鎶ら敍姘嚠 `restart_setup/saved_state/session_init` 閹殿偅寮?`grid/score/undoStack/redoStack/replayIndex` 閻╁瓨甯撮崘娆忓弳
  - 缂佹挻鐏夐敍姘辨窗閺嶅洦鏋冩禒璺哄敶閸忔娊鏁惄瀛樺复閸愭瑥鍙嗗鍙夌闂嗚翰鈧?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歩mport/export` 闁炬崘鐭炬禒宥嗘箒闁劌鍨庨悩鑸碘偓浣稿晸閸忋儰绗岄崡蹇氼唴閼帮箑鎮庨敍灞界毣閺堫亜鐣崗銊х埠娑撯偓閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃顐奸懕姘卞妽 `WS2-02` 閺€璺虹啲 + `WS3-01` contracts 鐟曞棛娲婇惌鈺呮█閼辨柨濮╅妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS2-02 閺€璺虹啲閿涙艾顦╅悶?import/export 闁炬崘鐭鹃崜鈺€缍戦崘娆戝仯閵?2. 閹恒劏绻?WS3-01閿涙艾缂撶粩?contracts 鐟曞棛娲婇惌鈺呮█楠炴儼藟閺堚偓鐏忓繑鏌囩懛鈧妴?3. 鐠囧嫪鍙婄亸鍡忊偓婊呭Ц閹礁鍟撻崗銉ョ箑妞ゆ槒铔?runtime helper閳ユ繄鎾奸崗銉ヮ吀鐠伮ゅ壖閺堫兙鈧?
## [2026-03-21] Batch-WS2-03
- 閻╊喗鐖ｉ敍姘暚閹?WS2-02 閺€璺虹啲閿涘瞼绮烘稉鈧?import/export 闁炬崘鐭鹃崗鎶芥暛閻樿埖鈧礁鍟撻崗銉ュ經閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`js/core_game_manager_runtime_call_helpers_runtime.js` 閺傛澘顤冪紒鐔剁閸愭瑥鍙嗛崣锝忕窗`setRuntimeReplayMoves`閵嗕梗setRuntimeReplaySpawns`閵嗕梗setRuntimeReplayMovesV2`閵嗕梗setRuntimeUndoEnabled`閵嗕梗setRuntimeDisableSessionSync`閵嗕梗setRuntimeReplayDelay`閵?2. 閸?`js/core_game_manager_bindings_runtime.js` 閺嗘挳婀舵禒銉ょ瑐閸愭瑥鍙嗛崣锝呭煂 `GameManager` 閸樼喎鐎烽敍灞肩箽鐠囦浇绻嶇悰灞炬缂佺喍绔寸拫鍐暏閵?3. 閸?`js/core_game_manager_replay_helpers_runtime.js` 鐏?import/export 閸忔娊鏁惄瀛樺复鐠у鈧吋鏁兼稉铏圭埠娑撯偓閸愭瑥鍙嗛崣锝忕礄`replayMoves/replaySpawns/replayMovesV2/undoEnabled/disableSessionSync/replayDelay`閿涘鈧?4. 娣囨繄鏆€ fallback 鐠囶厺绠熼敍宀€鈥樻穱婵婎攽娑撹桨绗夐崶鐐茬秺閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘拱閹电懓鐣幋鎰啊 import/export 閸愭瑥鍙嗛崣锝嗘暪閸欙綇绱濇担鍡忊偓婊冨晸閸忋儱褰涜箛鍛淬€忕紒?runtime helper閳ユ繄娈戠憴鍕灟鐏忔碍婀痪鍐插弳閼奉亜濮╃€孤ゎ吀閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涚喘閸忓牐藟姒?WS8-01 鐎孤ゎ吀閺傤叀鈻堟稉?WS3-01 contracts 鐟曞棛娲婇惌鈺呮█閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-01閿涙艾缂撶粩?replay/import/export 鐎涙顔岄惃?contracts 閺勭姴鐨犻惌鈺呮█娑撳孩娓剁亸蹇旀焽鐟封偓閵?2. 閹恒劏绻?WS8-01閿涙碍鏌婃晶鐐┾偓婊冨彠闁款喚濮搁幀浣稿晸閸忋儰绗夊妤冪搏鏉?runtime helper閳ユ繄娈戠€孤ゎ吀鐟欏嫬鍨妴?3. 鐎电澶勯崣?閸樺棗褰?閸ョ偞鏂佹稉濠氭懠鐠侯垵藟娑撯偓鏉?smoke 閼辨氨鍔嶉崶鐐茬秺閿涘牅绻氱拠渚€銆夐棃銏ｎ攽娑撹桨绗岄弫鐗堝祦娑撯偓閼疯揪绱氶妴?

## [2026-03-21] Batch-WS8-01
- 閻╊喗鐖ｉ敍姘Ω閳ユ粌鍙ч柨顔惧Ц閹礁鍟撻崗銉ょ瑝閼崇晫绮潻?runtime helper閳ユ繂娴愰崠鏍﹁礋閼奉亜濮╃€孤ゎ吀闂傘劎顩﹂敍鍫濆帥鐟曞棛娲?replay/import/export 閸忔娊鏁€涙顔岄敍澶堚偓?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`scripts/game-manager-audit.mjs` 閺傛澘顤?replay 閸愭瑥鍙嗘潏鍦櫕鐟欏嫬鍨敍姝歮anager.replayIndex/replayMoves/replaySpawns/replayMovesV2/undoEnabled/disableSessionSync/replayDelay` 娴犲懎鍘戠拋绋挎躬 `setRuntime*ForReplay` 閸栧懓顥婇崙鑺ユ殶閸愬懓绁撮崐绗衡偓?2. 閺傛澘顤?`collectReplayRuntimeWriteBoundaryViolations()`閿涘苯鑻熼幒銉ュ弳 `game-manager-audit` 娑撶粯绁︾粙瀣亼鐠愩儵妯嗛弬顓溾偓?3. 閸?`tests/unit/game-manager-audit-helpers.spec.ts` 婢х偛濮炲锝呭冀娑撱倗琚崡鏇熺ゴ閿涘牏绮潻鍥у晸閸忋儱绨查幎銉ㄧ箽鐟欏嫨鈧礁瀵樼憗鍛晸閸忋儱绨查柅姘崇箖閿涘鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run test:unit -- tests/unit/game-manager-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鍙忛柌?unit閿?39 files / 820 tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潊udit/unit/smoke/build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秷顫夐崚娆掝洬閻?replay 閸忔娊鏁€涙顔岄敍灞藉従娴犳牗膩閸ф绱欐俊?saved-state/session-init閿涘绮涢棁鈧幐澶婃倱缁涙牜鏆愰幍鈺佺潔閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃濡搁崥宀€琚潏鍦櫕鐟欏嫬鍨幍鈺佺潔閸掓澘鍙剧€瑰啴鐝搴ㄦ珦閻樿埖鈧礁鐡у▓纰夌礉楠炴湹绗?WS3-01 閸氬牆鑻熼幒銊ㄧ箻閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-01閿涙俺鎯ら崷?replay/import/export contracts 鐟曞棛娲婇惌鈺呮█娑撳孩鏌囩懛鈧妴?2. 閹碘晛鐫?WS8-01閿涙俺藟姒?saved-state/session-init 閻ㄥ嫬鍙ч柨顔肩摟濞堥潧鍟撻崗銉ㄧ珶閻ｅ苯顓哥拋掳鈧?3. 閸╄桨绨惌鈺呮█鐞涖儰绔存潪?smoke 婵傛垹瀹抽悽銊ょ伐閿涘苯鑸伴幋鎰讲閸欐垵绔风拠浣瑰祦閵?

## [2026-03-21] Batch-WS3-01
- 閻╊喗鐖ｉ敍姘虫儰閸?replay/import/export 閻?contracts 鐟曞棛娲婇惌鈺呮█閿涘苯鑻熼幎濠冩付鐏忓繑鏌囩懛鈧痪鍐插弳 CI閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/contracts/index.ts` 閺傛澘顤冭箛鍛綖鐎涙顔岀敮鎼佸櫤閿涙瓪REPLAY_RECORD_REQUIRED_KEYS`閵嗕梗HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS`閵嗕梗SUBMIT_PAYLOAD_REQUIRED_KEYS`閵?2. 閺傛澘顤冩潻鎰攽閺冭埖娓剁亸蹇旂墡妤犲苯鍤遍弫甯窗`isReplayRecordLike()`閵嗕梗isHistoryExportEnvelopeLike()`閵嗕梗isSubmitPayloadLike()`閵?3. 閺傛澘顤?`REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX`閿涘本濡?contract 鐎涙顔岄妴浣烘晸娴溠勬煙閵嗕焦绉风拹瑙勬煙閵嗕焦鏌囩懛鈧担宥囩枂闂嗗棔鑵戞竟鐗堟閵?4. 閸?`tests/unit/contracts.spec.ts` 婢х偠藟閻晠妯€娑撳孩鐗庢灞藉毐閺佺増鏌囩懛鈧敍鍫燁劀閸欏秶鏁ゆ笟瀣剁礆閵?5. 閺傛澘顤冮弬鍥ㄣ€?`docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md` 娴ｆ粈璐?WS3-01 妫ｆ牗澹掗惌鈺呮█閸╄櫣鍤庨妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? file / 26 tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秶鐓╅梼浣冾洬閻╂牔绨?replay/import/export 娑撳琚弽绋跨妇 contract閿涘奔绲剧亸姘弓鐟曞棛娲?saved-state/session-init閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹靛湱鎴风紒顓熷⒖鐏炴洜鐓╅梼浣冨瘱閸ヨ揪绱濋獮鑸靛Ω鐟曞棛娲婇悳鍥ㄧ墡妤犲本甯撮崗?gate閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹碘晛鐫嶉惌鈺呮█閸?saved-state/session-init 楠炴儼藟閺堚偓鐏忓繑鐗庢灞藉毐閺佽埇鈧?2. 婢х偠藟 matrix->smoke 閻ㄥ嫬顨栫痪锔炬暏娓氬妲х亸鍕剁礉瑜般垺鍨氶崣鎴濈鐠囦焦宓侀柧淇扁偓?3. 婢х偛濮?gate 濡偓閺屻儻绱扮紓鍝勩亼 matrix 鐞涘本鍨ㄨ箛鍛綖鐎涙顔屽鍌溞╅弮鍫曟▎閺傤厹鈧?

## [2026-03-21] Batch-WS8-02
- 閻╊喗鐖ｉ敍姘殺 WS3-01 閻?contracts 閻晠妯€閹恒儱鍙?refactor gate閿涘矂妲诲銏犳倵缂侇厾绮ㄩ弸鍕磽缁夋眹鈧?- 鐎瑰本鍨氭い鐧哥窗
1. 閺傛澘顤?`scripts/contracts-matrix-audit.mjs`閿涘本鐗庢?`src/contracts/index.ts` 娑擃厾鐓╅梼鍏哥瑢閸忔娊鏁?token 鐎瑰本鏆ｉ幀褋鈧?2. 鐎孤ゎ吀鐟欏嫬鍨鑼额洬閻╂牭绱癭ReplayRecord`閵嗕梗HistoryExportEnvelope`閵嗕梗SubmitPayload` 娑撳顢戦惌鈺呮█韫囧懘銆忕€涙ê婀敍灞肩瑬 `requiredKeys/producers/consumers/assertions` 娑撳秳璐熺粚鎭掆偓?3. 鐏?`contracts-matrix-audit` 閹恒儱鍙?`scripts/refactor-gate.mjs` 閹笛嗩攽濮濄儵顎冩稉?timeout 閺勭姴鐨犻妴?4. 閺囧瓨鏌?`scripts/refactor-timeout-env-keys.mjs`閿涘本鏌婃晶?`REFACTOR_GATE_TIMEOUT_CONTRACTS_MATRIX_AUDIT_MS` 閺勭姴鐨犻妴?5. 閺囧瓨鏌?`scripts/release-readiness-check.mjs`閿涙碍濡搁惌鈺呮█閺傚洦銆傛稉搴☆吀鐠伮ゅ壖閺堫剛鎾奸崗銉ョ箑濡偓閺傚洣娆㈤敍灞借嫙鐟曚焦鐪?gate 閸栧懎鎯?`contracts-matrix-audit` 閸忔娊鏁悧鍥唽閵?6. 閺傛澘顤?閺囧瓨鏌婇崡鏇熺ゴ閿?   - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
   - `tests/unit/refactor-timeout-env-keys.spec.ts`
   - `tests/unit/release-readiness-check-helpers.spec.ts`
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:release-ready`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆瀵橀崥?`contracts-matrix-audit` 閸︺劌鍞撮惃鍕弿闁?gate 濮濄儵顎冮柅姘崇箖閿?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秹妫粋浣稿嚒娣囨繃濮?replay/import/export 娑撳琚惌鈺呮█閿涘奔绲剧亸姘弓鐟曞棛娲?saved-state/session-init 閻?contracts 鐞涘被鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃澧跨仦鏇犵叐闂冮潧鎷扮€孤ゎ吀鐟欏嫬鍨崚?saved-state/session-init閿涘苯鑻熺悰銉ヮ嚠鎼?smoke 婵傛垹瀹抽悽銊ょ伐閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹碘晛鐫嶉惌鈺呮█娑撳骸顓哥拋鈥冲煂 saved-state/session-init閵?2. 婢х偠藟 matrix->smoke 閸︾儤娅欓弰鐘茬殸楠炴儼鎯ら崷鏉挎礀瑜版帞鏁ゆ笟瀣ㄢ偓?3. 閺€鑸垫殐 WS3/WS8 娑撳搫褰茬粵鐐暪閻樿埖鈧緤绱欓崙鍡楊槵 F sign-off 鐠囦焦宓佺悰顭掔礆閵?

## [2026-03-21] Batch-WS3-02
- 閻╊喗鐖ｉ敍姘Ω contracts 閻晠妯€娴?replay/import/export 閹碘晛鐫嶉崚?saved-state/session-init閿涘苯鑻熸穱婵囧瘮 gate 閸忋劎璞㈤妴?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/contracts/index.ts` 閺傛澘顤冮崥鍫濇倱閿涙瓪SavedGameStatePayload`閵嗕梗SessionInitPayload`閵?2. 閺傛澘顤冭箛鍛綖鐎涙顔岀敮鎼佸櫤娑撳孩娓剁亸蹇旂墡妤犲苯鍤遍弫甯窗
   - `SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS` + `isSavedGameStatePayloadLike()`
   - `SESSION_INIT_PAYLOAD_REQUIRED_KEYS` + `isSessionInitPayloadLike()`
3. 閺傛澘顤?`CORE_CONTRACT_COVERAGE_MATRIX` 楠炴湹绻氶悾?`REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX` 閸掝偄鎮曢崗鐓庮啇閵?4. 閸?`src/bootstrap/play-startup-payload.ts` 鐎靛綊缍?`SessionInitPayload` 缁鐎烽弶銉︾爱閿涘潏ontracts 閸楁洑绔撮惇鐔哥爱閿涘鈧?5. 閺囧瓨鏌?`scripts/contracts-matrix-audit.mjs`閿涙碍鏁幐浣叫掗弸?`CORE_CONTRACT_COVERAGE_MATRIX`閿涘苯鑻熷鐑樼墡妤?5 娑擃亜鎮庨崥宀冾攽閵?6. 閺囧瓨鏌婇獮鑸靛⒖鐏炴洘鏋冨锝呯唨缁惧尅绱癭docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`閵?7. 閹碘晛鐫嶉崡鏇熺ゴ閿涙瓪tests/unit/contracts.spec.ts`閵嗕梗tests/unit/contracts-matrix-audit-helpers.spec.ts`閵嗕梗tests/unit/bootstrap-play-startup-payload.spec.ts`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts tests/unit/bootstrap-play-startup-payload.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? files / 34 tests閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:release-ready`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鎯?contracts-matrix-audit閿?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘辩叐闂冮潧鎷?gate 瀹歌尪顩惄鏍у煂 saved-state/session-init閿涘奔绲?smoke 婵傛垹瀹抽崷鐑樻珯鏉╂ɑ婀€电绻栨稉銈堫攽閸嬫氨顏崚鎵伂缂佹垵鐣鹃妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电藟姒绘劕顕惔?smoke 濡楀牅绶ラ敍灞借嫙閹跺﹥顢嶆笟瀣熅瀵板嫮鎾奸崗?matrix 鐎孤ゎ吀閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 婢х偠藟 `SavedGameStatePayload` / `SessionInitPayload` 閻?smoke 婵傛垹瀹抽悽銊ょ伐閵?2. 閹碘晛鐫?`contracts-matrix-audit`閿涙碍鐗庢?assertions 娑擃厾娈戝ù瀣槸閺傚洣娆㈢捄顖氱窞鐎涙ê婀妴?3. 閺佸鎮?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙閸戝棗顦弨璺哄經閵?

## [2026-03-21] Batch-WS8-03
- 閻╊喗鐖ｉ敍姘乘夋?saved-state/session-init 閻?smoke 婵傛垹瀹抽崷鐑樻珯閿涘苯鑻熼幎?matrix assertions 鐠侯垰绶炵€涙ê婀幀褏鎾奸崗?gate 鐎孤ゎ吀閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閺傛澘顤?smoke 閻劋绶?`tests/smoke/pages-contracts-saved-session.smoke.spec.ts`閿?   - 妤犲矁鐦?play 閸氼垰濮╅柧鎹愮熅 `SessionInitPayload` 閺堚偓鐏忓繐鎮庨崥宀嬬礄`modeKey/modeConfig/inputManagerCtor/defaultBoardWidth`閿涘绱?   - 妤犲矁鐦?practice 瀵搫鍩楁穱婵嗙摠閸氬海娈?`SavedGameStatePayload` 閺堚偓鐏忓繐鎮庨崥宀嬬礄閸?`board` 閺佹壆绮嶆稉搴″彠闁款喖鐡у▓纰夌礆閵?2. 閹碘晛鐫?`scripts/contracts-matrix-audit.mjs`閿?   - 閺傛澘顤?assertions 鐎涙顔岀憴锝嗙€介敍?   - 閺傛澘顤?assertions 鐠侯垰绶炵€涙ê婀幀褎顥呴弻銉礄閺€顖涘瘮閺咁噣鈧俺鐭惧鍕瑢 `*` 闁岸鍘ら崠褰掑帳閿涘绱?   - matrix 閺嶏繝鐛欏ù浣衡柤閸旂姴鍙嗙拠銉︻梾閺屻儯鈧?3. 閺囧瓨鏌?`src/contracts/index.ts` 閻?`SavedGameStatePayload` / `SessionInitPayload` 鐞?assertions閿涘本甯撮崗銉︽煀 smoke 閻劋绶ョ捄顖氱窞閵?4. 閹碘晛鐫?`tests/unit/contracts-matrix-audit-helpers.spec.ts`閿涘矁顩惄?assertions 鐠侯垰绶炲Λ鈧弻銉︻劀閸欏秶鏁ゆ笟瀣ㄢ偓?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts tests/unit/bootstrap-play-startup-payload.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? files / 35 tests閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鎯?contracts-matrix-audit + 閸忋劑鍣?smoke閿?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘辩叐闂冨吀绗?gate 瀹歌尪顩惄?saved-state/session-init閿涘奔绲?assertions 閻╊喖澧犻崣顏呯墡妤犲备鈧粏鐭惧鍕摠閸︺劉鈧繐绱濈亸姘弓閺嶏繝鐛欓垾婊冩簚閺咁垵顩惄鏍ㄧ箒鎼达腹鈧縿鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涜礋閸忔娊鏁?contract 婢х偛濮炵憰鍡欐磰鎼达附瀵氶弽鍥风礄娓氬顩уВ蹇氼攽閺堚偓鐏?1 unit + 1 smoke閿涘鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閸?matrix audit 娑擃厼濮為崗銉⑩偓婊勭槨娑?contract 閼峰啿鐨紒鎴濈暰 unit+smoke 閸?1 閺夆檧鈧繄娈戠憴鍕灟閵?2. 鐞涖儱鍘?SavedState 閻ㄥ嫬绱撶敮姝岀熅瀵?smoke閿涘牊宕崸?payload/閻楀牊婀版稉宥呭爱闁板稄绱氭總鎴犲閵?3. 濮瑰洦鈧?WS3/WS8 閻?F sign-off 鐠囦焦宓侀獮璺哄櫙婢跺洦鏁归崣锝冣偓?
## [2026-03-21] Batch-WS8-04
- 閻╊喗鐖ｉ敍姘暚閹?WS3/WS8 閺€璺哄經閸撳秶娈戦垾婊嗩洬閻╂牗绻佹惔锕傛，缁?+ 瀵倸鐖剁捄顖氱窞 smoke + Submit 閸氬牆鎮?smoke 缂佹垵鐣鹃垾婵勨偓?- 鐎瑰本鍨氭い鐧哥窗
1. 閹碘晛鐫?`scripts/contracts-matrix-audit.mjs`閿?   - 閺傛澘顤?assertions 鐟曞棛娲婂ǎ鍗炲鐟欏嫬鍨敍姘槨娑?contract 鐞涘矁鍤︾亸?`1 unit + 1 smoke`閿?   - 閺傛澘顤?`verifyMatrixAssertionCoverageDepth()` 楠炶埖甯撮崗銉ゅ瘜濞翠胶鈻奸敍?   - 鐎电厧鍤?`isUnitAssertionPath()`閵嗕梗isSmokeAssertionPath()` 閻劋绨崡鏇熺ゴ閵?2. 閹碘晛鐫?`tests/unit/contracts-matrix-audit-helpers.spec.ts`閿?   - 閺傛澘顤冪憰鍡欐磰濞ｅ崬瀹崇憴鍕灟濮濓絽寮介悽銊ょ伐閿涘矂妲婚崶鐐衡偓鈧妴?3. 鐞涖儵缍?SubmitPayload 閻?smoke 閸氬牆鎮撻弬顓♀枅閿?   - 閸?`tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts` 闁插洭娉?`/records` 鐠囬攱鐪版担鎾宠嫙閺傤叀鈻?`SubmitPayload` 韫囧懎锝為柨顔荤瑢 `final_board` 閺佹壆绮嶈ぐ銏♀偓浣碘偓?4. 鐞涖儵缍?SavedState 瀵倸鐖剁捄顖氱窞 smoke閿?   - 閸?`tests/smoke/pages-contracts-saved-session.smoke.spec.ts` 閺傛澘顤冩稉銈嗘蒋閻劋绶ラ敍?     - `saved-state restore rejects version-mismatch payload`
     - `saved-state restore rejects malformed board payload`
5. 閺囧瓨鏌?contracts 閻晠妯€娑撳骸鐔€缁炬寧鏋冨锝嗘焽鐟封偓閺勭姴鐨犻敍?   - `src/contracts/index.ts`
   - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run test:unit -- tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鍙忛柌?unit閿?40 files / 832 tests閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-online-submit-timeout-retry.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? test閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? test閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱3/WS8 閹垛偓閺堫垶妫撮悳顖氬嚒閸╃儤婀版鎰槵閿涘奔绲?F sign-off 鐠囦焦宓佺悰銊ょ矝闂団偓閹稿鈧粈缍嬫?娑撴艾濮?鐠囦焦宓?妞嬪酣娅撻垾婵嗘磽閺嶅繑鐪归幀璇茶嫙缁涚偓鏁归妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电浠涢悞锕佺槈閹诡喛銆冨▽澶嬬┅娑?WS3-02 妫ｆ牗澹掗崚鍥╁閸氼垰濮╅妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 瑜般垺鍨?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨?A/F 閸忓崬鎮撶涵顔款吇閵?2. 閸氼垰濮?WS3-02閿涘牆宸婚崣鏌ユ瀵繒绮ㄩ弸鍕讣缁夎鍩?contracts閿涘顩婚幍閫涙崲閸斺剝濯堕崚鍡愨偓?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉烆喚婀＄€?CI閿涘瞼鈥樼拋銈嗘煀濞ｅ崬瀹抽梻銊ь洣閺冪姾顕ら幎銉ｂ偓?
## [2026-03-21] Batch-WS3-03
- 閻╊喗鐖ｉ敍姘儙閸?WS3-02 妫ｆ牗澹掗崚鍥╁閿涘本濡搁崢鍡楀蕉缂佹挻鐎禒搴樷偓婊堟瀵繐顕挒鈾€鈧繆绺肩粔璇插煂 contracts 鏉╂劘顢戦弮璺哄弳閸欙絻鈧?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/contracts/index.ts` 閺傛澘顤?HistoryRecord 鏉╂劘顢戦弮璺侯殩缁撅箒鍏橀崝娑崇窗
   - `HISTORY_RECORD_REQUIRED_KEYS`
   - `isHistoryRecordLike()`
   - `normalizeHistoryRecordLike()`
2. 閸?`src/storage/history-idb.ts` 鐏忓棔浜掓稉瀣懠鐠侯垰鍨忛幑銏犲煂 contracts 瑜版帊绔撮崠鏍у弳閸欙綇绱?   - `migrateFromLocalStorage`
   - `saveRecord`
   - `getById`
   - `importRecords`
   - 濞撳憡鐖ｇ拠璇插絿鐠侯垰绶?`readAllRecordsByCursor`
   - 閸氬本妞傞幎?envelope 閸掋倕鐣鹃弨閫涜礋婢跺秶鏁?`isHistoryExportEnvelopeLike()`閵?3. 閹碘晛鐫?`tests/unit/contracts.spec.ts`閿?   - 閺傛澘顤?HistoryRecord 韫囧懎锝為柨顔肩埗闁插繑鏌囩懛鈧敍?   - 閺傛澘顤?`isHistoryRecordLike` 濮濓絽寮介弬顓♀枅閿?   - 閺傛澘顤?`normalizeHistoryRecordLike` 姒涙顓婚崐闂寸瑢閺佹澘鐡х€涙顑佹稉鎻掔秺娑撯偓閸栨牗鏌囩懛鈧妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? file / 29 tests閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? file / 6 tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? test閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歴rc/storage/history-idb.ts` 瀹?contracts 閸栨牭绱濇担?`js/local_history_store.js` 娴犲秳绻氶悾娆戝缁?`normalizeRecord` 闁槒绶敍灞界摠閸︺劉鈧粌寮荤€圭偟骞囧鍌溞╅垾婵嬵棑闂勨斂鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电懓鐨?`local_history_store` 鏉╀胶些閸?contracts 瑜版帊绔撮崠鏍у礋娑撯偓閻喐绨敍宀勪缉閸忓秴鐡у▓鍨磽缁夋眹鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-02 缁楊兛绨╅幍鐧哥窗閺€鑸垫殐 `js/local_history_store.js` 閻ㄥ嫬宸婚崣鎻掔秺娑撯偓閸栨牠鈧槒绶崚?contracts閵?2. 鏉堟挸鍤?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 缂佈呯敾鐟欏倸鐧?2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀婢х偤妫粋浣呵旂€规哎鈧?
## [2026-03-21] Batch-WS3-04
- 閻╊喗鐖ｉ敍姘暚閹?WS3-02 缁楊兛绨╅幍鐧哥礉鐏?`local_history_store` 閻ㄥ嫬宸婚崣鎻掔秺娑撯偓閸栨牠鈧槒绶弨鑸垫殐閸?runtime contracts 閸忋儱褰涢妴?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/core/game-settings-storage.ts` 閺傛澘顤?`normalizeHistoryRecordFromContext()`閿涘奔绗?contracts 閻?HistoryRecord 姒涙顓婚崐?閺佹澘鈧厧缍婃稉鈧崠鏍潐閸掓瑥顕鎰┾偓?2. 閸?`js/core_game_settings_storage_runtime.js` 閸氬本顒為弬鏉款杻楠炶泛顕遍崙?`normalizeHistoryRecordFromContext`閿涘奔缍旀稉?legacy 妞ょ敻娼伴崣顖氼槻閻劎娈戠紒鐔剁閸忋儱褰涢妴?3. 閸?`js/local_history_store.js` 闁插秵鐎?`normalizeRecord`閿?   - 娴兼ê鍘涚拫鍐暏 `CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`閿?   - 娣囨繄鏆€ `normalizeRecordFallback` 娴ｆ粈璐熸潻鎰攽閺冭泛鍘规惔鏇幢
   - owner/diagnostics 閻ㄥ嫭澧跨仦鏇炵摟濞堢數鎴风紒顓炴躬閺堫剚膩閸ф妾崝鐘偓?4. 閸?`tests/unit/core-game-settings-storage.spec.ts` 閺傛澘顤?HistoryRecord 瑜版帊绔撮崠鏍ㄧゴ鐠囨洩绱欏锝呮倻娑撳海鈹栨潏鎾冲弳閿涘鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? file / 24 tests閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? file / 29 tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? test閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歭ocal_history_store` 瀹稿弶鏁归弫娑崇礉娴ｅ棗宸婚崣鎻掔潔缁€鍝勭湴閿涘潉history_page.js` / `user_profile_page.js`閿涘绮涢崣顖濆厴鐎涙ê婀€涙顔岄幏鑹邦棅閸掑棙鏁敍宀勬付缂佈呯敾缂佺喍绔撮妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃澹傞幓蹇涖€夐棃銏犵湴閻ㄥ嫬宸婚崣鎻掔摟濞堝灚瀚剧憗鍛仯楠炶埖鏁归弫娑樺煂 contracts 鐠佸潡妫剁捄顖氱窞閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥窗閺€鑸垫殐閸樺棗褰剁仦鏇犮仛鐏炲倿娈ｅ蹇撶摟濞堝灚瀚剧憗鍛偓?2. 濮瑰洦鈧?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙缁涚偓鏁归妴?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈夋，缁備胶菙鐎规碍妫ょ拠顖涘Г閵?
## [2026-03-22] Batch-WS3-05
- 閻╊喗鐖ｉ敍姘腹鏉?WS3-02 缁楊兛绗侀幍鐧哥礉閺€鑸垫殐閸樺棗褰剁仦鏇犮仛鐏炲偊绱檜ser profile閿涘鐡у▓鍨鐟佸懎鍩岀紒鐔剁 runtime contracts 閸忋儱褰涢妴?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`js/user_profile_page.js` 閺傛澘顤?`normalizeHistoryRecordViaRuntime()`閿涘矂娉︽稉顓＄殶閻?`CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`閵?2. `normalizeRecordDetailPayload()` 閺€閫涜礋娴兼ê鍘涘☉鍫ｅ瀭 runtime 瑜版帊绔撮崠鏍波閺嬫粣绱濇穱婵堟殌閸樼喐婀侀崗婊冪俺闁槒绶妴?3. `normalizeUserRecordsFromApi()` 閺€閫涜礋娴兼ê鍘涙担璺ㄦ暏 runtime 瑜版帊绔撮崠鏍波閺嬫粣绱檚core/best_tile/duration/mode/end_reason/ended_at閿涘绱濋崙蹇撶毌妞ょ敻娼扮仦鍌炲櫢婢跺秵瀚剧憗鍛偓?4. 閸?`src/entries/user-profile.ts` 婢х偛濮?`core_game_settings_storage_runtime.js` 鐎电厧鍙嗛敍宀€鈥樻穱婵嬨€夐棃銏ｇ箥鐞涘本妞傞崗宄邦槵缂佺喍绔磋ぐ鎺嶇閸栨牞鍏橀崝娑栤偓?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?3 tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歨istory_page.js` 娴犲秴鐡ㄩ崷?owner/filter 娓氀呮畱妞ょ敻娼扮紒鍕棅闁槒绶敍宀冩闂堢偞鐗宠箛鍐ㄥ礂鐠侇噣顥撻梽鈺冨仯閿涘奔绲炬禒宥夋付缂佈呯敾閺€鑸垫殐鐎涙顔岄幏鑹邦棅閸掑棙鏁妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电浠堥崝?`history_page.js` + `LocalHistoryStore` 鏉堟挸鍤€涙顔岄敍宀€鎴风紒顓炲竾缂傗晠銆夐棃銏犵湴闂呮劕绱＄紒鎾寸€笟婵婄閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥窗閺€鑸垫殐 `history_page.js` 鐎涙顔岄幏鑹邦棅閸掑棙鏁獮鎯八夐崶鐐茬秺濞村鐦妴?2. 濮瑰洦鈧?WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋?user-profile/history 闁炬崘鐭剧粙鍐茬暰閵?

## [2026-03-22] Batch-WS3-06
- 閻╊喗鐖ｉ敍姘腹鏉?WS3-02 缁楊剙娲撻幍鐧哥礉閺€鑸垫殐閸樺棗褰舵い纰夌礄history page閿涘鐡у▓鍨鐟佸懎鍩?runtime contracts 閸忋儱褰涢妴?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`js/history_page.js` 閺傛澘顤?`normalizeHistoryRecordViaRuntime()` 娑?`normalizeHistoryRecordForView()`閿涘瞼绮烘稉鈧?history 閸掓銆冨〒鍙夌厠鏉堟挸鍙嗛妴?2. `renderList()` 閺€閫涜礋閻╁瓨甯村☉鍫ｅ瀭 `normalizeHistoryRecordForView()` 閻ㄥ嫮绮ㄩ弸婊愮礉閸戝繐鐨い鐢告桨鐏炲倹鏆庨悙鐟扮摟濞堝灚瀚剧憗鍛偓?3. `normalizeBoardMatrix()` 閺€閫涜礋娴兼ê鍘涙径宥囨暏 runtime 瑜版帊绔撮崠鏍翻閸戠尨绱濋崢鐔告拱鐎涙顑佹稉鑼缎掗弸鎰瀻閺€顖欑箽閻ｆ瑤璐?fallback閵?4. 閸?`src/entries/history.ts` 婢х偛濮?`core_game_settings_storage_runtime.js` 鐎电厧鍙嗛敍宀€鈥樻穱婵堢埠娑撯偓瑜版帊绔撮崠鏍︾贩鐠ф牜菙鐎规艾濮炴潪濮愨偓?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-runtime-contract.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘坊閸欐煡銆夐惃?owner/diagnostics 娴犲秵妲告い鐢告桨鐏炲倷绗撻悽銊х波閺嬪嫸绱濈亸姘弓瑜般垺鍨?contracts 缂佺喍绔撮崡蹇氼唴閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电懓顕?owner/diagnostics 閸嬫艾宕楃拋顔煎鐠囧嫪鍙婇敍灞肩喘閸忓牊濞婇崣鏍у讲婢跺秶鏁ゆ潻鎰攽閺冭泛鍙嗛崣锝冣偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥窗閺€鑸垫殐 owner/diagnostics 閸掑棙鏁獮鎯八夊ù瀣槸閵?2. 濮瑰洦鈧?WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀瑜版帊绔撮崠鏍熅瀵板嫮菙鐎规哎鈧?

## [2026-03-22] Batch-WS3-07
- 閻╊喗鐖ｉ敍姘腹鏉?WS3-02 缁楊兛绨查幍鐧哥礉閺€鑸垫殐 owner/diagnostics 瑜版帊绔撮崠鏍潐閸掓瑥鍩?runtime 缂佺喍绔撮崗銉ュ經閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/core/game-settings-storage.ts` 閺傛澘顤冮獮璺侯嚤閸戠尨绱?   - `normalizeHistoryOwnerMetaFromContext()`
   - `normalizeHistoryDiagnosticsIndexEntriesFromContext()`
2. 閸?`js/core_game_settings_storage_runtime.js` 閸氬本顒為弬鏉款杻楠炶泛顕遍崙杞扮瑐鏉╂澘鍤遍弫甯礉瑜般垺鍨?legacy/runtime 娓氀呯埠娑撯偓閸忋儱褰涢妴?3. 閸?`js/local_history_store.js`閿?   - `resolveOwnerMetaFromRaw` 閺€閫涜礋娴兼ê鍘涚拫鍐暏 runtime 閻?owner 瑜版帊绔撮崠鏍电幢
   - `normalizeDiagnosticsIndexEntries` 閺€閫涜礋娴兼ê鍘涚拫鍐暏 runtime 閻?diagnostics 瑜版帊绔撮崠鏍モ偓?4. 閸?`js/history_page.js`閿?   - `normalizeOwnerDisplay` 閺€閫涜礋娴兼ê鍘涘☉鍫ｅ瀭 runtime owner 瑜版帊绔撮崠鏍电幢
   - `normalizeHistoryDiagnosticsIndexEntries` 閺€閫涜礋娴兼ê鍘涘☉鍫ｅ瀭 runtime diagnostics 瑜版帊绔撮崠鏍电幢
   - `normalizeHistoryRecordForView` 閼辨柨濮╂担璺ㄦ暏 runtime owner/diagnostics 缂佹挻鐏夐妴?5. 閸?`tests/unit/core-game-settings-storage.spec.ts` 鐞?owner/diagnostics 瑜版帊绔撮崠鏍у礋濞村鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?6 tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝皐ner/diagnostics 閻╊喖澧犲鑼埠娑撯偓閸?runtime 閸忋儱褰涢敍灞肩稻娴犲秵婀崷?`src/contracts` 瑜般垺鍨氶弰鎯х础閸楀繗顔呯猾璇茬€锋稉搴ｇ叐闂冨灚鐗庢灞烩偓?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电懓鐨?owner/diagnostics 瀵洖鍙?contracts 閺堚偓鐏忓繒琚崹瀣╃瑢閺傤叀鈻堥敍宀冪箻娑撯偓濮濄儵妾锋担搴ㄦ瀵繒绮ㄩ弸鍕棑闂勨斂鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥窗owner/diagnostics contracts 閸栨牭绱欑猾璇茬€?+ 閺傤叀鈻?+ 韫囧懓顩﹂崡鏇熺ゴ閿涘鈧?2. 濮瑰洦鈧?WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀瑜版帊绔撮崠鏍熅瀵板嫮菙鐎规哎鈧?

## [2026-03-22] Batch-WS3-08
- 閻╊喗鐖ｉ敍姘腹鏉?WS3-02 缁楊剙鍙氶幍鐧哥礉鐏?owner/diagnostics 娴?runtime 閸忋儱褰涢弨鑸垫殐鏉╂稐绔村銉﹀絹閸楀洣璐?contracts 閺勬儳绱￠崡蹇氼唴閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`src/contracts/index.ts` 閹碘晛鐫?`HistoryRecord`閿涙碍鏌婃晶?`owner_type/owner_user_id/owner_nickname/owner_key/diagnostics_index_entries`閵?2. 閺傛澘顤?contracts 鐢悂鍣洪敍?   - `HISTORY_OWNER_META_REQUIRED_KEYS`
   - `HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS`
3. 閺傛澘顤?contracts helper閿?   - `normalizeHistoryOwnerMetaLike` / `isHistoryOwnerMetaLike`
   - `normalizeHistoryDiagnosticsIndexEntriesLike` / `isHistoryDiagnosticsIndexEntryLike`
4. `normalizeHistoryRecordLike` 娑?`isHistoryRecordLike` 閼辨柨濮╂稉濠呭牚 helper閿涘苯鐣幋?owner/diagnostics 閸楀繗顔呴崠鏍モ偓?5. 閺囧瓨鏌?`tests/unit/contracts.spec.ts`閿?   - 閸樺棗褰惰箛鍛綖闁款喗鏌囩懛鈧弴瀛樻煀閿?   - 閺傛澘顤?owner/diagnostics helper 瑜版帊绔撮崠鏍︾瑢閺嶏繝鐛欏ù瀣槸閵?6. 娣囶喖顦叉稉鈧▎?build 缁鐎烽梻顕€顣介敍鍧剆chemaVersion` unknown閿涘鑻熼柅姘崇箖閸忋劑鎽肩捄顖炴，缁備降鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?1 tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝皐ner/diagnostics 閾忚棄鍑?contracts 閸栨牭绱濇担鍡樻弓缁惧啿鍙?matrix 閻欘剛鐝涢崥鍫濇倱鐞涘矉绱濊ぐ鎾冲娴犲秳绶烽梽鍕艾 HistoryRecord 閸氬牆鎮撻弬顓♀枅閵?  - 缂傛捁袙閸斻劋缍旈敍姘倵缂侇叀鐦庢导鐗堟Ц閸氾箑宕岀痪?matrix 鐟曞棛娲婇懠鍐ㄦ纯閿涘苯鑻熼崥灞绢劄鐠嬪啯鏆?audit 鐟欏嫬鍨稉搴㈡瀮濡楋絻鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 濮瑰洦鈧?WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?2. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋?contracts 閹碘晛鐫嶇粙鍐茬暰閵?3. 鐠囧嫪鍙?matrix 閹碘晛鐫嶉弬瑙勵攳娑撳孩鏁奸柅鐘冲灇閺堫兙鈧?

## [2026-03-22] Batch-WS8-05
- 閻╊喗鐖ｉ敍姘殺 owner/diagnostics 鐎电懓绨查惃?`HistoryRecord` 濮濓絽绱＄痪鍐插弳 contracts matrix gate閿涘苯鑸伴幋?contracts 鐏炲倿娼伴惃鍕瘮缂?CI 缁撅附娼妴?- 鐎瑰本鍨氭い鐧哥窗
1. `scripts/contracts-matrix-audit.mjs`閿?   - `REQUIRED_CONTRACT_NAMES` 娴?5 鐞涘本澧跨仦鏇氳礋 6 鐞涘矉绱欓弬鏉款杻 `HistoryRecord`閿涘绱?   - `REQUIRED_TOKENS` 閺傛澘顤?HistoryRecord 閻╃鍙?required keys 娑?`is*` 閺嶏繝鐛欓崙鑺ユ殶 token閿?   - 娣囨繃瀵?assertions 濞ｅ崬瀹崇憴鍕灟閿涘牊鐦＄悰宀冨殾鐏?1 unit + 1 smoke閿涘鈧?2. `src/contracts/index.ts`閿?   - `ContractCoverageMatrixEntry` 閺傛澘顤?`HistoryRecord` 閸氬牆鎮撶猾璇茬€烽敍?   - `CORE_CONTRACT_COVERAGE_MATRIX` 閺傛澘顤?`HistoryRecord` 鐞涘矉绱濈紒鎴濈暰 producer/consumer/assertion 鐠侯垰绶為妴?3. `tests/unit/contracts-matrix-audit-helpers.spec.ts`閿?   - `VALID_CONTRACTS_SOURCE` 娑撳孩婀￠張娑滎攽閸掓銆冮幍鈺佺潔閼?6 鐞涘矉绱?   - doc 閺嶏繝鐛欓弽铚傜伐閸氬本顒為崠鍛儓 `HistoryRecord`閵?4. `tests/unit/contracts.spec.ts`閿?   - matrix 鐞涘本鏆熼弬顓♀枅娴?5 閺€閫涜礋 6閵?5. `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`閿?   - 閻晠妯€閺傚洦銆傞崡鍥╅獓娑?6 閸氬牆鎮撻悧鍫熸拱閿涘苯濮為崗?`HistoryRecord` 鐞涘苯鎷版禒锝囩垳闁挎氨鍋ｉ妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?7 tests閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘Η閺堫垶妫粋浣稿嚒鐞涖儵缍堥敍灞肩稻 WS3/WS8 鐏忔氨宸?F sign-off 鐠囦焦宓佺悰銊ф畱濞翠胶鈻肩粵鐐暪閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹靛湱娲块幒銉ら獓閸戝搫鑻熷▽澶嬬┅ F sign-off 鐞涱煉绱濈€瑰本鍨?A/F 缁涚偓鏁归妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 娴溠冨毉 WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?2. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋?6 閸氬牆鎮?matrix 缁嬪啿鐣鹃妴?3. 鐠囧嫪鍙?WS8-01 閸掑洦宕查崚?done 閻ㄥ嫭妞傞張鎭掆偓?
## [2026-03-22] Batch-WS8-06
- 閻╊喗鐖ｉ敍姘暚閹?WS3/WS8 閻?F sign-off 鐠囦焦宓侀弨璺哄經閿涘苯鑻熼幎濠佹崲閸旓紕濮搁幀浣风瑢閸撯晙缍戦梼璇差敚妞ょ懓鎮撳銉ュ煂閻婢橀妴?- 鐎瑰本鍨氭い鐧哥窗
1. 閸?`docs/ROADMAP_MILESTONES.md` 娴溠冨毉 WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰顭掔礄娴ｆ捇鐛?娑撴艾濮?鐠囦焦宓?妞嬪酣娅撻敍澶堚偓?2. 鐏?WS3-01 閻樿埖鈧椒绮?`in_progress` 閺囧瓨鏌婃稉?`done`閿涘矁藟閸?6 閸氬牆鎮?matrix 閻ㄥ嫭鏁归崣锝呭灲鐎规哎鈧?3. 鐏?WS8-01 闂冭顢ｆい瑙勬纯閺傞璐熼垾婊冪窡 2-3 鏉?CI 鏉╃偟鐢荤粙鍐茬暰閹嗩潎鐎电啿鈧繐绱濋獮鏈电箽閻?`in_progress`閵?4. 閸︺劑鍣风粙瀣暥閺傚洦銆傛潻钘夊 Batch-WS8-06 婢х偤鍣虹拋鏉跨秿閿涘本妲戠涵顔荤瑓娑撯偓濮濄儲澧界悰宀勩€庢惔蹇嬧偓?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?7 tests閿涘本娼甸懛?Batch-WS8-05 閺€璺哄經鐠囦焦宓侀敍?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS閿涘牊娼甸懛?Batch-WS8-05 閺€璺哄經鐠囦焦宓侀敍?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牊娼甸懛?Batch-WS8-05 閺€璺哄經鐠囦焦宓侀敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱8-01 瑜版挸澧犻崬顖欑閺堫亪妫撮悳顖炪€嶉弰顖椻偓娣怚 鏉╃偟鐢荤粙鍐茬暰閹嗩潎鐎电啿鈧繂鐨婚張顏囁?run 缁狙嗙槈閹诡喓鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹靛湱娲块幒銉﹀⒔鐞涘苯鑻熼惂鏄忣唶 2-3 鏉?CI run 缂佹挻鐏夐敍鍧畊n id / 閸忔娊鏁銉╊€?/ 缂佹捁顔戦敍澶堚偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹笛嗩攽楠炴儼顔囪ぐ?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓侀妴?2. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥礉閺€鑸垫殐閸樺棗褰堕柧鎹愮熅閸撯晙缍?fallback 閸掑棙鏁妴?3. 濠娐ゅ喕缁嬪啿鐣鹃幀褎娼禒璺烘倵鐏?WS8-01 鏉?`done`閿涘苯鎮撳銉︽纯閺備即鍣风粙瀣暥閻樿埖鈧降鈧?
## [2026-03-22] Batch-WS3-09
- 閻╊喗鐖ｉ敍姘腹鏉?WS3-02 娑撳绔撮幍鐧哥礉濞撳懐鎮?history 妞ょ敻娼扮仦?owner/diagnostics 闁插秴顦茶ぐ鎺嶇閸栨牞鐭惧鍕┾偓?- 鐎瑰本鍨氭い鐧哥窗
1. `js/history_page.js` 娑擃厾些闂?owner 閺勫墽銇氶柧鎹愮熅閻ㄥ嫪绨╁▎?runtime 瑜版帊绔撮崠鏍电礉缂佺喍绔存径宥囨暏 `normalizeHistoryRecordForView()` 鏉堟挸鍤妴?2. `normalizeHistoryRecordForView()` 閺€閫涜礋娴?runtime 瑜版帊绔撮崠鏍波閺嬫粈璐熸稉缁樼爱閿涘牆鎯?owner/diagnostics/replay閿涘绱濇い鐢告桨娴犲懎浠涢崗婊冪俺缂佸嫯顥婇妴?3. `rebuildOwnerFilterOptions()` 閺€閫涜礋閸忓牆缍婃稉鈧崠鏍唶瑜版洖鍟€閺嬪嫬缂?owner 闁銆嶉敍宀勪缉閸忓秶鐡柅澶夌瑢閸掓銆冨〒鍙夌厠娴ｈ法鏁ゆ稉宥呮倱瑜版帊绔撮崠鏍у經瀵板嫨鈧?4. 鐠囧﹥鏌囬幗妯款洣鐟欙絾鐎芥导妯哄帥濞戝牐鍨傚鎻掔秺娑撯偓閸栨牜娈?`diagnostics_index_entries`閿涘苯鍣虹亸鎴﹀櫢婢?sanitize閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歭ocal_history_store.js` 娴犲秳绻氶悾娆撳劥閸?owner/diagnostics fallback 闁槒绶敍灞界毣閺堫亜鐣幋鎰瑢 runtime/contracts 閻ㄥ嫭娓剁紒鍫熸暪閺佹稏鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涗簰 `local_history_store.js` 娑撹櫣鍔嶉悙鍦埛缂侇厽绔婚悶?fallback閿涘苯鑻熺悰銉︽付鐏忓繐娲栬ぐ鎺旀暏娓氬鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 缂佈呯敾 WS3-02閿涙碍鏁归弫?`local_history_store.js` 閻?owner/diagnostics fallback 閸掑棙鏁妴?2. 閹笛嗩攽楠炴儼顔囪ぐ?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓侀妴?3. 濠娐ゅ喕鐟欏倸鐧傞弶鈥叉閸氬孩甯归崝?WS8-01 鏉?`done`閵?
## [2026-03-22] Batch-WS3-10
- 閻╊喗鐖ｉ敍姘辨埛缂侇厽甯规潻?WS3-02閿涘本鏁归弫?`local_history_store` 閻ㄥ嫰鍣告径宥呯秺娑撯偓閸栨牞鐭惧鍕┾偓?- 鐎瑰本鍨氭い鐧哥窗
1. `js/local_history_store.js`閿涙瓪resolveOwnerMetaFromRaw()` 閺傛澘顤?`preferRuntime` 閹貉冨煑閿涘苯鍑￠張?runtime 瑜版帊绔撮崠鏍波閺嬫粍妞傞柆鍨帳闁插秴顦?runtime 鐠嬪啰鏁ら妴?2. `js/local_history_store.js`閿涙瓪normalizeDiagnosticsIndexEntries()` 閺傛澘顤?`preferRuntime` 閹貉冨煑閿涘矂浼╅崗宥咁嚠閸氬奔绔?diagnostics 鏉堟挸鍙嗛柌宥咁槻 runtime 瑜版帊绔撮崠鏍モ偓?3. `js/local_history_store.js`閿涙瓪normalizeRecord()` 閺€閫涜礋娴犮儱宕熷▎?runtime 瑜版帊绔撮崠鏍波閺?`base` 娴ｆ粈璐?owner/diagnostics 娑撶粯绨敍宀€宸辨径杈ㄦ閸愬秴娲栭柅鈧崚?raw閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯ode scripts/contracts-matrix-audit.mjs`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歭ocal_history_store.js` 鐏忔碍婀侀幍瀣紣 payload sanitize fallback 闁槒绶敍灞肩矝闂団偓鐠囧嫪鍙婇弰顖氭儊閸欘垵绻樻稉鈧銉︽暪閺佹稑鍩?runtime/contracts 閸楁洑绔撮惇鐔哥爱閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电浠涢悞?diagnostics payload fallback 缁墽鐣濋敍灞借嫙鐞涖儱鐣鹃崥鎴濇礀瑜版帇鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 缂佈呯敾 WS3-02閿涙俺鐦庢导鏉胯嫙濞撳懐鎮?diagnostics payload 閹靛浼?fallback 閸愭ぞ缍戠捄顖氱窞閵?2. 鐞涖儱鍘栭張鈧亸蹇撶暰閸氭垵娲栬ぐ鎺炵礉绾喕绻氱€电厧鍤?缁涙盯鈧?閸樺棗褰剁仦鏇犮仛娑撳秹鈧偓閸栨牓鈧?3. 鐠佹澘缍?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓侀獮鎯扮槑娴兼媽娴?`done`閵?
## [2026-03-22] Batch-WS3-11
- 閻╊喗鐖ｉ敍姘殺閸樺棗褰剁拋鏉跨秿 owner/diagnostics 瑜版帊绔撮崠鏍箻娑撯偓濮濄儰绗呭▽澶婂煂 runtime 閸楁洖鍙嗛崣锝忕礉閸戝繐鐨?store 鐏炲倿鍣告径宥咁槱閻炲棎鈧?- 鐎瑰本鍨氭い鐧哥窗
1. `src/core/game-settings-storage.ts` 娑?`js/core_game_settings_storage_runtime.js`閿涙瓪normalizeHistoryRecordFromContext()` 閹碘晛鐫嶆禍褍鍤?`owner_type/owner_user_id/owner_nickname/owner_key/diagnostics_index_entries`閵?2. `js/local_history_store.js`閿涙瓪resolveRuntimeNormalizedHistoryRecord()` 娴肩姴鍙?auth 娑?diagnostics 闂勬劕绠欓崣鍌涙殶閿涙硜untime 閹存劕濮涢弮鍓佹纯閹恒儱顦查悽銊ョ秺娑撯偓閸栨牜绮ㄩ弸婊愮礉闁灝鍘?owner/diagnostics 娴滃本顐艰ぐ鎺嶇閸栨牓鈧?3. `tests/unit/core-game-settings-storage.spec.ts`閿涙istory record 瑜版帊绔撮崠鏍ㄦ焽鐟封偓閸氬本顒為弬鏉款杻 owner/diagnostics 姒涙顓荤€涙顔岄妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?6 tests閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱8-01 娴犲秶宸辩亸?CI 鏉╃偟鐢荤憴鍌氱檪 run 鐠囦焦宓侀敍灞剧ウ缁嬪鏁归崣锝嗘弓鐎瑰本鍨氶妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电浠涢悞?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓侀惂鏄忣唶楠炶埖娲块弬?sign-off 缂佹捁顔戦妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閻ф槒顔?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪 run 鐠囦焦宓侀妴?2. 缂佈呯敾鐠囧嫪鍙?diagnostics payload 閹靛浼?fallback 閻ㄥ嫭娓剁紒鍫熸暪閺佹稓鈹栭梻娣偓?3. 濠娐ゅ喕鐟欏倸鐧傞弶鈥叉閸氬孩甯归崝?WS8-01 鏉?`done`閵?
## [2026-03-22] Batch-WS8-07
- 閻╊喗鐖ｉ敍姘暚閹?WS8-01 閻?CI 鏉╃偟鐢荤粙鍐茬暰閹嗩潎鐎电喎褰囩拠浣歌嫙鐎瑰本鍨氭禒璇插閺€璺哄經閵?- 鐎瑰本鍨氭い鐧哥窗
1. 闁俺绻?GitHub Actions API 鐞涖儱缍?`Smoke` 瀹搞儰缍斿ù浣界箾缂?3 鏉烆喗鍨氶崝?run閿涘潰ain閿涘绱?   - run `23381819139`閿涘澃ha `71e518d644dc884a6f24a0cf1f2b3d8e10116112`閿?   - run `23381923006`閿涘澃ha `b512262b8c515e24602d7166afa5719b68a32bd7`閿?   - run `23382265813`閿涘澃ha `8d462ce433df7d3df45cbcc891138fd9067c6991`閿?2. 閺嶆悂鐛欐稉濠呭牚 run 閻?job 缁狙呯波閺嬫粣绱癭Refactor Gate`閵嗕梗Smoke (pages/index-ui/history)`閵嗕梗Release Ready`閵嗕梗Diagnostics Index` 閸忋劑鍎?`completed/success`閵?3. 閸︺劑鍣风粙瀣暥閻婢樻稉顓炵殺 WS8-01 閻樿埖鈧胶鏁?`in_progress` 閺囧瓨鏌婃稉?`done`閿涘苯鑻熼崶鐐诧綖 F sign-off 缂佹捁顔戞稉?`pass`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝欼nvoke-RestMethod https://api.github.com/repos/jieChris/2048-next/actions/runs?per_page=30`
  - 缂佹挻鐏夐敍姘灇閸旂喕骞忛崣?run 閸掓銆冮獮鍓佲€樼拋銈堢箾缂侇厽鍨氶崝?run id
  - 閸涙垝鎶ら敍姝欼nvoke-RestMethod https://api.github.com/repos/jieChris/2048-next/actions/runs/{id}/jobs?per_page=20`
  - 缂佹挻鐏夐敍? 娑?run 閻ㄥ嫬鍙ч柨?job 閸忋劑鍎?success
  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牊婀伴崷?refactor gate 閸忋劎璞㈤敍灞芥嫲 CI 缂佹捁顔戞稉鈧懛杈剧礆
- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱8 瀹稿弶鏁归崣锝忕礉瑜版挸澧犳稉鏄忣洣妞嬪酣娅撻崚鍥ㄥ床娑?WS3-02 鐏忛箖銆嶉敍鍧塱agnostics payload fallback 閸愭ぞ缍戦敍澶婃嫲閸氬海鐢?WS4/WS6 閸氼垰濮╅懞鍌氼殧閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电浠涢悞?WS3-02 鐏忛箖銆嶅〒鍛倞楠炶泛鎮撳銉﹀鐠?WS4/WS6 娴犺濮熼幏鍡楀瀻閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 缂佈呯敾 WS3-02閿涙氨绨跨粻鈧?diagnostics payload 閹靛浼?fallback 閸愭ぞ缍戠捄顖氱窞閵?2. 閸氼垰濮?WS4/WS6 娑撳绔撮幍閫涙崲閸斺剝濯堕崚鍡曠瑢鐠愶絼鎹㈤崚鍡涘帳閵?3. 閺囧瓨鏌婇柌宀€鈻肩喊鎴炩偓鏄忣潔娑?M1/M3 閻ㄥ嫰妯佸▓鐢电波鐠佽桨绗岄崥搴ｇ敾閻╊喗鐖ｉ妴?
## [2026-03-22] Batch-WS3-12
- 閻╊喗鐖ｉ敍姘辨埛缂侇厽甯规潻?WS3-02閿涘苯鍨归梽?`local_history_store` 娑?owner/diagnostics 閸愭ぞ缍?runtime 閸掑棙鏁敍灞芥祼閸栨牕宕熸稉鈧捄顖氱窞閵?- 鐎瑰本鍨氭い鐧哥窗
1. `js/local_history_store.js`閿涙氨些闂?`resolveRuntimeNormalizedHistoryOwnerMeta()`閿涘wner fallback 缂佺喍绔寸挧?`resolveOwnerMetaFromRaw()` 閺堫剙婀磋ぐ鎺嶇閸栨牓鈧?2. `js/local_history_store.js`閿涙氨些闂?`resolveRuntimeNormalizedDiagnosticsIndexEntries()` 娑?`preferRuntime` 閸掑棙鏁敍瀹抜agnostics fallback 缂佺喍绔寸挧鐗堟拱閸︽澘缍婃稉鈧崠鏍モ偓?3. `js/local_history_store.js`閿涙瓪normalizeRecord()` 娣囨繃瀵旈垾娓瀠ntime 鐠佹澘缍嶈ぐ鎺嶇閸栨牗鍨氶崝鐔烘纯閹恒儱顦查悽顭掔礉閸氾箑鍨?fallback閳ユ繂寮荤捄顖氱窞閿涘矂浼╅崗宥呮倱娑撯偓鐠佹澘缍嶆禍灞绢偧 runtime 鐠嬪啰鏁ら妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?7 tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱3-02 鏉╂稑鍙嗙亸楣冦€嶉梼鑸殿唽閿涘奔瀵岀憰浣规Ц閸掋倖鏌?diagnostics payload fallback 閺勵垰鎯佺紒褏鐢绘穱婵堟殌娑撹櫣顬囩痪鍨幑鎼存洏鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电绶崙鐑樻暪閸欙絽鍨介弬顓ㄧ礄娣囨繄鏆€/娑撳鐭囬敍澶婂挤鐎电懓绨插ù瀣槸缁涙牜鏆愰妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 鏉堟挸鍤?WS3-02 閺€璺哄經閸掋倖鏌囬獮鑸垫纯閺傛壆濮搁幀浣碘偓?2. 閸氼垰濮?WS4/WS6 娑撳绔撮幍閫涙崲閸斺剝濯堕崚鍡曠瑢閸掑棗浼愰妴?3. 閺囧瓨鏌?M3 娑撳绔撮梼鑸殿唽妤犲本鏁归崣锝呯窞閵?
## [2026-03-22] Batch-WS3-13-WS6-01
- 閻╊喗鐖ｉ敍姘暚閹?WS3-02 閺€璺哄經閸掋倖鏌囬敍灞借嫙閸氼垰濮?WS6-01 妫ｆ牞鐤嗛幏鍡楀瀻閸╄櫣鍤庨妴?- 鐎瑰本鍨氭い鐧哥窗
1. 鐎?WS3-02 缂佹瑥鍤弨璺哄經缂佹捁顔戦敍姘瘜闁炬崘鐭鹃崢鍡楀蕉缂佹挻鐎鑼埠娑撯偓閸?runtime/contracts閿涘畺allback 娴犲懍绻氶悾娆忓悑鐎圭懓鍘规惔鏇樷偓?2. 娴犺濮熷Ч鐘靛Ц閹焦娲块弬甯窗WS3-02 閻?`in_progress` 閸掑洦宕叉稉?`done`閿涙矅S6-01 閻?`pending` 閸掑洦宕叉稉?`in_progress`閵?3. 娴溠冨毉 WS6-01 妫ｆ牞鐤嗛幍顐ｅ伎閸╄櫣鍤庨敍姝歴rc/entries` 娑?direct `localStorage` 2 婢跺嫸绱欓崸鍥ф躬 `home-family-shared.ts`閿涘绱漝irect `fetch` 0 婢跺嫨鈧?4. 閸忋儱褰涙担鎾堕兇閸╄櫣鍤庣涵顔款吇閿涙瓪npm run audit:entry-manifest` 闁俺绻冮妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run audit:entry-manifest`
  - 缂佹挻鐏夐敍姝匒SS閿涘潰anifest 妞瑰崬濮╅崗銉ュ經娑撳酣銆庢惔蹇涙，缁備線鈧俺绻冮敍?  - 閸涙垝鎶ら敍姝歋elect-String -Path src/entries/*.ts -Pattern "localStorage\\."`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉顓ㄧ礄`home-family-shared.ts:422/442`閿?  - 閸涙垝鎶ら敍姝歋elect-String -Path src/entries/*.ts -Pattern "fetch\\("`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱3 瀹稿弶鏁归崣锝忕礉瑜版挸澧犳搴ㄦ珦鏉烆剛些娑?WS6 閻ㄥ嫰銆夐棃銏犵穿鐎靛吋鈧?localStorage 閺€璺哄經缁涙牜鏆愰敍鍫熸Ц閸氾妇鎾奸崗銉х埠娑撯偓 helper閿涘鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹靛湱娲块幒銉ヮ槱閻炲棔绗傛潻?2 婢跺嫮鍋ｆ担宥呰嫙鐞涖儲娓剁亸蹇撴礀瑜版帇鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. WS6-01閿涙艾顦╅悶?`home-family-shared.ts` 閻?2 婢?localStorage 閻╃绻涢悙閫涚秴閵?2. WS4閿涙俺绶崙娲姜缂佺喍绔撮崗銉ュ經妞ょ敻娼版径鍕枂娴兼ê鍘涚痪褝绱欑痪宕囶吀/瑜版帗銆?閸掔娀娅庨敍澶堚偓?3. 閸掗攱鏌?M3/M4 闂冭埖顔屾灞炬暪閸欙絽绶為妴?
## [2026-03-22] Batch-WS6-02
- 閻╊喗鐖ｉ敍姘暚閹?WS6-01 妫ｆ牗澹掔€圭偘缍旈敍灞剧閻?`src/entries` 閸撯晙缍?localStorage 閻╃绻涢悙閫涚秴閵?- 鐎瑰本鍨氭い鐧哥窗
1. `src/entries/home-family-shared.ts`閿涙艾鐨㈠鏇烆嚤濞搭喖鐪伴弽鍥唶閻ㄥ嫯顕伴崣?閸愭瑥鍙嗘禒?`window.localStorage.*` 閺€閫涜礋 `readStorageFlagFromContext` / `writeStorageFlagFromContext`閵?2. 婢跺秵澹?`src/entries`閿涙瓰irect `localStorage` 娴?2 婢跺嫰妾烽崚?0 婢跺嫸绱漝irect `fetch` 娣囨繃瀵?0 婢跺嫨鈧?3. 婢跺秹鐛欓崗銉ュ經闂傘劎顩︽稉搴濆瘜闂傘劎顩﹂敍姝歛udit:entry-manifest`閵嗕梗verify:prepush` 閸у洭鈧俺绻冮妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歋elect-String -Path src/entries/*.ts -Pattern "localStorage\\."`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉?  - 閸涙垝鎶ら敍姝歯pm run audit:entry-manifest`
  - 缂佹挻鐏夐敍姝匒SS
  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?7 tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歴rc/entries` 瀹稿弶绔婚梿璁圭礉娴?`src+js` 閹缍嬫禒宥呯摠閸︺劌宸婚崣鎻掔湴 `localStorage` 鐎涙﹢鍣洪敍瀛窼6 娴犲秹娓堕崚鍡楃厵閹恒劏绻橀妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃澧跨仦鏇炲煂 `src/features` / `src/app` 鏉堝湱鏅幍顐ｅ伎閿涘苯鑻熻ぐ銏″灇閸掑棗鐓欏〒鍛倞鐠佲€冲灊閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. WS6-01閿涙碍澧跨仦鏇熷閹诲繐鍩?`src/features` / `src/app` 楠炴儼绶崙鍝勫瀻閸╃喓鍋ｆ担宥嗙閸楁洏鈧?2. WS4閿涙俺绶崙?4 娑擃亪娼紒鐔剁閸忋儱褰涙い鐢告桨閻ㄥ嫬顦╃純顔荤喘閸忓牏楠囨稉搴ょ讣缁夋槒鐭惧鍕┾偓?3. 閺囧瓨鏌?WS6 閻?done 閺夆€叉娑撳氦顩惄鏍芳閹稿洦鐖ｉ妴?
## [2026-03-22] Batch-WS6-03
- 閻╊喗鐖ｉ敍姘辨埛缂侇厽甯规潻?WS6-01閿涘本濡?storage 鐠佸潡妫舵禒搴㈡殠閻愮鐨熼悽銊︽暪閺佹稐璐?helper閿涘苯鑻熺涵顔款吇 `src` 鐏炲倻娲挎潻鐐剁殶閻劍绔婚梿韬测偓?- 鐎瑰本鍨氭い鐧哥窗
1. `src/storage/history-idb.ts`閿涙碍鏌婃晶?migration-only localStorage helper閿涘潉resolveLocalStorage/readLocalStorageItem/writeLocalStorageItem`閿涘绱濋弴澶稿敩鏉╀胶些濞翠胶鈻兼稉顓犳畱閺侊絿鍋ｉ惄瀛樺复鐠囪鍟撻妴?2. `src` 閸掑棗鐓欐径宥嗗閿涙瓪bootstrap/contracts/core/entries/storage/utils` 閻╊喖缍嶆稉?direct `localStorage` 娑?direct `fetch` 閸у洣璐?0閵?3. 閸忋劑鎽肩捄顖炴，缁備礁顦叉宀嬬窗`npm run verify:prepush` 闁俺绻冮妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歋elect-String -Path src/**/*.ts,src/**/*.js -Pattern "localStorage\\.|fetch\\("`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歴rc` 鐏炲倸鍑″〒鍛存祩閿涘奔绲?`js` 閸樺棗褰剁仦鍌欑矝閺堝鐡ㄩ柌蹇ョ礉WS6 鐏忔碍婀崗銊ょ波閺€璺哄經閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃瀵滄姗€顣舵い鐢告桨娴兼ê鍘涚痪褎绔婚悶?`js` 鐏炲倻娲挎潻?storage/network 鐠嬪啰鏁ら妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閹殿偅寮块獮璺哄瀻缁?`js` 鐏?direct `localStorage` / `fetch` 閻愰€涚秴閵?2. 闁藉牆顕姗€顣舵い鐢告桨閸忓牆浠涙稉鈧幍鍦仯娴ｅ秵鏁归弫娑崇礄閸欘垰娲栧姘毈閹佃顐奸敍澶堚偓?3. 閸氬本顒為弴瀛樻煀 WS6 閻ㄥ嫧鈧粓妯佸▓浣冩彧閹存劏鈧繀绗岄垾婊勬付缂佸牐鎻幋鎰ㄢ偓婵嗗蓟鐏炲倿鐛欓弨鑸电垼閸戝棎鈧?
## [2026-03-22] Batch-WS6-04
- 閻╊喗鐖ｉ敍姘崇箻閸?WS6 閸樺棗褰剁仦鍌氱杽閺備粙妯佸▓纰夌礉鐎瑰本鍨氭＃鏍﹂嚋妤傛﹢顣舵い鐢告桨閻ㄥ嫭鏆庨悙?storage 鐠嬪啰鏁ら弨鑸垫殐閵?- 鐎瑰本鍨氭い鐧哥窗
1. `js/history_page.js`閿涙艾绱╅崗銉┿€夐崘?localStorage helper閿涘本娴涢幑?`ui_language` 娑撳氦绻冨銈呮珤閻樿埖鈧胶娈戦弫锝囧仯 direct 鐠囪鍟撻妴?2. `src/storage/history-idb.ts`閿涙俺绺肩粔鏄忕熅瀵?localStorage 鐠佸潡妫堕梿鍡曡厬閸?helper閿涘潰igration-only閿涘绱漙src` 鐏炲倹瀵旂紒顓濈箽閹?0 閻╃绻涢崨鎴掕厬閵?3. `js` 閻愰€涚秴閸掑棛楠囩€瑰本鍨氶敍姝峯p 閺傚洣娆㈡稉?`user_profile_page.js`閵嗕梗local_history_store.js`閵嗕梗theme_manager.js`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鍙忛柧鎹愮熅閿?  - 閸涙垝鎶ら敍姝欸et-ChildItem src,js ... + Select-String "localStorage\\.|fetch\\("`
  - 缂佹挻鐏夐敍姝歴rc+js localStorage=40`閵嗕梗src+js fetch=7`閿涘牏娴夋潏鍐浕鏉烆喖鐔€缁?`50/7`閿?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歫s` 閸樺棗褰剁仦鍌欑矝閺?40 婢?localStorage 鐎涙﹢鍣洪敍宀勬付鐟曚焦瀵滄搴ㄦ珦娴兼ê鍘涚痪褍鍨庨幍瑙勬暪閺佹稏鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涚喘閸忓牊鏁奸柅?`user_profile_page.js`閿涘牆缍嬮崜?total=7閿涘鑻熸穱婵囧瘮鐏忓繑澹掑▎鈥冲讲閸ョ偞绮撮妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 婢跺嫮鎮?`js/user_profile_page.js` 閻?storage 閺侊絿鍋ｇ拋鍧楁６閺€鑸垫殐閵?2. 缂佈呯敾缂佸瓨濮㈠В蹇斿 `src+js` 閸涙垝鑵戦弫鎷岀Ъ閸斿尅绱濋柌蹇撳 WS6 閹恒劏绻橀柅鐔峰閵?3. 鐞涙梹甯?WS4 閸忋儱褰涙径鍕枂濞撳懎宕熼敍宀勪缉閸忓秵鏌婇弫锝囧仯閸忋儱褰涢崣宥呰剨閵?
## [2026-03-22] Batch-WS6-05
- 閻╊喗鐖ｉ敍姘辨埛缂?WS6 妤傛﹢顣堕弬鍥︽閺€鑸垫殐閿涘苯鐣幋?`user_profile_page` 閻?storage 閺侊絿鍋ｅ〒鍛倞閵?- 鐎瑰本鍨氭い鐧哥窗
1. `js/user_profile_page.js` 閺傛澘顤?storage helper閿涘本娴涢幑?key 鏉╀胶些閵嗕辜oken/鐠囶叀鈻堢拠璇插絿閵嗕购eplay 娴兼俺鐦介崘娆忓弳娑擃厾娈?direct `localStorage/sessionStorage` 鐠嬪啰鏁ら妴?2. `user_profile_page` 閺傚洣娆㈢痪褎瀵氶弽鍥у綁閸栨牭绱癭localStorage/sessionStorage` 閻╃绻涢崨鎴掕厬 `5 -> 0`閿涘畭fetch` 娣囨繃瀵?`2`閵?3. `src+js` 閹鍣洪幐鍥ㄧ垼閸欐ê瀵查敍姝歭ocalStorage` `40 -> 35`閿涘畭fetch` `7 -> 7`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鍙忛柧鎹愮熅閿?  - 閸涙垝鎶ら敍姝歋elect-String -Path js/user_profile_page.js -Pattern "localStorage\\.|sessionStorage\\."`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歫s` 鐏炲倸鐨婚張?`localStorage=35` 鐎涙﹢鍣洪敍灞肩瑬 `fetch=7` 闂団偓鐟曚礁灏崚鍡忊偓婊堛€夐棃銏㈡纯鏉╃偐鈧繀绗岄垾娣嶱I helper 鐏忎浇顥婇垾婵嗘倵閸愬秵绔婚悶鍡愨偓?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涚喘閸忓牆顦╅悶?`local_history_store.js` 娑?`theme_manager.js`閿涘苯鑻熺悰?fetch 閻愰€涚秴閸掑棛琚憴鍕灟閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 婢跺嫮鎮?`js/local_history_store.js` 閻?storage 閺侊絿鍋ｉ弨鑸垫殐閵?2. 婢跺嫮鎮?`js/theme_manager.js` 閻?storage 閺侊絿鍋ｉ弨鑸垫殐閵?3. 鏉堟挸鍤?`js` 鐏?fetch 閻愰€涚秴閸掑棛琚敍鍫滅箽閻?閺€鑸垫殐閿涘鑻熼崶鐐诧綖閺傚洦銆傞妴?
## [2026-03-22] Batch-WS6-06
- 閻╊喗鐖ｉ敍姘辨埛缂?WS6 妤傛﹢顣堕弬鍥︽閺€鑸垫殐閿涘本绔婚悶?`local_history_store` 娑?`theme_manager` 閻?localStorage 閺侊絿鍋ｇ拋鍧楁６閵?- 鐎瑰本鍨氭い鐧哥窗
1. `js/local_history_store.js`閿涙碍鏌婃晶?localStorage helper閿涘澁esolve/read/write閿涘绱濋弴鎸庡床鏉╀胶些閺嶅洩顔囬妴涔玜llback 鐠囪鍟撻妴涔th 娣団剝浼呯拠璇插絿娑擃厾娈?direct 鐠嬪啰鏁ら妴?2. `js/theme_manager.js`閿涙碍鏌婃晶?localStorage helper閿涘澁esolve/read/write閿涘绱濋弴鎸庡床娑撳顣芥稉搴ゅ閺夊灝鐡ㄩ崣?direct 鐠嬪啰鏁ら妴?3. 閹稿洦鐖ｉ弴瀛樻煀閿涙瓪src+js localStorage` 娴?`35` 闂勫秷鍤?`23`閿涘畭src+js fetch` 娣囨繃瀵?`7`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歋elect-String -Path js/local_history_store.js,js/theme_manager.js -Pattern "localStorage\\."`
  - 缂佹挻鐏夐敍? 婢跺嫬鎳℃稉?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘牆鍙忛柧鎹愮熅閿?  - 閸涙垝鎶ら敍姝欸et-ChildItem src,js ... + Select-String "localStorage\\.|fetch\\("`
  - 缂佹挻鐏夐敍姝歴rc+js localStorage=23`閵嗕梗src+js fetch=7`
- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歫s` 鐏炲倷绮涢張?`localStorage=23`閵嗕梗fetch=7`閿涘苯鍙炬稉顓㈢彯娴兼ê鍘涚痪褔娉︽稉顓炴躬 `online_leaderboard_runtime.js` 娑?`account_page.js`閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涚喘閸忓牆顦╅悶鍡曠瑐鏉╅琚遍弬鍥︽閿涘苯鑻熺悰?fetch 閻愰€涚秴閸掑棛琚憴鍕灟閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 婢跺嫮鎮?`js/online_leaderboard_runtime.js` 娑?`js/account_page.js` 閻?storage 閺侊絿鍋ｉ妴?2. 鏉堟挸鍤?fetch 閻愰€涚秴閳ユ粌鍘戠拋?閺€鑸垫殐閳ユ繆顫夐崚娆忚嫙閸ョ偛锝為弬鍥ㄣ€傞妴?3. 閹镐胶鐢婚崶鐐诧綖 `src+js` 閹稿洦鐖ｇ搾瀣◢閵?
## [2026-03-22] Batch-WS6-08
- 閻╊喗鐖ｉ敍姘辨埛缂?WS6-01 閺€鑸垫殐閿涘本濡搁崜鈺€缍戞妯衡偓鍏兼瀮娴犺绱檃pi_shared_utils / refactor_cutover_migration / replay_ui閿涘娈?storage 閻╁瓨甯寸拋鍧楁６濞撳懘娴傞妴?- 鐎瑰本鍨氭い鐧哥窗
1. `js/api_shared_utils.js`閿涙碍鏌婃晶?`resolveLocalStorage` 楠炶泛鐨?`safeGetStorage/safeSetStorage/safeRemoveStorage` 缂佺喍绔撮弨閫涜礋 helper 鐠侯垰绶為敍宀€些闂?direct `localStorage.*`閵?2. `js/refactor_cutover_migration.js`閿涙艾鐨?`safeGet/safeSet/safeRemove` 閺€閫涜礋閸╄桨绨?resolver 閻ㄥ嫯顔栭梻顕嗙礉楠炶泛婀潻浣盒╅崗銉ュ經婢х偛濮?storage 閸欘垳鏁ら幀褏鐓捄顖欑箽閹躲們鈧?3. `js/replay_ui.js`閿涙碍鏌婃晶?`resolveLocalStorage/resolveSessionStorage` 閸欏﹨顕伴崘?helper閿涘矁顕㈢懛鈧拠璇插絿娑撳簼绨粩顖氭礀閺€?payload 鐠囪鍟撻弨閫涜礋 helper 鐠嬪啰鏁ら妴?4. 閹稿洦鐖ｈ箛顐ゅ弾閺囧瓨鏌婇敍姝歴rc+js localStorage 15 -> 7`閿涘畭src+js fetch 7 -> 7`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-account-login-storage.smoke.spec.ts tests/smoke/pages-account-settings.smoke.spec.ts tests/smoke/pages-replay-import.smoke.spec.ts tests/smoke/pages-replay-runtime.smoke.spec.ts`
  - 缂佹挻鐏夐敍姘额浕鏉?1 娓?`pages-account-settings` 鐡掑懏妞傞敍娑樺礋濞村鍣哥捄鎴︹偓姘崇箖閿涘苯鍨界€规矮璐熼崑璺哄絺鐡掑懏妞傞妴?  - 閸涙垝鎶ら敍姝歯px playwright test --config=playwright.config.ts tests/smoke/pages-account-settings.smoke.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閵?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍澶堚偓?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝歠etch` 閹稿洦鐖ｉ張顏冪瑓闂勫稄绱濋崜鈺€缍戦悙閫涚秴闂団偓閹稿鈧穾PI helper 閸愬懍绻氶悾?vs 妞ょ敻娼伴惄纾嬬箾閺€鑸垫殐閳ユ繂鍨庣猾缁樺腹鏉╂稏鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹甸€涚喘閸忓牆顦╅悶?`core_custom_spawn/core_i18n/pku2048_inline_stats/core_timer_module` 閻?localStorage 閺€璺虹啲閿涘苯鑻熸潏鎾冲毉 fetch 閸掑棛琚憴鍕灟閵?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 婢跺嫮鎮婇崜鈺€缍?localStorage 閺傚洣娆㈤敍灞惧腹閸斻劍鈧鍣烘禒?`7` 缂佈呯敾娑撳妾烽妴?2. 鏉堟挸鍤?fetch 閻愰€涚秴閸掑棛琚憴鍕灟楠炶泛鍟撻崗?guardrails/roadmap閵?3. 婢跺秷绐囩€规艾鎮?smoke + prepush閿涘瞼娣幐?WS6 閺€鑸垫殐閼哄倸顨旈妴?
## [2026-03-22] Batch-WS6-09
- 閻╊喗鐖ｉ敍姘暚閹?WS6 閻?`localStorage` 鐏忛箖銆嶉弨璺哄經閿涘本濡?`src+js localStorage` 閹稿洦鐖ｉ崢瀣煂 0閵?- 鐎瑰本鍨氭い鐧哥窗
1. `js/core_custom_spawn_runtime.js`閿涙瓪resolveUiLang` 閺€閫涜礋闁俺绻?`resolveLocalStorage` 鐠囪褰?`ui_language_v1`閿涘瞼些闂?direct `localStorage.*`閵?2. `js/core_i18n_runtime.js`閿涙瓪readLanguage/saveLanguage` 閺€閫涜礋 resolver/helper 鐠佸潡妫堕敍宀€些闂?direct `localStorage.*`閵?3. `js/pku2048_inline_stats_runtime.js`閿涙瓪readText/writeText` 閺€閫涜礋 resolver/helper 鐠侯垰绶為敍宀€些闂?direct `localStorage.*`閵?4. `js/core_timer_module_runtime.js`閿涙瓪resolveLang` 閺€閫涜礋 resolver/helper 鐠侯垰绶為敍宀€些闂?direct `localStorage.*`閵?5. 閹稿洦鐖ｈ箛顐ゅ弾閺囧瓨鏌婇敍姝歴rc+js localStorage 7 -> 0`閿涘畭src+js fetch 7 -> 7`閵?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍澶堚偓?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝磘orage 閻╃绻涘鍙夌闂嗚绱濊ぐ鎾冲娑撴槒顩︽搴ㄦ珦鏉烆兛璐?`fetch` 閻愰€涚秴鏉堝湱鏅張顏勭暚閸忋劌鍩楁惔锕€瀵查妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电绶崙?fetch 閸掑棛琚憴鍕灟楠炶泛浠涙い鐢告桨閻╃绻涢弨鑸垫殐濞撳懎宕熼妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 鐎?7 婢?`fetch` 閻愰€涚秴閸掑棗鐪伴敍娆癙I helper 閸忎浇顔忛妴渚€銆夐棃銏㈡纯鏉╃偛绶熼弨鑸垫殐閵?2. 鐏忓棗鍨庣仦鍌濐潐閸掓瑥鍟撻崗?guardrails/roadmap 楠炶泛娴愰崠鏍﹁礋鐎孤ゎ吀濡偓閺屻儵銆嶉妴?3. 缂佈呯敾濮ｅ繑澹掗崗銊╂懠鐠侯垶鐛欑拠渚婄礉绾喕绻?`localStorage=0` 娑撳秴寮藉骞库偓?
## [2026-03-22] Batch-WS6-10
- 閻╊喗鐖ｉ敍姘暚閹?WS6 閻ㄥ嫰銆夐棃銏犵湴 `fetch` 閺€鑸垫殐閿涘本绔婚梿?`src+js` direct `fetch` 閹稿洦鐖ｉ妴?- 鐎瑰本鍨氭い鐧哥窗
1. `js/api_shared_utils.js` 閺傛澘顤?`callFetch(url, requestInit)` 缂佺喍绔寸純鎴犵捕鐠佸潡妫堕崗銉ュ經閵?2. `js/account_page.js`閵嗕梗js/account_settings_page.js`閵嗕梗js/online_leaderboard_runtime.js`閵嗕梗js/password_page.js`閵嗕梗js/register_page.js`閵嗕梗js/user_profile_page.js` 缂佺喍绔撮弨閫涜礋闁俺绻?`callFetch` 閸欐垿鈧浇顕Ч鍌︾礉缁夊娅庢い鐢告桨鐏?direct `fetch`閵?3. 閹稿洦鐖ｈ箛顐ゅ弾閺囧瓨鏌婇敍姝歴rc+js localStorage 0 -> 0`閿涘畭src+js fetch 7 -> 0`閿涘牆寮诲〒鍛存祩閿涘鈧?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姝匒SS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍澶堚偓?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秳瀵岀憰渚€顥撻梽鈺€绮犻垾婊€鍞惍浣规殠閻愬厜鈧繆娴嗘稉琛♀偓婊嗩潐閸掓瑥娴愰崠鏍も偓婵撶礉閸楁娊娓剁憰浣瑰Ω閺€鑸垫殐缂佹挻鐏夊▽澶嬬┅閹?guardrail 娑撳骸顓哥拋陇顫夐崚娆欑礉闂冨弶顒涢崥搴ｇ敾閸ョ偞绁﹂妴?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹电藟姒?guardrails + audit 鐟欏嫬鍨敍灞借嫙閸嬫俺绻涚紒?CI 鐟欏倸鐧傞妴?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 閸?guardrails 閺勫海鈥?storage/fetch 鏉堝湱鏅獮鍓佺拨鐎规艾顓哥拋陇鍓奸張顑锯偓?2. 鐎规矮绠?WS6-01 `done` 閺夆€叉閿涘牆鎯?CI 鏉╃偟鐢荤憴鍌氱檪閿涘鈧?3. 閼辨柨濮?WS4 妞ょ敻娼伴崗銉ュ經濞撳懎宕熼敍宀勪缉閸忓秵鏌婃晶鐐恒€夐棃銏㈢搏瀵偓 shared helper/service閵?
## [2026-03-22] Batch-WS6-11
- 閻╊喗鐖ｉ敍姘Ω WS6 閻ㄥ嫯绔熼悾灞炬暪閺佹稓绮ㄩ弸婊冩祼閸栨牗鍨氬锝呯础闂傘劎顩﹂敍灞借嫙閹恒儱鍙?refactor gate閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閺傛澘顤?`scripts/service-boundary-audit.mjs`閿涙碍澹傞幓?`src+js`閿涘矂妯嗛弬?direct `localStorage.*` / `sessionStorage.*` / `fetch(...)`閵?2. 閺傛澘顤?`tests/unit/service-boundary-audit-helpers.spec.ts`閿涙俺顩惄鏍熅瀵板嫬缍婃稉鈧崠鏍モ偓浣告倵缂傗偓鏉╁洦鎶ら妴涔竌ttern 閸涙垝鑵戦妴浣界箽鐟欏嫭鏁归弫娑楃瑢閹躲儵鏁婄捄顖氱窞閵?3. `package.json` 閺傛澘顤?`audit:service-boundary`閿涙矖scripts/refactor-gate.mjs` 閺傛澘顤?`service-boundary-audit` 濮濄儵顎冩稉?timeout/env key 閺勭姴鐨犻妴?4. `docs/ARCHITECTURE_GUARDRAILS.md` 妞ゅ爼鍎撮弬鏉款杻 guardrail update閿涘本妲戠涵?`R4/R5` 閻ㄥ嫭顒滃?CI 閺勭姴鐨犳稉搴＄秼閸撳秴寮诲〒鍛存祩閸╄櫣鍤庨妴?- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯pm run audit:service-boundary`
  - 缂佹挻鐏夐敍姝匒SS閿涘潚iles=327, violations=0閿涘鈧?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿?5 tests閿涘鈧?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姘付缂?PASS閿涘澁efactor gate 閸忋劑鎽肩捄顖炩偓姘崇箖閿涘鈧?  - 鏉╁洨鈻兼径鍥ㄦ暈閿涙岸顩诲▎掳鈧胶顑囨禍灞绢偧 `verify:prepush` 閸掑棗鍩嗛柆鍥у煂閸樺棗褰?smoke 閸嬭泛褰傜搾鍛閿?    - `pages-ui-regressions.smoke.spec.ts` 閸楁洘绁存径宥堢獓闁俺绻冮敍?    - `pages-replay-runtime.smoke.spec.ts` 閸楁洘绁存径宥堢獓闁俺绻冮敍?    - 缁楊兛绗佸▎鈥崇暚閺?`verify:prepush` 閸忋劎璞㈤敍灞藉灲鐎规矮璐熼悳鐗堟箒 flaky smoke閿涘奔绗夐弰顖涙拱閹靛綊妫粋浣告礀瑜版帇鈧?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姘秼閸撳秳瀵岀憰渚€顥撻梽鈺勬祮娑?smoke 閸嬭泛褰傜搾鍛娑撳酣妫粋浣风伐婢舵牜鐡ラ悾銉ョ毣閺堫亜鍩楁惔锕€瀵查敍宀冣偓宀勬姜 storage/fetch 鏉堝湱鏅張顒冮煩閵?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹佃妲戠涵?WS6-01 `done` 閺夆€叉閿涘苯鑻熺拠鍕強 `service-boundary-audit` 閻ㄥ嫬鍘戠拋绋挎倳閸楁洜鐡ラ悾銉ｂ偓?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 缂佹瑥鍤?WS6-01 `done` 閻ㄥ嫮绨跨涵顔肩暰娑斿绗屾潻鐐电敾 CI 鐟欏倸鐧傞弽鍥у櫙閵?2. 鐠囧嫪鍙婇弰顖氭儊闂団偓鐟曚椒璐?helper/service 鐏炲倷绻氶悾娆忓讲鐎孤ゎ吀娓氬顦婚崚妤勩€冮妴?3. 閹镐胶鐢荤憴鍌氱檪 smoke flaky 閻愰€涚秴閿涘苯绻€鐟曚焦妞傞崡鏇犲閺€鑸垫殐濞村鐦粙鍐茬暰閹佲偓?
### WS6-01 `done` 闁偓閸戠儤娼禒璁圭礄閼藉顢嶉敍?1. 閹稿洦鐖ｉ弶鈥叉閿涙瓪src+js direct localStorage = 0`閿涘畭src+js direct fetch = 0`閵?2. 闂傘劎顩﹂弶鈥叉閿涙瓪npm run audit:service-boundary` 瀹稿弶甯撮崗?`verify:prepush` 娑撴柧绻氶幐渚€鈧俺绻冮妴?3. 缁嬪啿鐣鹃幀褎娼禒璁圭窗娑撹鍨庨弨顖濈箾缂?3 鏉?CI 闁俺绻冮敍灞炬￥ `service-boundary-audit` 閸ョ偞绁﹂崨濠咁劅閵?4. 閺傚洦銆傞弶鈥叉閿涙瓪docs/ARCHITECTURE_GUARDRAILS.md`閵嗕梗docs/ROADMAP_MILESTONES.md`閵嗕梗docs/EXECUTION_LOG.md` 瀹告彃鎮撳銉唶瑜版洝绔熼悾灞肩瑢鐠囦焦宓侀妴?5. 娓氬顦婚弶鈥叉閿涙矮鎹㈡担鏇氱伐婢舵牠鍏樿箛鍛淬€忛崗鍫濊埌閹存劕褰茬€孤ゎ吀閻ц棄鎮曢崡鏇熷灗 ADR閿涘苯鎯侀崚?WS6-01 娑撳秴绶辨潪?`done`閵?## [2026-03-22] Batch-WS4-03-WS6-12
- 閻╊喗鐖ｉ敍姘Ω WS4 閻ㄥ嫰銆夐棃銏犲弳閸欙絽鈧搫濮熸禒搴樷偓婊€姹夊銉吇閻儮鈧繃鏁归弫娑楄礋閳ユ粏鍤滈崝銊ュ讲鐎孤ゎ吀濞撳懎宕熼垾婵撶礉楠炲墎鈥樼拋銈勭瑝娴兼氨鐗崸蹇曞箛閺?gate閵?- 鐎瑰本鍨氭い鐧哥窗
1. 閹碘晛鐫?`scripts/entry-manifest-audit.mjs`閿涙碍鏌婃晶?16 娑?2048 妞ょ敻娼伴崗銉ュ經閻ㄥ嫭妯夊蹇撳瀻缁槒銆冮敍灞藉隘閸?`manifest-bootstrap` 娑?`direct-module`閵?2. 閺傛澘顤?`detectEntryArchitecture / collectPageEntryRecords / ensureAllPageEntriesExist / ensurePageEntryArchitectures`閿涘本濡搁崗銉ュ經閸掑棛琚妴浣哄繁閸欙絽鎷板鍌溞╅崣妯诲灇濮濓絽绱＄€孤ゎ吀闁槒绶妴?3. 閺囧瓨鏌?`tests/unit/entry-manifest-audit-helpers.spec.ts`閿涘矁藟姒绘劕鍙嗛崣锝呭瀻缁绗岄弸鑸电€鍌溞╅惄绋垮彠閺傤叀鈻堥妴?4. 瑜版挸澧犻崗銉ュ經閸掑棛琚紒鎾诡啈閿?   - `manifest-bootstrap`閿涙瓪index / undo / capped / practice / pku2048 / play / replay / index_test`
   - `direct-module`閿涙瓪account / account-settings / history / modes / palette / password / register / user-profile`
- 妤犲矁鐦夌拠浣瑰祦閿?  - 閸涙垝鎶ら敍姝歯px vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
  - 缂佹挻鐏夐敍姝匒SS閿? tests閿涘鈧?  - 閸涙垝鎶ら敍姝歯pm run audit:entry-manifest`
  - 缂佹挻鐏夐敍姝匒SS閿涘潷age entries are classified, manifest-driven entries are guarded, and play/replay order is stable閿涘鈧?  - 閸涙垝鎶ら敍姝歯pm run verify:prepush`
  - 缂佹挻鐏夐敍姘付缂?PASS閵?  - 鏉╁洨鈻兼径鍥ㄦ暈閿涙岸顩诲▎鈥崇暚閺佺绻嶇悰灞芥嚒娑擃厽妫﹂張?`index-ui-bootstrap-actions` smoke 閸嬭泛褰傜搾鍛閿涙稑宕熼悽銊ょ伐婢跺秷绐囬柅姘崇箖閿涘苯鎮楃紒顓炵暚閺?`verify:prepush` 閸忋劎璞㈤妴?- 妞嬪酣娅撴稉搴ㄦ▎婵夌儑绱?  - 妞嬪酣娅撶痪褍鍩嗛敍姝?
  - 閹诲繗鍫敍姝怱4 瑜版挸澧犳稉鏄忣洣妞嬪酣娅撳韫矤閳ユ粌鍙嗛崣锝嗘殠閻愰€涚瑝閸欘垵顫嗛垾婵婃祮娑撹　鈧? 娑?direct-module 閸忋儱褰涙担鏇熸楠炶泛鍙嗙紒鐔剁 bootstrap/manifest閳ユ縿鈧?  - 缂傛捁袙閸斻劋缍旈敍姘瑓娑撯偓閹靛湱绮伴崙?direct-module 閸忋儱褰涢惃鍕讣缁夎绱崗鍫㈤獓閸滃矂妯佸▓鍨偓褍顦╅悶鍡欑摜閻ｃ儯鈧?- 娑撳绔村銉礄1-3閺夆槄绱氶敍?1. 娴兼ê鍘涚憴鍕灊 `history / modes / palette` 娑撳銆夋潻浣盒╅敍灞芥礈娑撳搫鐣犳禒顒佹纯閹恒儴绻庢い鐢告桨缁崵绮虹仦鍌濃偓宀勬姜鐠愶箑褰?API 鐏炲倶鈧?2. 閸愬秴顦╅悶?`account-family` 閸ユ盯銆夐敍灞藉枀鐎规碍妲搁獮璺哄弳缂佺喍绔?bootstrap閿涘矁绻曢弰顖氱暰娑斿璐熼梹鎸庢埂閸忎浇顔忛惃?direct-module 閺冨繈鈧?3. 娑?`index.html` 鐞涖儵鏆遍張鐔风暰娴ｅ稄绱濋柆鍨帳娑?2048 妞ょ敻娼扮化鑽ょ埠鏉堝湱鏅紒褏鐢婚崥顐ｈ穿閵?

# 闂佹彃绉甸悗顖炲箥瑜戦、鎴﹀籍閵夈儳绠堕柨娑樼墛缁挳宕濋…鎺旂


