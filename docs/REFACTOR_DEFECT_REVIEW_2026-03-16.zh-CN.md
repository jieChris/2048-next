# 闁插秵鐎柆妤冩殌缂傛椽娅＄€光剝鐓￠幎銉ユ啞閿涘牊绮撮崝銊ゆ叏鐠侇澁绱?026-03-19閿?
> 鐎光剝鐓￠惄顔界垼閿涙碍瀵旂紒顓＄槕閸掝偀鈧粓鍣搁弸鍕弓閺€璺哄經閳ユ繂顕遍懛瀵告畱閻喎鐤勭紓娲娑撳骸浼愮粙瀣棑闂勨晪绱濋獮鑸靛瘻娴兼ê鍘涚痪褍鐨銉﹀腹鏉╂冻绱欑亸蹇斿濞喡扳偓浣稿讲妤犲矁鐦夐妴浣稿讲閸ョ偞绮撮敍澶堚偓?
## 瑜版挸澧犻悩鑸碘偓渚婄礄缁嬭櫕鈧胶绮ㄧ拋鐚寸礆

- 鐠愩劑鍣洪梻銊ь洣閿涙瓪audit:quality` 缁嬪啿鐣炬稉?**0 閸涘﹨顒?*閿涘牆顦查弶鍌氬/閼帮箑鎮?闁插秴顦查崸鍥﹁礋 0閿涘鈧?- 閸ョ偛缍婇梻銊ь洣閿涙瓪verify:refactor --smoke-script=test:smoke:runtime-contract` 缁嬪啿鐣鹃柅姘崇箖閵?- 閸楁洘绁存稉搴㈢€鐚寸窗`test:unit`閵嗕梗build` 閸у洦瀵旂紒顓⑩偓姘崇箖閵?- 妞嬪酣娅撶粵澶岄獓閿?  - 閸旂喕鍏樺锝団€橀幀褔顥撻梽鈺嬬窗娴?  - 閸欘垳娣幎銈嗏偓褔顥撻梽鈺嬬窗娴?  - 鏉╊厺鍞弫鍫㈠芳妞嬪酣娅撻敍姘秵閿涘牆鍑℃禒搴樷偓婊勪笉閻炲棗鐡ㄩ柌蹇娾偓婵婃祮閸忋儮鈧粓妲婚崣宥呰剨閳ユ繈妯佸▓纰夌礆

---

## 閸樺棗褰堕幒銊ㄧ箻閹芥顩﹂敍鍫濆竾缂傗晪绱?
- P0閿涘澃moke 閸撳秶鐤?/ baseline 濠曞倻些閿涘绱板鍙夋暪閸欙絻鈧?- P1閿涘牆鍙嗛崣锝嗕笉閻炲棴绱氶敍姝歟ntry-manifest-audit` + `verify:refactor` 瀹告彃鑸伴幋鎰讲闂冪粯鏌囬崶鐐衡偓鈧梻銊ь洣閵?- P1/P2閿涘湕ngine 閻樿埖鈧礁瀵查敍澶涚窗`createEngineSession` 閻㈢喎鎳￠崨銊︽埂娑撳氦绔熼悾灞剧墡妤犲苯鍑￠拃钘夋勾楠炶埖婀侀崡鏇熺ゴ鐟曞棛娲婇妴?- P2/P3閿涘牆顦查弶鍌氬娑撳酣鍣告径宥勫敩閻焦涓嶉悶鍡礆閿涙艾澧?18 閹甸€涚秵妞嬪酣娅撻幏鍡楀瀻/閸樺鍣稿鎻掔暚閹存劧绱漙audit:quality` 閻戭厾鍋ｈぐ鎺楁祩閵?- CI 鐠囧﹥鏌囨晶鐐插繁閿涙瓪quality-audit-report`閵嗕梗diagnostics-index`閵嗕礁銇戠拹銉ょ喘閸忓牏楠囬幓鎰仛閸у洤鍑￠幒銉ュ弳閵?
---

## 缁嬭櫕鈧礁璐板Λ鈧Ο鈩冩緲閿涘牆娴愮€规熬绱?
濮ｅ繗鐤嗘禒鍛邦唶瑜版洑浜掓稉瀣杻闁插骏绱?
1. 閺堫剝鐤嗛崣妯哄閿涘牅鍞惍?濞翠胶鈻奸敍?2. 妤犲矁鐦夌拠浣瑰祦閿涘牆娴愮€规艾鐔€缁惧灝鎳℃禒?+ 缂佹挻鐏夐敍?3. 妞嬪酣娅撶紒鎾诡啈閿涘牊妲搁崥锕€绱╅崗銉︽煀闂冭顢ｉ敍?4. 娑撳绔村銉礄2~4 閺夆€冲讲閻╁瓨甯撮幍褑顢戦崝銊ょ稊閿?
---

## 娑撳﹣绔撮幍鐟版礀妞ゆ拝绱欑粭?7閹电櫢绱?
- `.github/workflows/smoke.yml`
  - `diagnostics-index` 瀹歌尪袙閺嬫劕鑻熺仦鏇犮仛 `refactor-gate-summary.json` 閸忔娊鏁€涙顔岄妴?- `scripts/release-readiness-check.mjs` + `tests/unit/release-readiness-check-helpers.spec.ts`
  - 瀹告彃鐨?summary 鐎涙顔岀憴锝嗙€介柧鎹愮熅缁惧啿鍙?release-ready 婵傛垹瀹虫稉搴″礋濞村鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) Diagnostics Index 婢х偛濮?timeout 閺勬儳绱＄€涙顔屾稉搴㈠絹缁€?
- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - `Extract refactor gate summary fields` 閺傛澘顤冪憴锝嗙€界€涙顔岄敍?    - `has_timeout`
    - `timeout_steps`
  - 閳ユ珐efactor Gate Summary Field閳?鐞涖劍鐗搁弬鏉款杻 timeout 娑撱倕鍨敍?  - triage 婢х偛濮?timeout 娑撴捇銆嶉幓鎰仛閿涘牅绱崗鍫燁梾閺屻儵顣╃粻妞剧瑢閺堝搫娅掔拹鐔绘祰閿涘绱?  - 閺冪姵鎲崇憰浣规瀮娴犺埖妞傞惃?fallback 鏉堟挸鍤崥灞绢劄閺傛澘顤?timeout 鐎涙顔岄妴?
### 2) 閺€鍓佹彛 release-ready 婵傛垹瀹抽敍鍫ユЩ閸ョ偤鈧偓閿?
- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
- 閺€鐟板З閿?  - 閺傛澘顤冪€甸€涗簰娑?workflow 閻楀洦顔岄惃鍕繁閺嶏繝鐛欓敍?    - `REF_GATE_HAS_TIMEOUT` / `REF_GATE_TIMEOUT_STEPS` 閻滎垰顣ㄩ弰鐘茬殸閿?    - timeout 鐎涙顔岀悰銊︾壐鐞涘矁绶崙鎭掆偓?- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - 閺嶈渹绶?workflow 閸氬本顒為弬鏉款杻 timeout 鐎涙顔岄柧鎹愮熅閿涘奔绻氶梾婊冾殩缁撅箑褰插ù瀣ㄢ偓?
### 3) 缂佸瓨瀵?tail 閸欏倹鏆熼崠鏍ь殩缁撅箑宕熷ù瀣洬閻?
- 閺傚洣娆㈤敍姝歵ests/unit/refactor-gate-helpers.spec.ts`
  - 閹镐胶鐢婚弽锟犵崣 `STEP_OUTPUT_TAIL_LINES_ENV_KEY` 娑?`resolveStepOutputTailLines` 鐞涘奔璐熼妴?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ懓鍑＄€瑰本鍨氶敍瀹峴ignal=TIMEOUT` 瀹告彃澧犵粔璁宠礋 diagnostics-index 閻ㄥ嫭妯夊蹇曠波閺嬪嫬瀵叉穱鈩冧紖閵?
---

## 缁?8閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?35 files / 758 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (20 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑28閹佃鏁奸柅鐘叉倵閿涘矂妫粋浣风箽閹镐礁鍙忕紒鍖＄礉娑?timeout 娣団剝浼呭鑼波閺嬪嫬瀵茬仦鏇犮仛閸掓媽鐦栭弬顓㈩浕妞ょ偣鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) timeout 娑撴捇銆嶉幓鎰仛鐞涖儵缍堥垾婊勫腹閼芥劙顣╃粻妤呮暛閳ユ繃妲х亸?
- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - 閸?`diagnostics-index` 閻?timeout triage 閸掑棙鏁弬鏉款杻濮濄儵顎冮崚浼搭暕缁犳鏁弰鐘茬殸閿?    - `game-manager-audit` -> `REFACTOR_GATE_TIMEOUT_GAME_MANAGER_AUDIT_MS`
    - `entry-manifest-audit` -> `REFACTOR_GATE_TIMEOUT_ENTRY_MANIFEST_AUDIT_MS`
    - `engine-audit` -> `REFACTOR_GATE_TIMEOUT_ENGINE_AUDIT_MS`
    - `unit` -> `REFACTOR_GATE_TIMEOUT_UNIT_MS`
    - `smoke` -> `REFACTOR_GATE_TIMEOUT_SMOKE_MS`
    - `build` -> `REFACTOR_GATE_TIMEOUT_BUILD_MS`
    - 閺堫亣鐦戦崚顐ｎ劄妤?-> `REFACTOR_GATE_TIMEOUT_DEFAULT_MS`
  - 閺傛澘顤?`Timeout tuning key(s)` 鏉堟挸鍤敍瀹糹meout 閸欐垹鏁撻弮璺哄讲閻╁瓨甯撮惇瀣煂瀵ら缚顔呯拫鍐╂殻闁款喓鈧?
### 2) 閺€鍓佹彛 release-ready 婵傛垹瀹抽敍鍫ｎ洬閻?timeout 闁款喗妲х亸鍕懠鐠侯垽绱?
- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
- 閺€鐟板З閿?  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 閺傛澘顤?timeout 閺勭姴鐨犳稉?`Timeout tuning key(s)` 閻╃鍙ч悧鍥唽閺嶏繝鐛欓敍宀勬Щ濮?workflow 閸ョ偤鈧偓閵?- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - 閺嶈渹绶?workflow 閸氬本顒炵悰銉╃秷閺勭姴鐨犻悧鍥唽閿涘苯鑻熺亸鍡氱閸氭垶鏌囩懛鈧弨閫涜礋閺囨寧宕查崬顖欑閻楀洦顔岄敍宀勪缉閸忓秷顕ら崚銈冣偓?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檛imeout 閹绘劗銇氱悰銉ュ帠閹恒劏宕樻０鍕暬闁款喗妲х亸鍕剁礆瀹告彃鐣幋鎰┾偓?
---

## 缁?9閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?35 files / 758 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (21 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑29閹佃鏁奸柅鐘叉倵閿涘瓔I 鐠囧﹥鏌囬崷?timeout 閸︾儤娅欐稉瀣嚒閸欘垳娲块幒銉х舶閸戞椽顣╃粻妤呮暛缁狙冨焼閻ㄥ嫯鐨熼崣鍌氬弳閸欙綇绱濋幒鎺楁鐠侯垰绶炴潻娑楃濮濄儲鏁归弫娑栤偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) timeout 闁款喖缂撶拋顔煎箵闁?+ 閸掑棜顢戠仦鏇犮仛閽€钘夋勾

- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - 閸?`diagnostics-index` timeout 閸掑棙鏁弬鏉款杻 `append_unique_timeout_key`閿涘本瀵滈柨顔煎箵闁插秷浠涢崥鍫幢
  - `timeout_steps` 婢舵艾鈧厧婧€閺咁垯绗呴弨閫涜礋闁劙銆嶆潏鎾冲毉閿?    - `Timeout tuning key(s):`
    - `- REFACTOR_GATE_TIMEOUT_*`
  - 娣囨繄鏆€ fallback閿涙碍妫ら崣顖濈槕閸掝偅顒炴銈嗘娴犲秷绶崙?`REFACTOR_GATE_TIMEOUT_DEFAULT_MS`閵?
### 2) release-ready 婵傛垹瀹抽崥灞绢劄閺€鍓佹彛閿涘牐顩惄鏍у箵闁?閸掑棜顢戦柅鏄忕帆閿?
- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
- 閺€鐟板З閿?  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 閺傛澘顤冮崢濠氬櫢閸戣姤鏆熸稉搴ㄢ偓鎰般€嶆潏鎾冲毉閻╃鍙ч悧鍥唽閿?    - `append_unique_timeout_key()`
    - `append_unique_timeout_key "REFACTOR_GATE_TIMEOUT_*"`
    - `echo "   - \`${timeout_key}\`";`
- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - 閺嶈渹绶?workflow 閸氬本顒炵悰銉╃秷娑撳﹨鍫悧鍥唽閿涘瞼鎴风紒顓濈箽鐠囦礁顨栫痪锕€褰插ù瀣ㄢ偓?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檛imeout 闁款喖缂撶拋顔煎箵闁插秳绗岄崚鍡氼攽鐏炴洜銇氶敍澶婂嚒鐎瑰本鍨氶妴?
---

## 缁?0閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?35 files / 758 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (22 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑30閹电懓鎮楅敍瀹糹meout 鐠囧﹥鏌囧楦款唴閸︺劌顦垮銉╊€冮崷鐑樻珯娑撳褰茬拠缁樷偓褎褰侀崡鍥风礉娑撴梹妫ら柌宥咁槻闁款喖娅旈棅鐐解偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) timeout step->妫板嫮鐣婚柨顔芥Ё鐏忓嫪绗呭▽澶夎礋閸欘垰顦查悽銊ㄥ壖閺?
- 閺傚洣娆㈤敍姝歴cripts/refactor-timeout-env-keys.mjs`
- 閺€鐟板З閿?  - 閺傛澘顤冮悪顒傜彌閺勭姴鐨犳稉搴″箵闁插秹鈧槒绶敍宀€绮烘稉鈧禍褍鍤?timeout 妫板嫮鐣婚柨顕嗙幢
  - 姒涙顓婚崗婊冪俺 `REFACTOR_GATE_TIMEOUT_DEFAULT_MS`閿?  - 閺€顖涘瘮 CLI閿涙瓪--steps=<comma-separated-steps>`閿涘矁绶崙娲偓鎰攽闁款喖鎮曢妴?
### 2) diagnostics-index 閺€閫涜礋鐠嬪啰鏁ら懘姘拱閿涘瞼些闂勩倕鍞撮懕鏂款槻閺?case

- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - timeout triage 閸掑棙鏁弨閫涜礋鐠嬪啰鏁ら敍?    - `node scripts/refactor-timeout-env-keys.mjs --steps="${REF_GATE_TIMEOUT_STEPS}"`
  - 娣囨繄鏆€闁劘顢戞潏鎾冲毉閿?    - `Timeout tuning key(s):`
    - `- REFACTOR_GATE_TIMEOUT_*`
  - 閸掔娀娅庨崘鍛颁粓 `case` 閺勭姴鐨犳稉搴″箵闁插秴鍤遍弫甯礉闂勫秳缍?workflow 缂佸瓨濮㈡径宥嗘絽鎼达负鈧?
### 3) release-ready 婵傛垹瀹虫稉搴″礋濞村鎮撳銉︽暪閺?
- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
- 閺€鐟板З閿?  - `REQUIRED_FILES` 閺傛澘顤?`scripts/refactor-timeout-env-keys.mjs`閿?  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 閺€閫涜礋瀵儤鐗庢灞糕偓婊嗗壖閺堫剝鐨熼悽銊╂懠鐠侯垪鈧繄澧栧▓纰夌礉閺囧じ鍞弮褍鍞撮懕?case 閻楀洦顔岄妴?- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - 閺嶈渹绶?workflow 閺囧瓨鏌婃稉楦垮壖閺堫剝鐨熼悽銊у timeout 閹绘劗銇氶柧鎹愮熅閵?- 閺傚洣娆㈤敍姝歵ests/unit/refactor-timeout-env-keys.spec.ts`
  - 閺傛澘顤冮懘姘拱 helper 閸楁洘绁撮敍宀冾洬閻╂牞袙閺?閺勭姴鐨?閸樺鍣?閸忔粌绨崇悰灞艰礋閵?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱欑亸?timeout step->妫板嫮鐣婚柨顔芥Ё鐏忓嫪绗呭▽澶夎礋閸欘垰顦查悽銊ㄥ壖閺堫剛澧栧▓纰夌礆瀹告彃鐣幋鎰┾偓?
---

## 缁?1閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts tests/unit/refactor-timeout-env-keys.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?36 files / 762 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (23 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑31閹电懓鎮楅敍瀹糹meout 妫板嫮鐣婚柨顔剧摜閻ｃ儱鍑℃禒?workflow 閸愬懓浠堥柅鏄忕帆鏉╀胶些娑撳搫褰叉径宥囨暏閼存碍婀伴敍灞芥倵缂侇厾娣幎銈勭瑢閸ョ偛缍婃搴ㄦ珦鏉╂稐绔村銉╂娴ｅ簺鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) runtime helper 鐏忓繑澹掑▎鈩冩暪閺佹冻绱檚etup timer UI閿?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_setup_timer_ui_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`getSetupTimerSlotIds`閿涘瞼绮烘稉鈧?timer slot 閸掓銆冪拠璇插絿閿?  - `normalizeLegacyTimerRowsForSetup`閵嗕梗resetTimerTextSlotsForSetup`閵嗕梗createSupportedTimerSlotMapForSetup` 閺€閫涜礋婢跺秶鏁ょ紒鐔剁鐠囪褰?helper閿?  - 鐏?`hideUnsupportedTimerRowsForSetup` 娑撱倖顔屽顏嗗箚閹峰棔璐熼敍?    - `hideUnsupportedSetupTimerRowsByMap`
    - `hideUnsupportedSetupTimerValuesByMap`
  - `createCappedRowVisibilityPlanPayload`閵嗕梗applyCappedRowVisibilityPlanFallback` 缂佺喍绔存担璺ㄦ暏 `getSetupTimerSlotIds`閿涘苯鍣虹亸鎴炴殠閽€鐣屾畱闂堟瑦鈧礁鍨悰銊嚢閸欐牞鐭惧鍕┾偓?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛粵缂佹挻鐎弨鑸垫殐娑撳酣妲诲鈩冣偓褏鈹栭崐鐓庮槱閻炲棴绱濇稉宥嗘暭娑撴艾濮熺拠顓濈疅閿?- 娑撶粯绁︾粙瀣弳閸欙絼绗岀拫鍐暏妞ゅ搫绨穱婵囧瘮娑撳秴褰夐敍鍧剅esetTimerUiForSetup` 鐞涘奔璐熸稉宥呭綁閿涘鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檙untime helper 鐏忓繑澹掑▎鈩冩暪閺佹冻绱氬鍙夊瘻 2~3 閸戣姤鏆?閹电濡總蹇曟埛缂侇厽甯规潻娑栤偓?
---

## 缁?2閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit`
  - PASS閿涙瓪136 files / 762 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (24 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑32閹电懓鎮楅敍瀹籩tup timer UI helper 閻ㄥ嫬褰茬紒瀛樺Б閹嗙箻娑撯偓濮濄儲褰侀崡鍥风礉娑撴棃妫粋浣瑰瘮缂侇厼鍙忕紒瑁も偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) runtime helper 鐏忓繑澹掑▎鈩冩暪閺佹冻绱檅ase helper閿涙econdary timer toggle 闁炬崘鐭鹃敍?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`resolveSecondaryTimerLegendFromRow`閵嗕梗resolveSecondaryTimerLegendFromTimerBox`閵嗕梗resolveSecondaryTimerLegendElementForParent`閿涘瞼绮烘稉鈧?legend 鐎规矮缍呴柅鏄忕帆閿?  - 閺傛澘顤?`bindSecondaryTimerToggleTargetsForParent`閿涘瞼绮烘稉鈧?row/legend/timer 娑撳琚惄顔界垼閻ㄥ嫮绮︾€规艾鍙嗛崣锝忕幢
  - `bindSecondaryTimerParentToggleEvents` 閺€閫涜礋婢跺秶鏁ゆ稉濠呭牚 helper閿涘矂妾锋担搴″毐閺佹澘鍞撮崚鍡樻暜鐎靛棗瀹虫稉搴ㄥ櫢婢跺秷鐭惧鍕剁幢
  - 娣囨繃瀵旈弮銏℃箒 `toggle -> visibility refresh -> scroll sync` 鐞涘奔璐熼柧鎹愮熅娑撳秴褰夐妴?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗛懕姘卞妽缂佹挻鐎弨鑸垫殐娑撳氦浜寸拹锝嗗閸掑棴绱濇稉宥嗘暭娑撴艾濮熺拠顓濈疅閿?- 娴滃娆㈢紒鎴濈暰楠炲倻鐡戠拠顓濈疅娣囨繃瀵旀稉宥呭綁閿涘牆鎮?parent 娑撳秹鍣告径宥囩拨鐎规熬绱氶敍灞剧泊閸斻劌娲栫拫鍐熅瀵板嫪绻氶幐浣风瑝閸欐ǜ鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檙untime helper 鐏忓繑澹掑▎鈩冩暪閺佹冻绱氬鑼埛缂侇厽甯规潻娑樺煂 `core_game_manager_base_helpers_runtime.js`閵?
---

## 缁?3閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit`
  - PASS閿涙瓪136 files / 762 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (25 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑33閹电懓鎮楅敍瀹恆se helper 閻?secondary timer toggle 鐠侯垰绶為崣顖濐嚢閹傜瑢閸欘垳娣幎銈嗏偓褎褰侀崡鍥风礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) 娑?base helper 閺傜増濯堕崚鍡氱熅瀵板嫯藟閺堚偓鐏忓繐娲栬ぐ鎺戝礋濞村绱欐导妯哄帥妞ょ鎯ら崷甯礆

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `bindSecondaryTimerParentToggleEvents`閿?    - 鐟曞棛娲?row 閺?legend 閺冩湹绮?`timerbox` fallback 閺屻儲澹?legend閿?    - 鐟曞棛娲婇崥?parent 闁插秴顦茬拫鍐暏閺?click 閻╂垵鎯夋稉宥夊櫢婢跺秶绮︾€规熬绱欓獮鍌滅搼閿涘鈧?  - `resolveSecondaryTimerParentAnchor`閿?    - 鐟曞棛娲婇垾婊€绱崗鍫滃▏閻?parent row anchor閳ユ繐绱?    - 鐟曞棛娲?legacy 缂佹挻鐎稉?`timer + whitespace + <br><br>` 閻?anchor 闁瀚ㄩ妴?  - `stampSecondaryTimersForMergedValue`閿?    - 鐟曞棛娲婇垾婊€绮庣€佃寮х搾铏蒋娴?descriptor 閽€鑺ユ闂傚瓨鍩戦垾婵撶幢
    - 鐟曞棛娲婇垾婊€绮庨崷銊ョ杽闂勫懎褰夐弴瀛樻鐟欙箑褰?refresh閳ユ繆绔熼悾宀冾攽娑撴亽鈧?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偛宕熷ù瀣剁礉娑撳秵鏁兼潻鎰攽閺冩湹鍞惍浣界熅瀵板嫸绱?- 鐟曞棛娲婇棃銏㈡纯閹恒儱顕惔鏃傤儑33閹佃濯堕崚鍡欏仯閿涘奔瀵岀憰浣烘暏娴滃酣妲诲銏犳倵缂侇厾绮ㄩ弸鍕闁插秵鐎敮锔芥降閻ㄥ嫯顢戞稉鐑樼磽缁夋眹鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱欐稉?base helper 閺傜増濯堕崚鍡氱熅瀵板嫯藟閺堚偓鐏忓繐宕熷ù瀣剁礆瀹告彃鐣幋鎰┾偓?
---

## 缁?4閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 765 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (26 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑34閹电懓鎮楅敍瀹恆se helper 閸忔娊鏁幏鍡楀瀻鐠侯垰绶為崗宄邦槵閺堚偓鐏忓繐娲栬ぐ鎺楁Щ缁惧尅绱濇稉鏃堟，缁備焦瀵旂紒顓炲弿缂佽￥鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) 濞岃法顑?4閹电懓宕熷ù瀣唨缁捐儻藟 descriptor/placement 鐠愮喎鎮滈崷鐑樻珯

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `ensureSecondaryTimerDescriptorRow`
    - 鐟曞棛娲?row 閼磋京顬囬惄顔界垼 container 閺冨墎娈戦柌宥嗗瘯鐞涘奔璐熼敍鍧剅ow.parentNode !== container -> appendChild`閿涘鈧?  - `placeSecondaryTimerRowsNearParents`
    - 鐟曞棛娲婇弮鐘虫櫏 descriptor閿涘牏宸?row / 闂堢偞纭?parent閿涘顫︾捄瀹犵箖閿?    - 鐟曞棛娲?anchor 娑撳秴婀?`timerbox` 閺冩儼鐑︽潻鍥ㄦ杹缂冾噯绱?    - 鐟曞棛娲婄€涙ê婀張澶嬫櫏 descriptor 閺冩湹绮庨張澶嬫櫏妞ょ鎯ゆ担宥忕礉楠炴湹绻氶幐?`timer-scroll-controls` 閸︺劍婀亸淇扁偓?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偠绀嬮崥鎴濇簚閺咁垰宕熷ù瀣剁礉娑撳秵鏁兼潻鎰攽閺冩湹鍞惍渚婄幢
- 闁插秶鍋ｉ弨鍓佹彛 secondary timer 鐢啫鐪柧鎹愮熅閻ㄥ嫯绔熼悾宀冾攽娑撶尨绱濋梽宥勭秵閸氬海鐢婚柌宥嗙€崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檇escriptor/placement 鐠愮喎鎮滈崷鐑樻珯鐞涖儵缍堥敍澶婂嚒鐎瑰本鍨氶妴?
---

## 缁?5閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 767 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (27 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑35閹电懓鎮楅敍瀹恆se helper 閻?descriptor/placement 閸忔娊鏁潏鍦櫕瀹稿弶婀侀崡鏇熺ゴ閸忔粌绨抽敍宀勬，缁備焦瀵旂紒顓炲弿缂佽￥鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) 鐞涖儵缍堟径姘卞煑缁狙嗙箾缂侇厽褰冮崗銉┿€庢惔蹇曟暏娓氬绱檛ailByParent 缁嬪啿鐣鹃幀褝绱?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `placeSecondaryTimerRowsNearParents` 閸︺劌顦?parent 娴溿倝鏁?descriptor 鏉堟挸鍙嗘稉瀣剁窗
    - 濮ｅ繋閲?parent 閻ㄥ嫪绨╃痪褑顢戞穱婵囧瘮閳ユ粎娴夌€靛湱鍩楃痪褔鏁嬮悙鐟版倵閻ㄥ嫯绻涚紒顓€庢惔蹇娾偓婵撶幢
    - 娑撳秴鎮?parent 閻ㄥ嫭褰冮崗銉ょ瑝娴兼矮绨伴惄鍛婂ⅵ娑斿崬鍑″铏圭彌閻?tail 闁炬拝绱?    - `timer-scroll-controls` 娣囨繃瀵旈崷?`timerbox` 閺堫偄鐔妴?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偞甯撴惔蹇暻旂€规碍鈧冨礋濞村绱濇稉宥嗘暭鏉╂劘顢戦弮鏈靛敩閻緤绱?- 闁插秶鍋ｉ梼鍙夘剾 secondary timer 婢舵氨鍩楃痪褍婧€閺咁垰婀崥搴ｇ敾闁插秵鐎稉顓炲毉閻滅増褰冮崗銉┿€庢惔蹇撴礀瑜版帇鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱欐径姘卞煑缁狙嗙箾缂侇厽褰冮崗銉┿€庢惔蹇曟暏娓氬绱氬鎻掔暚閹存劑鈧?
---

## 缁?6閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 768 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (28 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑36閹电懓鎮楅敍瀹籩condary timer 婢舵氨鍩楃痪褎鏂佺純顕€銆庢惔蹇撳徔婢跺洤娲栬ぐ鎺楁Щ缁惧尅绱濋梻銊ь洣閹镐胶鐢婚崗銊ц雹閵?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) 鐞涖儵缍?legacy anchor 閻ㄥ嫧鈧?2 娑?`<br>`閳ユ繆绔熼悾宀€鏁ゆ笟?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `resolveSecondaryTimerParentAnchor` 閸?legacy 缂佹挻鐎稉瀣剁窗
    - 瑜?`timer` 閸氬骸鐡ㄩ崷銊ょ瑏娑擃亜寮锋禒銉ょ瑐 `<br>` 閺冭绱濇禒鍛儧閺€璺哄娑撱倓閲?`<br>` 娴ｆ粈璐?anchor 閹碘晛鐫嶉敍?    - 缁楊兛绗佹稉?`<br>` 閸欏﹤鍙鹃崥搴ゅΝ閻愰€涚瑝閸欏倷绗?anchor 閸撳秶些閵?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偠绔熼悾灞藉礋濞村绱濇稉宥嗘暭鏉╂劘顢戦弮鏈靛敩閻緤绱?- 閸ュ搫鐣?legacy 妞ょ敻娼版稉瀣畱闁挎氨鍋ｇ憴锝嗙€芥總鎴犲閿涘矂妲诲銏犳倵缂侇參鍣搁弸鍕杹婢?`<br>` 闁炬儳顕遍懛鏉戠鐏炩偓濠曞倻些閵?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檒egacy 娑撳閲滄禒銉ょ瑐 `<br>` 鏉堝湱鏅悽銊ょ伐閿涘鍑＄€瑰本鍨氶妴?
---

## 缁?7閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 769 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (29 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑37閹电懓鎮楅敍瀹璭gacy anchor 閻?`<br>` 閸氬憡鏁规潏鍦櫕鐞涘奔璐熷鑼额潶濞村鐦柨浣哥暰閿涘矂妫粋浣瑰瘮缂侇厼鍙忕紒瑁も偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) 鐞涖儵缍?stamp 缁屽搫鈧吋鏋冮張顒€鍟撻崗銉ㄧ珶閻ｅ瞼鏁ゆ笟?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `stampSecondaryTimerDescriptor` 閸︺劋浜掓稉瀣翻閸忋儰绗呯紒鐔剁閸愭瑥鍙嗙粚鍝勭摟缁楋缚瑕嗛敍?    - `timeStr = ""`
    - `timeStr = undefined`
  - 閸ュ搫鐣剧粚鍝勨偓鑹扮翻閸忋儰绗夋导姘辨殌娑撳宸婚崣鍙夋瀮閺堫剨绱濈涵顔荤箽閸愭瑥鍙嗙拠顓濈疅娑撯偓閼锋番鈧?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偛宕熷ù瀣剁礉娑撳秵鏁兼潻鎰攽閺冩湹鍞惍渚婄幢
- 闁夸礁鐣?stamp 閺傚洦婀伴崘娆忓弳閻ㄥ嫮鈹栭崐鑹邦嚔娑斿绱濋梽宥勭秵閸氬海鐢婚柌宥嗙€弮鍓佹畱鐎涙顑佹稉鎻掔秺娑撯偓閸栨牕娲栬ぐ鎺楊棑闂勨斂鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檚tamp `timeStr` 娑撹櫣鈹栫€涙顑佹稉?undefined 鏉堝湱鏅悽銊ょ伐閿涘鍑＄€瑰本鍨氶妴?
---

## 缁?8閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 770 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (30 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑38閹电懓鎮楅敍瀹籩condary timer stamp 缁屽搫鈧厧鍟撻崗銉嚔娑斿鍑″ù瀣槸閸ュ搫瀵查敍宀勬，缁備焦瀵旂紒顓炲弿缂佽￥鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) stamp 鐠侯垰绶為弨鍓佹彛閿涙岸娼?2 閻ㄥ嫬绠?mergedValue 閻╁瓨甯存潻鏂挎礀

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `stampSecondaryTimersForMergedValue` 閺傛澘顤冮梼鎻掑敖閺夆€叉閿?    - `if (!isSecondaryTimerPowerOfTwo(merged)) return;`
  - 鐠囶厺绠熼敍姘矌鐎靛厜鈧粌鎮庡▔?power-of-two 娑?>= 2048閳ユ繄娈?merged 閸婅壈绻橀崗?descriptor 閹殿偅寮挎稉搴″讲閼崇晫娈?refresh 鐠侯垰绶為妴?
### 2) 鐞涖儵缍?mergedValue 鐠愮喎鎮滈悽銊ょ伐

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `mergedValue < 2048` 娑?`mergedValue` 闂?2 閻ㄥ嫬绠撻弮璁圭窗
    - 娑撳秷袝閸?descriptor 鐟欙絾鐎介敍?    - 娑撳秷袝閸?refresh閿?    - 娑撳秳楠囬悽?timer 閺傚洦婀伴崘娆忓弳閸擃垯缍旈悽銊ｂ偓?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗛弨鐟板З娑撴椽妲诲鈥崇础閺冣晞绻戦崶鐑囩礉閺€鍓佹彛鏉堟挸鍙嗘潏鍦櫕閿涘奔绗夎ぐ鍗炴惙濮濓絽鐖堕敍鍧wer-of-two閿涘鎮庨獮鎯扮熅瀵板嫸绱?- 闁板秴顨滈崡鏇熺ゴ瀹告煡鏀ｇ€规埃鈧粍妫ら弫鍫ｇ翻閸忋儲妫ら崜顖欑稊閻劉鈧繆顢戞稉鐚寸礉闂勫秳缍嗛崥搴ｇ敾閸ョ偛缍婃搴ㄦ珦閵?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檂stampSecondaryTimersForMergedValue` 鐠愮喎鎮滈悽銊ょ伐閿涘鍑＄€瑰本鍨氶獮鎯版儰閸︽澘顕惔鏃堟Щ瀵帮繝鈧槒绶妴?
---

## 缁?9閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 771 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (31 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑39閹电懓鎮楅敍瀹籺amp 鐠侯垰绶炵€佃妫ら弫?merged 鏉堟挸鍙嗛崗宄邦槵閺勬儳绱￠梼鎻掑敖娑撳骸娲栬ぐ鎺撶ゴ鐠囨洑绻氶梾婊愮礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) 娑?invalidation 鐠侯垰绶炵悰銉╃秷 limit 鏉堝湱鏅崡鏇熺ゴ

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `invalidateSecondaryTimersByLimit` 閸︺劑娼弫瀛樻殶娑撳海鈹栭崐?limit 娑撳绱?    - `limit = 2048.5`閵嗕梗limit = ""` 閺冨墎娲块幒銉ㄧ箲閸?`false`閿?    - 娑撳秷袝閸?descriptor 鐟欙絾鐎介敍?    - 娑撳秷袝閸?refresh閵?  - `invalidateSecondaryTimersByLimit` 閸?`limit = 2048` 娑撳绱?    - 娴?`parent <= 2048` 閻?descriptor 鐞氼偆鐤嗘稉鍝勫窗娴ｅ秵鏋冮張顒婄幢
    - `parent > 2048` 閻?descriptor 娣囨繃瀵旈崢鐔封偓纭风幢
    - 瑜版挷绱堕崗銉р敄閸楃姳缍呴弬鍥ㄦ拱閺冭泛娲栭柅鈧崚浼寸帛鐠?`"---------"`閿?    - refresh 娴犲懓袝閸欐垳绔村▎掳鈧?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛煀婢х偛宕熷ù瀣剁礉娑撳秵鏁兼潻鎰攽閺冩湹鍞惍渚婄幢
- 闁插秶鍋ｉ弨鍓佹彛 invalidation limit 閻ㄥ嫯绶崗銉ょ瑢閸掗攱鏌婃潏鍦櫕閿涘矂妲诲銏犳倵缂侇參鍣搁弸鍕嚤閼风补鈧粍妫ら弫鍫ｇ翻閸忋儰绮涚憴锕€褰傞幍顐ｅ伎/閸掗攱鏌婇垾婵堟畱閸ョ偛缍婇妴?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檚econdary timer invalidation limit 鏉堝湱鏅崡鏇熺ゴ閿涘鍑＄€瑰本鍨氶妴?
---

## 缁?0閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 773 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (32 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑40閹电懓鎮楅敍瀹籩condary timer invalidation 鐠侯垰绶為崗鎶芥暛鏉堝湱鏅崗宄邦槵閸楁洘绁撮崗婊冪俺閿涘矂妫粋浣瑰瘮缂侇厼鍙忕紒瑁も偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) 瀵よ櫣鐝?output tail lines 閻ㄥ嫯鐦栭弬顓′粓閸斻劌鍨庣仦鍌︾礄low/balanced/high/unknown閿?
- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - `Extract refactor gate summary fields` 閺傛澘顤冩潏鎾冲毉鐎涙顔岄敍?    - `tail_lines_band`閿涘潉low` / `balanced` / `high` / `unknown`閿涘绱?  - 閸掑棗鐪扮憴鍕灟閿涘牆鐔€娴?`output_tail_lines`閿涘绱?    - `< 80` -> `low`
    - `80~180` -> `balanced`
    - `> 180` -> `high`
    - 缂傚搫銇戦幋鏍︾瑝閸欘垵袙閺?-> `unknown`
  - `Diagnostics Index` 鐞涖劍鐗搁弬鏉款杻 `tail_lines_band`閿?  - `Triage Priority` 閺傛澘顤?tail lines advisory閿?    - `low`閿涙碍褰佺粈鐑樺絹妤?`REFACTOR_GATE_OUTPUT_TAIL_LINES` 楠炴儼顫囩€?3~5 濞嗏槄绱?    - `high`閿涙碍褰佺粈娲娴ｅ簼浜掗幎鎴濆煑閺冦儱绻旈崳顏堢叾閿?    - `unknown`閿涙碍褰佺粈鐑橆梾閺?summary artifact 閸欐垵绔烽柧鎹愮熅閵?
### 2) release-ready 婵傛垹瀹虫稉搴″礋濞村鎮撳銉︽暪缁?
- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
  - `SMOKE_WORKFLOW_REQUIRED_SNIPPETS` 閺傛澘顤冮敍?    - `tail_lines_band` 鐎涙顔屾潏鎾冲毉娑撳海骞嗘晶鍐╂Ё鐏忓嫮澧栧▓纰夌幢
    - `Tail lines advisory` 閻楀洦顔岄敍?    - `REFACTOR_GATE_OUTPUT_TAIL_LINES=${REF_GATE_OUTPUT_TAIL_LINES}` 閻楀洦顔岄妴?- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - workflow 婢剁懓鍙块崥灞绢劄鐞涖儵缍堟禒銉ょ瑐閻楀洦顔岄敍宀€鈥樻穱婵嗩殩缁撅箑褰插ù瀣嫙闂冩彃娲栭柅鈧妴?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗛弨鐟板З娴犲懏澧跨仦?CI 鐠囧﹥鏌囨穱鈩冧紖閿涘奔绗夎ぐ鍗炴惙娑撴艾濮熸潻鎰攽閺冩湹鍞惍浣界熅瀵板嫸绱?- 闁俺绻?release-ready 婵傛垹瀹崇€瑰牊濮㈤敍宀勪缉閸忓秴鎮楃紒?workflow 閸欐ɑ娲块柆妤佺础 tail lines 閼辨柨濮╅幓鎰仛閵?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檂REFACTOR_GATE_OUTPUT_TAIL_LINES` 閸涘﹨顒熼懕鏂垮З缁涙牜鏆愰敍澶婂嚒鐎瑰本鍨氶獮鍓佹捈閸忋儵妫粋浣割殩缁撅负鈧?
---

## 缁?1閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/release-readiness-check-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 773 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (33 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑41閹电懓鎮楅敍瀛婭 鐎?tail lines 閻ㄥ嫧鈧粌褰茬憴鍌涚ゴ閹?-> 鐠嬪啫寮楦款唴閳ユ繈鎽肩捄顖氬嚒缂佹挻鐎崠鏍儰閸﹀府绱濋梻銊ь洣閹镐胶鐢婚崗銊ц雹閵?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) 娑?refactor-gate 閻?tail lines 婢х偛濮炴稉濠囨闁藉啿鍩?
- 閺傚洣娆㈤敍姝歴cripts/refactor-gate.mjs`
- 閺€鐟板З閿?  - 閺傛澘顤冪敮鎼佸櫤閿涙瓪MAX_STEP_OUTPUT_TAIL_LINES = 240`閿?  - `resolveStepOutputTailLines` 娴犲簶鈧粈绮庡锝嗘殻閺佹媽袙閺嬫劏鈧繂宕岀痪褌璐熼垾婊喰掗弸?+ 娑撳﹪妾洪柦鍐插煑閳ユ繐绱?    - 閺冪姵鏅ラ崐?-> 閸ョ偤鈧偓姒涙顓?`80`
    - 鐡掑懎銇囬崐?-> 闁藉啿鍩楅崚?`240`
  - 閻╊喗鐖ｉ敍姘朵缉閸忓秴绱撶敮绋裤亣闁板秶鐤嗛弨鎯с亣閺冦儱绻旈崳顏堢叾娑?artifact 娴ｆ挾袧閵?
### 2) 鐞涖儵缍堥崡鏇熺ゴ娑?release-ready 婵傛垹瀹崇€瑰牊濮?
- 閺傚洣娆㈤敍姝歵ests/unit/refactor-gate-helpers.spec.ts`
  - 閺傛澘顤冮弬顓♀枅閿涙瓪resolveStepOutputTailLines("9999") === MAX_STEP_OUTPUT_TAIL_LINES`閵?- 閺傚洣娆㈤敍姝歴cripts/release-readiness-check.mjs`
  - `REFACTOR_GATE_REQUIRED_SNIPPETS` 閺傛澘顤冩稉濠囨闁藉啿鍩楅惄绋垮彠韫囧懎顦悧鍥唽閿?    - `MAX_STEP_OUTPUT_TAIL_LINES`
    - `Math.min(parsed, MAX_STEP_OUTPUT_TAIL_LINES)`
- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
  - refactor-gate 閺嶈渹绶ラ悧鍥唽閸氬本顒為崝鐘插弳娑撳﹪妾洪柦鍐插煑闁炬崘鐭鹃敍宀勬Щ濮濄垹顨栫痪锕€娲栭柅鈧妴?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础閸欏倹鏆熺痪锔芥将閿涘奔绗夎ぐ鍗炴惙娑撴艾濮熸潻鎰攽閺冩湹鍞惍浣界熅瀵板嫸绱?- 闁俺绻?helper 閸楁洘绁?+ release-ready 婵傛垹瀹抽崣灞肩箽闂勨晪绱濇穱婵婄槈 tail lines 娑撳﹪妾虹悰灞艰礋閸欘垱瀵旂紒顓炴礀瑜版帇鈧?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檂resolveStepOutputTailLines` 閼煎啫娲跨痪锔芥将娑撳骸宕熷ù瀣剁礆瀹告彃鐣幋鎰┾偓?
---

## 缁?2閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?37 files / 773 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (34 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑42閹电懓鎮楅敍瀹糰il lines 閸欏倹鏆熼崗宄邦槵閳ユ粓绮拋銈呪偓?+ 娑撳﹪妾洪柦鍐插煑 + 婵傛垹瀹崇€瑰牊濮㈤垾婵嗙暚閺佹挳妲荤痪鍖＄礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) 鐏?tail lines 閸掑棗鐪扮紒鎾寸亯閹恒儱鍙?refactor 閸涖劍濮?
- 閺傚洣娆㈤敍姝歴cripts/refactor-progress-report.mjs`
- 閺€鐟板З閿?  - 閺傛澘顤?refactor gate summary 鐠囪褰囨稉搴℃彥閻撗勫絹閸欐牞鍏橀崝娑崇礄`artifacts/refactor-gate-summary.json`閿涘绱?  - 閺傛澘顤?tail lines 閸掑棗鐪伴柅鏄忕帆閿涘牅绗?CI diagnostics-index 娣囨繃瀵旀稉鈧懛杈剧礆閿?    - `< 80` -> `low`
    - `80~180` -> `balanced`
    - `> 180` -> `high`
    - 閺冪姵纭剁憴锝嗙€?-> `unknown`
  - `report:refactor-progress` 閺傛澘顤冩潏鎾冲毉鐎涙顔岄敍?    - `refactor-gate output_tail_lines`
    - `refactor-gate tail_lines_band`
    - `refactor-gate failed_step`
    - `refactor-gate failed_step_duration_ms`
    - `refactor-gate slowest_step`
    - `refactor-gate slowest_step_duration_ms`

### 2) 鐞涖儵缍?helper 閸楁洘绁?
- 閺傚洣娆㈤敍姝歵ests/unit/refactor-progress-report-helpers.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 濮濓絾鏆ｉ弫鎷屝掗弸鎰珶閻ｅ矉绱?  - tail lines 閸掑棗鐪伴梼鍫濃偓鑹扮珶閻ｅ矉绱?9/80/180/181閿涘绱?  - summary 韫囶偆鍙庣憴锝嗙€介敍鍧抋iled step 閺冨爼鏆辨稉?slowest step 閹绘劕褰囬敍澶涚幢
  - 闂堢偞纭舵潏鎾冲弳閸忔粌绨抽敍鍧刟vailable: false`閿涘鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛⒖鐏炴洘濮ら崨濠佺瑢濞村鐦敍灞肩瑝閺€閫涚瑹閸斅ょ箥鐞涘本妞傛禒锝囩垳閿?- 閸涖劍濮ら幐鍥ㄧ垼娑?CI 鐠囧﹥鏌囬崚鍡楃湴闂冨牆鈧棿绻氶幐浣风閼疯揪绱濋梽宥勭秵閸氬海鐢荤拠鍕強姒涙顓婚崐鍏兼閻ㄥ嫭鏆熼幑顔煎經瀵板嫬浜稿顔衡偓?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檛ail lines 閸掑棗鐪扮紒鎾寸亯閹恒儱鍙?refactor 閸涖劍濮ら敍澶婂嚒鐎瑰本鍨氶妴?
---

## 缁?3閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/refactor-progress-report-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 777 tests` 閸忋劑鈧俺绻冮妴?- `npm run report:refactor-progress`
  - PASS閿涙碍鏌婃晶鐐剁翻閸?`output_tail_lines / tail_lines_band / failed_step_duration_ms / slowest_step_duration_ms` 鐎涙顔岄妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (35 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑43閹电懓鎮楅敍瀹糰il lines 閸掑棗鐪版稉搴°亼鐠愩儱鐣炬担宥堚偓妤佹瀹歌尪绻橀崗銉ユ噯閹躲儵鎽肩捄顖ょ礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) tail lines 閸涖劍濮ら弽閿嬫拱閺€閫涜礋閼奉亜濮╃槐顖溞濋崢鍡楀蕉

- 閺傚洣娆㈤敍姝歴cripts/refactor-progress-report.mjs`
- 閺€鐟板З閿?  - 閺傛澘顤冮崢鍡楀蕉閺傚洣娆㈤敍?    - `artifacts/refactor-progress-tail-history.json`
  - `report:refactor-progress` 閸︺劏顕伴崣?summary 閸氬氦鍤滈崝銊ㄦ嫹閸旂姳绔撮弶鈩冪壉閺堫剙鑻熸穱婵堟殌閺堚偓鏉?`30` 閺夆槄绱?  - 閺傛澘顤冩潏鎾冲毉閿?    - `tail history: artifacts/refactor-progress-tail-history.json (runs kept: N)`
  - 妫ｆ牗顐兼潻鎰攽瀹歌尙鏁撻幋鎰壉閺堫剨绱欒ぐ鎾冲 `runs kept: 1`閿涘鈧?
### 2) 鐞涖儵缍堥崢鍡楀蕉缁鳖垳袧 helper 閸楁洘绁?
- 閺傚洣娆㈤敍姝歵ests/unit/refactor-progress-report-helpers.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `createTailHistoryEntry` 缂佹挻鐎锝団€橀幀褝绱?  - `appendTailHistoryEntry` 閻ㄥ嫪绗傞梽鎰焻閺傤叀顢戞稉鐚寸礄`limit=30` 閺冭泛褰ф穱婵堟殌閺堚偓閺?30 閺夆槄绱氶妴?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘禒鍛⒖鐏炴洘濮ら崨濠呮儰閻╂ü绗?helper 濞村鐦敍灞肩瑝閺€閫涚瑹閸斅ょ箥鐞涘本妞傛禒锝囩垳閿?- 閺嶉攱婀板▽澶嬬┅鐠侯垰绶為拃钘夋勾閸氬函绱濋崥搴ｇ敾姒涙顓婚崐鑹扮槑娴兼壆鏁遍垾婊勫瀹搞儴顔囪ぐ鏇椻偓婵婃祮娑撹　鈧粏鍤滈崝銊х柈缁夘垪鈧繐绱濋崙蹇撶毌濠曞繗顔囨搴ㄦ珦閵?
缂佹捁顔戦敍姘閸楁洜顑?妞ょ櫢绱檛ail lines 閸涖劍濮ら弽閿嬫拱缁鳖垳袧閿涘鍑￠拃钘夋勾閼奉亜濮╅崠鏍х唨绾偓閿涘矁绻橀崗銉ㄧ箾缂侇厽鐗遍張顒冾潎鐎电喖妯佸▓鐐光偓?
---

## 缁?4閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/refactor-progress-report-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts tests/unit/release-readiness-check-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 779 tests` 閸忋劑鈧俺绻冮妴?- `npm run report:refactor-progress`
  - PASS閿涙俺绶崙?tail history 鐠侯垰绶炴稉?`runs kept: 1`閵?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (36 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑44閹电懓鎮楅敍瀹糰il lines 閺嶉攱婀板鑼剁箻閸忋儴鍤滈崝銊ュ濞屽绌╅敍宀勬，缁備焦瀵旂紒顓炲弿缂佽￥鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) invalidation 鐠侯垰绶為弨鑸垫殐閿涙矮绮庨崷銊︽瀮閺堫剙鐤勯梽鍛綁閸栨牗妞傜憴锕€褰?refresh

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?helper閿?    - `resolveSecondaryTimerInvalidationPlaceholderText`
    - `canInvalidateSecondaryTimerDescriptorByLimit`
    - `applySecondaryTimerInvalidationText`
  - `invalidateSecondaryTimersByLimit` 閺€閫涜礋閿?    - 閸忓牆鍨介弬?descriptor 閺勵垰鎯侀崷?limit 閼煎啫娲块崘鍜冪幢
    - 娴犲懎缍?`timerEl.textContent` 娑撳海娲伴弽鍥у窗娴ｅ秵鏋冮張顑跨瑝閸氬本澧犻崘娆忓弳楠炲墎鐤?`changed=true`閿?    - 閸ョ姵顒濋垾婊勬￥鐎圭偤妾弬鍥ㄦ拱閸欐ê瀵查垾婵嗘簚閺咁垯绗夐崘宥埿曢崣鎴滅瑝韫囧懓顩﹂惃?`refreshSecondaryTimerRowsVisibility`閵?
### 2) 鐞涖儵缍堥垾婊勬￥閸欐ê瀵叉稉宥呭煕閺傛壋鈧繂宕熷ù?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 瑜版挾娲伴弽?descriptor 瀹歌弓璐?`"---------"` 娑撴梹澧界悰?`invalidateSecondaryTimersByLimit(..., 2048, "")` 閺冭绱?    - 鏉╂柨娲?`false`閿?    - 娑撳秷袝閸?refresh閿?    - descriptor 鐟欙絾鐎界拫鍐暏娣囨繃瀵旀稉鈧▎鈽呯礄闁槒绶捄顖氱窞娴犲秷顫﹂幍褑顢戦敍澶堚偓?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础娴兼ê瀵查敍灞肩瑝閺€鐟板綁閺堝鏅?invalidation 閻ㄥ嫪绗熼崝锛勭波閺嬫粣绱濇禒鍛暪缁毖€鈧粍妫ら崣妯哄閸擃垯缍旈悽銊⑩偓婵撶幢
- 闁板秴顨滈崡鏇熺ゴ瀹告煡鏀ｇ€规埃鈧粍妫ら崣妯哄娑撳秴鍩涢弬鎵斥偓婵嗩殩缁撅讣绱濋梽宥勭秵閸氬海鐢婚柌宥嗙€惃鍕偓褑鍏橀崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漣nvalidation 闁炬崘鐭惧鎻掑徔婢跺洠鈧粈绮庨崣妯绘纯閸掗攱鏌婇垾婵堟畱閸ョ偛缍婃穱婵嬫閵?
---

## 缁?5閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 780 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (37 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑45閹电懓鎮楅敍瀹籩condary timer invalidation 閻ㄥ嫭妫ら弫鍫濆煕閺傛澘鍑＄悮顐ｇХ闂勩倧绱濋梻銊ь洣閹镐胶鐢婚崗銊ц雹閵?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) placement 闁炬崘鐭鹃弨鑸垫殐閿涙croll controls 娴犲懎婀垾婊堟姜鐏忛箖鍎撮垾婵囨閹靛秶些閸?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `appendSecondaryTimerScrollControls` 婢х偛濮為獮鍌滅搼鏉堝湱鏅崚銈嗘焽閿?    - 娴犲懎缍?controls 閸?`timerbox` 閸愬懍绗?`nextSibling !== null` 閺冭埖澧犻幍褑顢?`appendChild`閿?    - 瑜?controls 瀹告彃顦╂禍搴＄啲闁劍妞傛稉宥呭晙闁插秴顦茬憴锕€褰傞弮鐘冲壈娑斿娈?DOM 缁夎濮╅妴?
### 2) 鐞涖儵缍堥垾婊冪啲闁劌绠撶粵?+ 韫囧懓顩︾粔璇插З閳ユ繂宕熷ù?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `does not re-append scroll controls when they are already at tail`
    - 閺嶏繝鐛?controls 瀹告彃婀亸楣冨劥閺冩湹绗夋导姘承曢崣?`appendChild`閵?  - `moves scroll controls to tail when trailing nodes exist`
    - 閺嶏繝鐛?controls 閸氬簼绮涢張澶庡Ν閻愯妞傞敍灞肩窗鐞氼偆些閸斻劌娲?`timerbox` 鐏忛箖鍎撮妴?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础楠炲倻鐡戞导妯哄閿涘奔绗夐弨鐟板綁 rows placement 缂佹挻鐏夐敍灞肩矌濞戝牓娅庨柌宥咁槻 DOM 閹垮秳缍旈敍?- 閸楁洘绁村鏌ユ敚鐎规埃鈧粌鍑￠崷銊ョ啲闁劋绗夐柌宥咁槻缁夎濮?/ 闂堢偛鐔柈銊︽閹垹顦茬亸楣冨劥閳ユ繄娈戦崣灞芥倻鏉堝湱鏅敍宀勬娴ｅ骸鎮楃紒顓炴礀瑜版帡顥撻梽鈹库偓?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 闁炬崘鐭鹃惃鍕畵缁涘绔熼悾宀冪箻娑撯偓濮濄儲鏁圭槐褋鈧?
---

## 缁?6閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 782 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (38 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑46閹电懓鎮楅敍瀹籩condary timer placement 閸?scroll controls 鐏忛箖鍎寸紒瀛樺Б娑撳﹤鍑￠崗宄邦槵楠炲倻鐡戞穱婵嬫閿涘矂妫粋浣瑰瘮缂侇厼鍙忕紒瑁も偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) placement 闁炬崘鐭鹃弨鑸垫殐閿涙岸鏁嬮悙鐟般亼閺佸牆娲栭柅鈧?+ descriptor 閸樺鍣?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤冮柨姘卞仯婢惰鲸鏅ラ崶鐐衡偓鈧敍?    - `resolveSecondaryTimerExistingTailAnchor`
    - 瑜?parent 闁挎氨鍋ｆ稉宥呭讲閻劍妞傞敍灞芥礀闁偓閺屻儲澹?`timerbox` 閸愬懎鎮?parent 閻ㄥ嫭妫﹂張?secondary row 娴ｆ粈璐熼柨姘卞仯閿?  - 閺傛澘顤?descriptor 閸樺鍣搁敍?    - `resolveSecondaryTimerPlacementRowKey`
    - `shouldSkipSecondaryTimerPlacementRow`
    - `placeSecondaryTimerRowsNearParents` 鐎电懓鎮撴稉鈧?rowId 閻ㄥ嫰鍣告径?descriptor 閸欘亜顦╅悶鍡曠濞喡扳偓?
### 2) 鐞涖儵缍堥垾婊堟晪閻愮懓娲栭柅鈧?+ 閸樺鍣搁垾婵嗗礋濞?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `falls back to existing same-parent secondary row when parent anchor is unavailable`
    - 閺嶏繝鐛?parent 闁挎氨鍋ｇ紓鍝勩亼閺冭绱濇禒宥呭讲閸╄桨绨崥?parent 閺冦垺婀?secondary row 鐎瑰本鍨氶幓鎺戝弳閵?  - `deduplicates descriptors that target the same secondary row id`
    - 閺嶏繝鐛欓崥?rowId 闁插秴顦?descriptor 娴犲懓袝閸欐垳绔村▎鈩冨絻閸忋儻绱濋柆鍨帳闁插秴顦?DOM 閹垮秳缍旈妴?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础 placement 閺€鑸垫殐閿涘奔绗夐弨鐟板綁濮濓絽鐖堕柨姘卞仯閸欘垳鏁ら崷鐑樻珯閻ㄥ嫭褰冮崗銉х波閺嬫粣绱?- 閸楁洘绁村鏌ユ敚鐎规埃鈧粓鏁嬮悙鍦繁婢跺崬褰查崶鐐衡偓鈧?/ 闁插秴顦?descriptor 閸樺鍣搁垾婵婄珶閻ｅ矉绱濋梽宥勭秵閸氬海鐢婚柌宥嗙€崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 閻ㄥ嫬銇戦弫鍫濇礀闁偓娑撳氦绶崗銉ュ箵闁插秷绔熼悾灞藉嚒缁惧啿鍙嗛崶鐐茬秺娣囨繈娈伴妴?
---

## 缁?7閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 784 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (39 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑47閹电懓鎮楅敍瀹籩condary timer placement 閸︺劑鏁嬮悙鐟般亼閺佸牅绗岄柌宥咁槻 descriptor 閸︾儤娅欐稉瀣徔婢跺洨菙鐎规艾娲栭柅鈧稉搴＄畵缁涘绻氶梾婊愮礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) placement descriptor 瑜版帊绔撮崠鏍电窗閸樺鍣搁柨顔煎磳缁狙傝礋娑撳楠囩粵鏍殣

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `resolveSecondaryTimerPlacementInfo` 閺傛澘顤?descriptor 瑜版帊绔撮崠鏍х摟濞堢绱濋崢濠氬櫢闁款喕绮犻垾婊€绮?rowId閳ユ繂宕岀痪褌璐熼敍?    - `row-id:<rowId>`閿涘牅绱崗鍫礆
    - `parent-child:<parent>:<child>`閿涘牊妫?rowId 閺冭绱?    - 閺冪娀鏁弮璺烘礀闁偓閸?row 瀵洜鏁ら崢濠氬櫢
  - 閺傛澘顤?helper閿?    - `resolveSecondaryTimerPlacementDescriptorRowId`
    - `resolveSecondaryTimerPlacementDedupeKey`
    - `hasSeenSecondaryTimerPlacementRowReference`
  - `shouldSkipSecondaryTimerPlacementRow` 閺€閫涜礋閺€顖涘瘮閳ユ粓鏁崢濠氬櫢 + 瀵洜鏁ら崢濠氬櫢閳ユ繂寮荤捄顖氱窞閵?
### 2) 鐞涖儵缍堥垾婊勬￥ rowId 閸樺鍣搁垾婵婄珶閻ｅ苯宕熷ù?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `deduplicates descriptors without row id by parent+child key`
    - 閺嶏繝鐛欓弮?rowId 娑?parent/child 閻╃鎮撻弮鏈电矌閹绘帒鍙嗘稉鈧▎掳鈧?  - `deduplicates descriptors without row id and child by row reference`
    - 閺嶏繝鐛欓弮?rowId閵嗕焦妫?child 閺冩湹绮涢崣顖炩偓姘崇箖 row 瀵洜鏁ら崢濠氬櫢閿涘矂浼╅崗宥夊櫢婢跺秵褰冮崗銉ｂ偓?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础鏉堟挸鍙嗚ぐ鎺嶇閸栨牭绱濇稉宥嗘暭閸欐ɑ顒滅敮?placement 缂佹挻鐏夐敍灞肩矌閺€鍓佹彛闁插秴顦?descriptor 閻ㄥ嫬绠撶粵澶庣珶閻ｅ矉绱?- 娑擃參鈧柨鍤悳?`resolveSecondaryTimerPlacementInfo` 婢跺秵娼呮惔?`13`閿涘牓妲囬崐?`12`閿涘鎲＄拃锔肩礉瀹告彃婀崥灞惧闁俺绻?helper 閹峰棗鍨庨崶鐐舵儰閸?`0` 閸涘﹨顒熼妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 閻ㄥ嫧鈧粍妫?rowId 閸樺鍣搁垾婵婄珶閻ｅ苯鍑＄痪鍐插弳缁嬪啿鐣鹃崶鐐茬秺娣囨繈娈伴妴?
---

## 缁?8閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 786 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (41 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑48閹电懓鎮楅敍瀹瞝acement descriptor 閸樺鍣搁崷?rowId 缂傚搫銇戦崷鐑樻珯娑撳鍙挎径鍥┣旂€规艾绠撶粵澶夌箽闂呮粣绱濋梻銊ь洣閹镐胶鐢婚崗銊ц雹閵?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) placement 閸樺鍣搁柨顔煎暱缁愪線妲婚幎銈忕窗rowId 闁款喚鎾奸崗?parent 缂佹潙瀹?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `resolveSecondaryTimerPlacementDedupeKey` 鐏?rowId 閸樺鍣搁柨顔荤矤閿?    - `row-id:<rowId>`
  - 閸楀洨楠囨稉鐚寸窗
    - `row-id:<parent>:<rowId>`
  - 閺佸牊鐏夐敍姘朵缉閸忓秳绗夐崥?parent 鐠囶垳鏁ら惄绋挎倱 rowId 閺冭泛褰傞悽鐔绘硶閻栧墎楠囩拠顖氬箵闁插秲鈧?
### 2) placement 闁挎氨鍋ｆ导妯哄帥缁狙嗙珶閻ｅ矉绱皌ail 闁挎氨鍋ｆ径杈ㄦ櫏閺冭埖瀵滄导妯哄帥缁狙冩礀闁偓

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `resolveSecondaryTimerPlacementAnchor` 閺€閫涜礋閺勬儳绱￠崐娆撯偓澶愭懠鐠侯垽绱?    - `tailByParent` -> `parent anchor` -> `existing same-parent tail`
  - 濮ｅ繋绔村銉╁厴妤犲矁鐦?`anchor.parentNode === timerBox`閿涘苯銇戦弫鍫濆灟缂佈呯敾閸ョ偤鈧偓閿涘奔绗夐崘宥呮礈妫ｆ牠鈧鏁嬮悙鐟般亼閺佸牏娲块幒銉︽杹瀵啯褰冮崗銉ｂ偓?
### 3) 鐞涖儵缍堥崘鑼崐闂冨弶濮㈡稉搴ㄦ晪閻愮懓娲栭柅鈧崡鏇熺ゴ

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `does not dedupe same row id across different parents`
    - 閺嶏繝鐛欓惄绋挎倱 rowId 閸︺劋绗夐崥?parent 娑撳娼庨崣顖滃缁斿鎯ゆ担宥忕礉娑撳秳绨伴惄绋挎偠楠炶翰鈧?  - `falls back to parent anchor when per-parent tail anchor becomes invalid`
    - 閺嶏繝鐛欏В蹇曞煑缁?tail 闁挎氨鍋ｆ径杈ㄦ櫏閸氬函绱濇禒宥堝厴閸ョ偤鈧偓閸?parent 闁挎氨鍋ｇ紒褏鐢婚幓鎺戝弳閵?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础鏉堝湱鏅弨鑸垫殐閿涘奔绗夐弨鐟板綁濮濓絽鐖堕弫鐗堝祦娑撳娈?placement 缂佹挻鐏夐敍?- 閺傛澘顤冮崡鏇熺ゴ闁夸礁鐣鹃垾婊嗘硶 parent 閸樺鍣搁崘鑼崐闂冨弶濮?+ 闁挎氨鍋ｆ径杈ㄦ櫏閸ョ偤鈧偓閳ユ繆顢戞稉鐚寸礉闂勫秳缍嗛崥搴ｇ敾閸ョ偛缍婃搴ㄦ珦閵?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 閸愯尙鐛婇梼鍙夊Б娑撳酣鏁嬮悙閫涚喘閸忓牏楠囨潏鍦櫕瀹歌尙鎾奸崗銉ユ礀瑜版帊绻氶梾婧库偓?
---

## 缁?9閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 788 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (43 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幐澶屾暏閹寸柉顩﹀Ч鍌涙弓閹笛嗩攽閺堫剙婀?smoke閿涘牓浼╅崗宥呮儙閸斻劍绁荤憴鍫濇珤缁愭褰涢敍澶堚偓?
缂佹捁顔戦敍姘鳖儑49閹电懓鎮楅敍瀹瞝acement 閸︺劉鈧粏娉?parent rowId 閸愯尙鐛?+ tail 闁挎氨鍋ｆ径杈ㄦ櫏閳ユ繂婧€閺咁垯绗呴崗宄邦槵缁嬪啿鐣鹃崶鐐衡偓鈧稉搴＄畵缁涘绻氶梾婊愮礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) placement 鏉堟挸鍙嗚ぐ鎺嶇閸栨牕鍘规惔鏇窗闂堢偞纭?parent/child 閸欘垰娲栭柅鈧崚?row 閸忓啯鏆熼幑?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `resolveSecondaryTimerPlacementInfo` 閻?parent/child 鐟欙絾鐎介弨閫涜礋娑撳顔岄崶鐐衡偓鈧敍?    - descriptor 閸婄》绱欐导妯哄帥閿?    - row `data-secondary-parent` / `data-secondary-child`
    - row id閿涘潉timer-row-secondary-<parent>-<child>`閿?  - 閺傛澘顤?helper閿?    - `resolveSecondaryTimerPlacementParentValue`
    - `resolveSecondaryTimerPlacementChildValue`
    - `resolveSecondaryTimerPlacementRowNumericAttribute`
    - `resolveSecondaryTimerPlacementRowIdentity`
- 閺佸牊鐏夐敍姝瀍scriptor 鏉堟挸鍙嗛崙铏瑰箛闂堢偞纭?parent/child 閺冭绱濇稉宥呭晙閻╁瓨甯存稉銏犵磾閸欘垵鎯ゆ担?row閿涘苯褰查崺杞扮艾 row 閸忓啩淇婇幁顖滄埛缂侇厼鐣幋?placement閵?
### 2) stale secondary row 閹殿偅寮挎潏鍦櫕閺€鑸垫殐閿涙矮绮庡〒鍛倞閳ユ粏顫夐懠鍐ㄥ綀缁犫檧鈧即ow id

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`parseSecondaryTimerRowIdentity`閿涘奔绮庣拠鍡楀焼鐟欏嫯瀵?id閿?    - `timer-row-secondary-<parent>-<child>`
    - 娑撴梹寮х搾?`parent>=8192`閵嗕梗child>=2048`閵嗕梗child<parent`閵嗕胶鍩楃€涙劕娼庢稉?2 閻ㄥ嫬绠?  - `isSecondaryTimerManagedRowNode` 閺€閫涜礋閸╄桨绨拠銉ㄐ掗弸鎰波閺嬫粌鍨介弬顓炲綀缁犅ゅΝ閻愬箍鈧?- 閺佸牊鐏夐敍姝歳emoveStaleSecondaryTimerRows` 娑撳秴鍟€鐠囶垱绔婚悶鍡曠矌閳ユ粌澧犵紓鈧惄闀愭妧娴ｅ棝娼憴鍕瘱閳ユ繄娈戦懞鍌滃仯閿涘tale 濞撳懐鎮婇懠鍐ㄦ纯閺囨潙褰查幒褋鈧?
### 3) 鐞涖儵缍堣ぐ鎺嶇閸栨牕鍘规惔鏇氱瑢 stale 鏉堝湱鏅崡鏇熺ゴ

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `removes only canonical stale secondary rows during descriptor refresh`
    - 閺嶏繝鐛?stale 濞撳懐鎮婇崣顏勫灩闂勩倛顫夐懠鍐ㄥ綀缁?row閿涘奔绻氶悾娆撴姜鐟欏嫯瀵栭崜宥囩磻閼哄倻鍋ｉ妴?  - `normalizes placement parent/child from row metadata when descriptor values are invalid`
    - 閺嶏繝鐛?descriptor 闂堢偞纭堕崐鐓庡讲閸ョ偤鈧偓閸?row data 鐏炵偞鈧冪暚閹存劖褰冮崗銉ｂ偓?  - `falls back to row id when descriptor and row metadata parent/child are invalid`
    - 閺嶏繝鐛?descriptor 娑?row data 閸氬本妞傞棃鐐寸《閺冩湹绮涢崣顖氭礀闁偓 row id 鐎瑰本鍨氶幓鎺戝弳閵?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗙仦鐐扮艾闂冩彃灏藉蹇氱珶閻ｅ本鏁归弫娑崇礉娑撳秵鏁奸崣妯活劀鐢瓕绶崗銉ょ瑓閻?placement 鐠侯垰绶為敍?- 閺傛澘顤冮崡鏇熺ゴ闁夸礁鐣鹃垾婊堟姜濞夋洝绶崗銉ュ幑鎼?+ stale 閹殿偅寮挎潏鍦櫕閳ユ繆顢戞稉鐚寸礉闂勫秳缍嗛崥搴ｇ敾閸ョ偛缍婃搴ㄦ珦閵?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 瑜版帊绔撮崠鏍у幑鎼存洑绗?stale row 濞撳懐鎮婃潏鍦櫕瀹歌尙鎾奸崗銉ユ礀瑜版帊绻氶梾婧库偓?
---

## 缁?0閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 791 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (44 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪tail history ... (runs kept: 2)`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤嗛幍褑顢?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑50閹电懓鎮楅敍瀹瞝acement 閸︺劉鈧粓娼▔?descriptor parent/child + 闂堢偠顫夐懠鍐ㄥ缂傗偓 stale row閳ユ繂婧€閺咁垯绗呴崗宄邦槵缁嬪啿鐣鹃崗婊冪俺娑撳氦绔熼悾宀勬缁傛槒鍏橀崝娑崇礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) placement 鏉堟挸鍙嗘稉鈧懛瀛樷偓褎鏁归弫娑崇窗invalid child 娑撳秴鍟€閸欏倷绗?parent-child 閸樺鍣搁柨?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`isValidSecondaryTimerParentChildPair`閿涘瞼绮烘稉鈧?secondary parent/child 閸氬牊纭堕幀褍鍨界€规熬绱?    - `parent>=8192`
    - `child>=2048`
    - `child<parent`
    - 閻栬泛鐡欓崸鍥﹁礋 2 閻ㄥ嫬绠?  - `resolveSecondaryTimerPlacementChildValue` 閺€閫涜礋娴犲懎婀稉濠呭牚閸氬牊纭堕弶鈥叉濠娐ゅ喕閺冩儼绻戦崶?child閿涘苯鎯侀崚娆掔箲閸?`null`閵?- 閺佸牊鐏夐敍?  - `child>=parent` 閹?`child` 闂?2 閻ㄥ嫬绠撻弮璁圭礉娑撳秴鍟€閻㈢喐鍨?`parent-child:*` 閸樺鍣搁柨顕嗙幢
  - placement 娑?dedupe 鐎靛綊娼▔?child 閻ㄥ嫬顦╅悶鍡曠箽閹镐椒绔撮懛杈剧礄閸ョ偤鈧偓閸?row-id/row-reference 鐠侯垰绶為敍澶堚偓?
### 2) secondary state 閹垹顦叉潻鍥ㄦ姢鏉堝湱鏅悰銉╃秷閿涙艾绱撶敮?state 鐞涘瞼娲块幒銉ゆ丢瀵?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `applySecondaryTimerRowsState` 閸︺劍鐎?`stateByKey` 閸撳稄绱濋弬鏉款杻 parent/child 閸氬牊纭堕幀褑绻冨銈忕礄婢跺秶鏁?`isValidSecondaryTimerParentChildPair`閿涘鈧?  - `parseSecondaryTimerRowIdentity` 閸氬本顒炴径宥囨暏鐠囥儱鎮庡▔鏇熲偓?helper閿涘矂浼╅崗宥堫潐閸掓瑦绱撶粔姹団偓?- 閺佸牊鐏夐敍?  - 閹垹顦查柧鎹愮熅娑撳秳绱伴幒銉ф捈 `child>=parent`閵嗕線娼?2 楠?child 缁涘绱撶敮?state 鐞涘矉绱?  - row id 鐟欙絾鐎界憴鍕灟娑?state 閹垹顦茬憴鍕灟娣囨繃瀵旈崡鏇氱閺夈儲绨妴?
### 3) 鐞涖儵缍堟稉鈧懛瀛樷偓褌绗屾潻鍥ㄦ姢閸楁洘绁?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `does not dedupe invalid child>=parent descriptors by parent+child key`
  - `does not dedupe non-power-of-two child descriptors by parent+child key`
  - `filters malformed secondary state rows before applying timer text`
- 鐠囧瓨妲戦敍?  - 閸氬本顒為幍鈺佺潔 `loadBaseHelpersRuntime` 閻ㄥ嫭绁寸拠鏇犺閸ㄥ绱濋弳鎾苟 `applySecondaryTimerRowsState` 娴犮儴顩惄鏍ㄤ划婢跺秷绔熼悾灞烩偓?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗙仦鐐扮艾闂冩彃灏藉蹇庣閼峰瓨鈧勬暪閺佹冻绱濇稉宥嗘暭閸欐ê鎮庡▔?secondary parent/child 閻ㄥ嫭妫﹂張澶庮攽娑撶尨绱?- 闁俺绻冮弬鏉款杻閸楁洘绁撮柨浣哥暰 閳ユ笅nvalid child 閸樺鍣告稉鈧懛瀛樷偓?+ 瀵倸鐖?state 鏉╁洦鎶ら垾?閸欏矁绔熼悾宀嬬礉闂勫秳缍嗛崥搴ｇ敾閸ョ偛缍婃搴ㄦ珦閵?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 娑?restore 娑撱倖娼柧鎹愮熅閻?parent/child 閸氬牊纭堕幀褑顫夐崚娆忓嚒缂佺喍绔撮妴?
---

## 缁?1閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-18閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 794 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (45 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪tail history ... (runs kept: 3)`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑51閹电懓鎮楅敍瀹籩condary timer 閸︺劉鈧笅nvalid child 鏉堟挸鍙?+ 瀵倸鐖?state 閹垹顦查垾婵嗘簚閺咁垯绗呴崗宄邦槵缂佺喍绔撮崚銈呯暰娑撳海菙鐎规俺绻冨銈忕礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) placement 閸忋儱褰涙稉鈧懛瀛樷偓褎鏁归弫娑崇窗parent 闂堢偞纭堕崐鑲╃埠娑撯偓閸撳秶鐤嗛幏锔藉焻

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`isValidSecondaryTimerParentValue`閿涘瞼绮烘稉鈧?secondary parent 閸氬牊纭堕幀褍鍨界€规熬绱?    - `parent>=8192`
    - `parent` 娑?2 閻ㄥ嫬绠?  - `resolveSecondaryTimerPlacementParentValue` 閺€閫涜礋娴犲懎婀?parent 閸氬牊纭堕弮鎯扮箲閸ョ儑绱?    - descriptor parent
    - row `data-secondary-parent`
    - row id 鐟欙絾鐎?parent
  - `isValidSecondaryTimerParentChildPair` 婢跺秶鏁?parent 閸氬牊纭堕幀?helper閿涘矂浼╅崗宥堫潐閸掓瑥鍨庨崣澶堚偓?- 閺佸牊鐏夐敍?  - `parent<8192` 閹存牠娼?2 楠?parent 閸?placement 閸忋儱褰涢崡瀹狀潶娑撯偓閼风绻冨銈忕幢
  - 閸樺鍣搁柨顔界€杞扮瑢闁挎氨鍋ｇ拋锛勭暬娑撳秴鍟€婢跺嫮鎮婇棃鐐寸《 parent閿涘矁顢戞稉鐑樻纯缁嬪啿鐣鹃崣顖烆暕閺堢喆鈧?
### 2) applySecondaryTimerRowsState 闁插秴顦?key 娴兼ê鍘涚痪褑绔熼悾宀兯夋?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`applies duplicate secondary state rows by last occurrence order`
    - 閺嶏繝鐛欓崥灞肩 `parent|child` 閸戣櫣骞囬柌宥咁槻 state 鐞涘本妞傞敍灞芥倵閸戣櫣骞囩悰宀冾洬閻╂牕鍘涢崙铏瑰箛鐞涘矉绱檒ast winner閿涘绱?    - 閸欏秴鎮滄潏鎾冲弳妞ゅ搫绨崥灞剧壉閸欘垰娲栭弨鎯у毉鐎电懓绨查垾婊勬付閸氬簼绔撮弶锛勬晸閺佸牃鈧繄绮ㄩ弸婧库偓?
### 3) placement 闂堢偞纭?parent 鏉堝湱鏅崡鏇熺ゴ鐞涖儵缍?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`skips placement when parent is below 8192 or not power-of-two`
    - 鐟曞棛娲?descriptor parent 娑?`<8192`閿?    - 鐟曞棛娲?descriptor parent 娑撴椽娼?2 楠炲偊绱?    - 鐟曞棛娲?descriptor 闂堢偞纭舵担?row metadata parent 闂堢偞纭堕敍?8192閿涘绱?    - 閺堢喐婀滈崸鍥︾瑝鏉╂稑鍙?placement閿涘畭timerbox` 缂佹挻鐎穱婵囧瘮娑撳秴褰夐妴?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗙仦鐐扮艾闂冩彃灏藉蹇庣閼峰瓨鈧勬暪閺佹冻绱濇稉宥嗘暭閸欐ê鎮庡▔?secondary parent/child 閻ㄥ嫭妫﹂張澶庮攽娑撶尨绱?- 閺傛澘顤冮崡鏇熺ゴ闁夸礁鐣鹃垾婊堟姜濞?parent 閸忋儱褰涙潻鍥ㄦ姢 + 闁插秴顦?key last winner閳ユ繆绔熼悾宀嬬礉闂勫秳缍嗛崥搴ｇ敾闁插秵鐎崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 閻?parent 閸氬牊纭堕幀褌绗?state 鐟曞棛娲婃导妯哄帥缁狙冾殩缁撅箑鍑￠弰鎯х础閸栨牕鑻熺痪鍐插弳閸ョ偛缍婃穱婵嬫閵?
---

## 缁?2閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 796 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (46 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪tail history ... (runs kept: 4)`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑52閹电懓鎮楅敍瀹籩condary timer 閸︺劉鈧粓娼▔?parent placement + duplicate state key閳ユ繂婧€閺咁垯绗呴崗宄邦槵缂佺喍绔存潻鍥ㄦ姢娑撳海鈥樼€规碍鈧嗩洬閻╂牞顢戞稉鐚寸礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) secondary state 閺傚洦婀伴幁銏狀槻鏉堝湱鏅弨鑸垫殐閿涙氨鈹栫€涙顑佹稉鍙夋箒閺佸牞绱濋棃鐐茬摟缁楋缚瑕嗘稉銏犵磾

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`normalizeSecondaryTimerRowStateTime`閿?    - `time` 缂傚搫銇?-> 瑜版帊绔存稉?`""`
    - `time` 娑撳搫鐡х粭锔胯閿涘牆鎯堢粚鍝勭摟缁楋缚瑕嗛敍?> 閻╁瓨甯撮柌鍥╂暏
    - `time` 娑撴椽娼€涙顑佹稉?-> 鐟欏棔璐熼棃鐐寸《 state 鐞涘苯鑻熸稉銏犵磾
  - `applySecondaryTimerRowsState` 閺€閫涜礋閸︺劍鐎?`stateByKey` 閺冭泛鍘涜ぐ鎺嶇/鏉╁洦鎶?`time`閵?- 閺佸牊鐏夐敍?  - 缁屽搫鐡х粭锔胯缂佈呯敾娴ｆ粈璐熼垾婊勬▔瀵繑绔荤粚琛♀偓婵婎嚔娑斿寮稉?last-winner閿?  - 闂堢偛鐡х粭锔胯 `time` 娑撳秴鍟€鐟曞棛娲婇崥?key 閻ㄥ嫭婀侀弫鍫濈摟缁楋缚瑕嗛悩鑸碘偓渚婄礉閹垹顦茬悰灞艰礋閺囧菙鐎规艾褰叉０鍕ゴ閵?
### 2) placement descriptor 閸樺鍣搁柨顔煎讲鐟欏倹绁撮幀褑藟姒绘劧绱扮拫鍐槸韫囶偆鍙庨拃钘夋勾

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?placement 鐠嬪啳鐦箛顐ゅ弾 helper閿?    - `createSecondaryTimerPlacementDebugSnapshot`
    - `markSecondaryTimerPlacementDedupeObserved`
    - `publishSecondaryTimerPlacementDebugSnapshot`
  - `placeSecondaryTimerRowsNearParents` 閸︺劍鐦″▎鈩冨⒔鐞涘苯鎮楅崘娆忓弳 `manager.secondaryTimerPlacementDebugSnapshot`閿涘苯瀵橀崥顐窗
    - `totalDescriptors`
    - `validPlacementDescriptors`
    - `placed`
    - `skippedDuplicate`
    - `skippedMissingAnchor`
    - `dedupeKeyHits`
- 閺佸牊鐏夐敍?  - 娑撳秵鏁奸崣?placement 娑撴艾濮熺捄顖氱窞閿?  - 閹绘劒绶甸崣顖滄纯閹恒儳鏁ゆ禍搴ょ槚閺傤厾娈戦崢濠氬櫢閸涙垝鑵?鐠哄疇绻冪紒鐔活吀韫囶偆鍙庨敍灞肩┒娴滃骸鎮楃紒顓炵暰娴?descriptor 鏉堟挸鍙嗙拹銊╁櫤闂傤噣顣介妴?
### 3) tail lines 姒涙顓婚崐鍏煎絹濡楀牐鎯ら崷甯窗CI 娴?`120` 閺€鑸垫殐娑?`80`

- 閺傚洣娆㈤敍姝?github/workflows/smoke.yml`
- 閺€鐟板З閿?  - `REFACTOR_GATE_OUTPUT_TAIL_LINES: "120"` -> `"80"`閵?- 閺傚洣娆㈤敍姝歵ests/unit/release-readiness-check-helpers.spec.ts`
- 閺€鐟板З閿?  - 閸氬本顒為弽铚傜伐 workflow 娑擃厾娈?`REFACTOR_GATE_OUTPUT_TAIL_LINES` 閸婇棿璐?`80`閿涘奔绻氶幐浣割殩缁撅附鐗辨笟瀣╃閼锋番鈧?- 娓氭繃宓侀敍?  - `report:refactor-progress` 瑜版挸澧犻弽閿嬫拱缁鳖垵顓?`runs kept: 5`閿?  - 閺堫剝鐤嗙憴鍌涚ゴ `output_tail_lines: 80` 娑?`tail_lines_band: balanced`閵?
### 4) 閸楁洘绁寸悰銉╃秷

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`treats empty-string state time as valid and ignores non-string overrides`
    - 閺嶏繝鐛欓崥?key 娑撳娼€涙顑佹稉?`time` 娑撳秷顩惄鏍у嚒閺堝婀侀弫鍫濈摟缁楋缚瑕嗛敍?    - 閺嶏繝鐛欑粚鍝勭摟缁楋缚瑕?`time` 娴ｆ粈璐熼張澶嬫櫏閻樿埖鈧礁褰查悽鐔告櫏濞撳懐鈹栭妴?  - 閸?`deduplicates descriptors without row id by parent+child key` 娑擃叀藟閸忓懏鏌囩懛鈧敍?    - `secondaryTimerPlacementDebugSnapshot` 閻?`dedupeKeyHits/skippedDuplicate/placed` 缂佺喕顓哥粭锕€鎮庢０鍕埂閵?
### 5) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础閺€鑸垫殐娑撳骸褰茬憴鍌涚ゴ閹冾杻瀵尨绱濇稉宥嗘暭閸氬牊纭舵潏鎾冲弳娑撳娈戦弽绋跨妇娑撴艾濮熺拠顓濈疅閿?- 闁俺绻冮弬鏉款杻閸楁洘绁撮柨浣哥暰閳ユ粎鈹栫€涙顑佹稉?vs 闂堢偛鐡х粭锔胯閳ユ繆绔熼悾灞肩瑢閸樺鍣歌箛顐ゅ弾婵傛垹瀹抽敍宀勬娴ｅ骸鎮楃紒顓炴礀瑜版帊绗岄幒鎺楁閹存劖婀伴妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漵econdary state 閹垹顦叉潏鍦櫕娑?placement 閸樺鍣搁崣顖濐潎濞村鈧冨嚒缁惧啿鍙嗛崶鐐茬秺娣囨繈娈伴敍娉僡il lines 姒涙顓婚崐鑹扮殶閺佸瓨褰佸鍫濆嚒鐎瑰本鍨氶獮鎯版儰閸﹂璐?CI 闁板秶鐤嗛妴?
---

## 缁?3閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 797 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (47 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 5`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑53閹电懓鎮楅敍瀹籩condary state 閺傚洦婀伴幁銏狀槻娑?placement 閸樺鍣哥拠濠冩焽閼宠棄濮忛崸鍥у徔婢跺洦妲戠涵顔碱殩缁撅讣绱眛ail lines 閺嶉攱婀伴惄顔界垼瀹歌尪鎻?5 濞嗏€宠嫙瑜般垺鍨氭妯款吇閸婇棿绗呯拫鍐儰閸︽壆绮ㄩ弸婊愮礉闂傘劎顩﹂幐浣虹敾閸忋劎璞㈤妴?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) placement existing-tail 闁挎氨鍋ｉ崘鑼崐閺€鑸垫殐閿涙矮绮庨幒銉ュ綀閸欐顓?parent 娣団剝浼?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`resolveSecondaryTimerExistingTailAnchorParent`閿涘瞼绮烘稉鈧禒搴濅簰娑撳娼靛┃鎰掗弸?existing-tail 閸婃瑩鈧顢?parent閿?    - 鐟欏嫯瀵?row id閿涘潉timer-row-secondary-<parent>-<child>`閿?    - `data-secondary-parent`
  - `resolveSecondaryTimerExistingTailAnchor` 閺€閫涜礋娴犲懎婀陇鍐绘禒銉ょ瑓閺夆€叉閺冭泛娲栭柅鈧崨鎴掕厬閿?    - 閼哄倻鍋?id 娑?`timer-row-secondary-*` 閸撳秶绱戦敍?    - 閸欘垵袙閺嬫劒绗栭崥鍫熺《閻?parent閿涘潉>=8192` 娑?2 閻ㄥ嫬绠撻敍澶夌瑢閻╊喗鐖?parent 娑撯偓閼锋番鈧?- 閺佸牊鐏夐敍?  - 闂堢偠顫夐懠鍐ㄥ缂傗偓鐞涘矉绱欐俊?`timer-row-secondary-legacy-extra`閿涘绗夐崘宥堫潶鐠囶垰缍嬫担?existing-tail 闁挎氨鍋ｉ敍?  - parent row/timer anchor 缂傚搫銇戦弮璁圭礉placement 閸ョ偤鈧偓鐠侯垰绶為弴鏉戝讲閹貉嶇礉閸戝繐鐨拠顖涘絻閸忋儯鈧?
### 2) placement 鐠嬪啳鐦箛顐ゅ弾閺堚偓鐏忓繑鎲崇憰浣割嚤閸?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤冮張鈧亸蹇旀喅鐟曚線鎽肩捄顖ょ窗
    - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot`
    - `resolveSecondaryTimerPlacementDebugSummary`
    - `countSecondaryTimerPlacementDebugKeys`
  - `publishSecondaryTimerPlacementDebugSnapshot` 閻滄澘婀崥灞绢劄閸愭瑥鍙嗛敍?    - `manager.secondaryTimerPlacementDebugSnapshot`閿涘牆鐣弫鏉戞彥閻撗嶇礆
    - `manager.secondaryTimerPlacementDebugSummary`閿涘牐浜ら柌蹇旀喅鐟曚緤绱?- 閹芥顩︾€涙顔岄敍?  - `totalDescriptors`
  - `validPlacementDescriptors`
  - `placed`
  - `skippedDuplicate`
  - `skippedMissingAnchor`
  - `dedupeKeyKinds`
- 閺佸牊鐏夐敍?  - 娑撳搫鎮楃紒?diagnostics 閹恒儱鍙嗛幓鎰返娴ｅ骸娅旈棅鐐解偓浣呵旂€规艾鐡у▓纰夌礉娑撳秹娓剁憰浣烘纯閹恒儲绉风拹鐟扮暚閺?`dedupeKeyHits` 閺勫海绮忛妴?
### 3) 閸楁洘绁寸悰銉╃秷閿涘潊nchor 閸愯尙鐛?+ 閹芥顩︽總鎴犲閿?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`ignores malformed existing-tail rows without managed parent metadata`
    - 閺嶏繝鐛欒ぐ?parent anchor 娑撳秴褰查悽銊︽閿涘矂娼崣妤冾吀 malformed existing-tail 鐞涘奔绗夋导姘愁潶鐠囶垰鎳℃稉顓ㄧ礉descriptor 娑撳秳绱扮拠顖涘絻閸忋儯鈧?  - 閸?`deduplicates descriptors without row id by parent+child key` 娑擃厽鏌婃晶鐐存喅鐟曚焦鏌囩懛鈧敍?    - `resolveSecondaryTimerPlacementDebugSummary(manager)` 鏉堟挸鍤粙鍐茬暰鏉炲鍣虹€涙顔岄妴?  - `falls back to existing same-parent secondary row when parent anchor is unavailable` 閻劋绶ユ稉顓犳畱 existing row 閺€閫涜礋鐟欏嫯瀵?id閿涘奔绻氶幐浣割殩缁撅箒顕㈡稊澶嬫绾喓鈧?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉娲Щ瀵扳€崇础鏉堝湱鏅弨鑸垫殐娑撳骸褰茬憴鍌涚ゴ閹冾杻瀵尨绱濇稉宥嗘暭閸欐ê鎮庡▔?descriptor 閻ㄥ嫪瀵屽ù浣衡柤 placement 鐠囶厺绠熼敍?- 闁俺绻冮弬鏉款杻閸楁洘绁撮柨浣哥暰閳ユ竼xisting-tail 鐠囶垰鎳℃稉顓☆潐闁?+ 閹芥顩︾€涙顔岀粙鍐茬暰閹€鈧繐绱濋梽宥勭秵閸氬海鐢婚幒銉ュ弳 diagnostics 閺冨墎娈戦崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement anchor 闁偓閸栨牞鐭惧鍕畱閸愯尙鐛婃潏鍦櫕娑撳氦鐨熺拠鏇熸喅鐟曚浇绶崙鍝勫嚒缁惧啿鍙嗛崶鐐茬秺娣囨繈娈伴妴?
---

## 缁?4閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 798 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (48 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 6`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑54閹电懓鎮楅敍瀹瞝acement existing-tail 閸ョ偤鈧偓鐠侯垰绶為崷?malformed 閼哄倻鍋ｉ崷鐑樻珯娑撳鍙挎径鍥┣旂€规岸妲荤拠顖氭嚒娑擃叀顢戞稉鐚寸礉娑撴棁浜ら柌蹇氱殶鐠囨洘鎲崇憰浣稿嚒閸欘垯绶甸崥搴ｇ敾 diagnostics 閹恒儱鍙嗛敍宀勬，缁備焦瀵旂紒顓炲弿缂佽￥鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) placement 閸樺鍣哥紒鐔活吀娑撯偓閼峰瓨鈧勬暪閺佹冻绱版稉澶庣熅瀵板嫮鐡ラ悾銉ユ嚒娑擃叀顓搁弫鎵埠娑撯偓

- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - `createSecondaryTimerPlacementDebugSnapshot` 閺傛澘顤?`dedupeStrategyHits`閿?  - 閺傛澘顤?`resolveSecondaryTimerPlacementDedupeStrategy`閿涘瞼绮烘稉鈧拠鍡楀焼閸樺鍣哥粵鏍殣閿?    - `row-id`
    - `parent-child`
    - `row-reference`
  - `shouldSkipSecondaryTimerPlacementRow` 閸︺劋绗佺猾鏄忕熅瀵板嫪绗呯紒鐔剁鐠佹澘缍嶇粵鏍殣閸涙垝鑵戝▎鈩冩殶閿?  - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot` 閺傛澘顤冪粙鍐茬暰閹芥顩︾€涙顔岄敍?    - `rowIdStrategyHits`
    - `parentChildStrategyHits`
    - `rowReferenceStrategyHits`
- 閺佸牊鐏夐敍?  - placement 鐠嬪啳鐦幗妯款洣閸欘垳娲块幒銉ュ隘閸掑棗缍嬮崜宥嗗濞?descriptor 娑撴槒顩︾挧棰佺啊閸濐亝娼崢濠氬櫢鐠侯垰绶為敍?  - 娓氬じ绨崥搴ｇ敾 diagnostics 閸︺劌銇戠拹銉ユ簚閺咁垰鎻╅柅鐔风暰娴ｅ秮鈧粓鍣告径宥堢翻閸忋儲娼甸懛?row-id / parent-child / row-reference 閻ㄥ嫬鎽㈡稉鈧猾鐑┾偓婵勨偓?
### 2) 娑撳鐭惧鍕閼峰瓨鈧冨礋濞村藟姒?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - `deduplicates descriptors that target the same secondary row id`
    - 閺傛澘顤冮幗妯款洣閺傤叀鈻堥敍姝歳owIdStrategyHits=2`閿?  - `deduplicates descriptors without row id by parent+child key`
    - 閺囧瓨鏌婇幗妯款洣閺傤叀鈻堥敍姝歱arentChildStrategyHits=2`閿?  - `deduplicates descriptors without row id and child by row reference`
    - 閺傛澘顤冮幗妯款洣閺傤叀鈻堥敍姝歳owReferenceStrategyHits=2`閵?- 閺佸牊鐏夐敍?  - 閸樺鍣哥紒鐔活吀鐎涙顔岄崷銊ょ瑏閺壜ょ熅瀵板嫪绗呴崸鍥ㄦ箒閸ョ偛缍婃穱婵嬫閿涘矂浼╅崗宥呮倵缂侇厼鐡у▓鍨磽缁夋眹鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗘稉铏瑰嚱閸欘垵顫囧ù瀣偓褌绗屽ù瀣槸閺€鑸垫殐閿涘奔绗夐弨鐟板綁 placement 娑撶粯绁︾粙瀣嚔娑斿绱?- 闁俺绻冩稉澶庣熅瀵板嫮绮虹拋鈥茬閼峰瓨鈧勬焽鐟封偓閿涘矂妾锋担搴℃倵缂?diagnostics 濞戝牐鍨傞幗妯款洣鐎涙顔岄弮鍓佹畱鐠囶垰鍨芥搴ㄦ珦閵?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 閸樺鍣哥紒鐔活吀閸?`row-id / parent-child / row-reference` 娑撳鐭惧鍕瑓瀹告彃鑸伴幋鎰埠娑撯偓閸欘垵顫囧ù瀣殩缁撅负鈧?
---

## 缁?5閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 798 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (49 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 7`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑55閹电懓鎮楅敍瀹瞝acement 閸樺鍣哥紒鐔活吀閹芥顩﹂崣顖溓旂€规俺顩惄鏍︾瑏缁崵鐡ラ悾銉ㄧ熅瀵板嫸绱濋梻銊ь洣閹镐胶鐢婚崗銊ц雹閵?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) placement 鐠嬪啳鐦幗妯款洣缁嬪啿鐣鹃幀褎鏁归弫娑崇窗閺冪姴鎻╅悡褍婧€閺咁垵绻戦崶?0 閸婅偐绮ㄩ弸?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`createSecondaryTimerPlacementDebugSummaryDefaults`閿涘瞼绮烘稉鈧€规矮绠熼幗妯款洣姒涙顓荤紒鎾寸€敍?  - `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot` 閺€閫涜礋閿?    - 鏉堟挸鍙嗛棃鐐差嚠鐠炩€虫彥閻撗勬鏉╂柨娲栨妯款吇 0 閸婂吋鎲崇憰渚婄礄娑撳秴鍟€鏉╂柨娲?`null`閿涘绱?    - 鏉堟挸鍙嗛張澶嬫櫏韫囶偆鍙庨弮璺烘躬姒涙顓荤紒鎾寸€稉濠咁洬閸愭瑧绮虹拋鈥斥偓纭风幢
  - `resolveSecondaryTimerPlacementDebugSummary` 閸?`manager` 缂傚搫銇戦弮璺烘倱閺嶇柉绻戦崶鐐虹帛鐠?0 閸婂吋鎲崇憰浣碘偓?- 閺佸牊鐏夐敍?  - diagnostics 娓氀冨讲閻╁瓨甯村☉鍫ｅ瀭閸ュ搫鐣剧€涙顔岄敍灞肩瑝韫囧懘顤傛径鏍ь槱閻?`null` 閸掑棙鏁敍?  - placement 閺堫亣绻嶇悰灞烩偓浣规￥閺堝鏅?descriptor閵嗕焦鍨ㄩ崗銊╁櫤鐠哄疇绻冮崷鐑樻珯娑撳娼庢潏鎾冲毉缁嬪啿鐣剧紒鎾寸€妴?
### 2) no-valid / all-missing-anchor 鏉堝湱鏅崡鏇熺ゴ鐞涖儵缍?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`keeps debug summary stable when all descriptors are invalid`
    - 閺嶏繝鐛欓崗銊︽￥閺?descriptor 閸︾儤娅欓幗妯款洣鐎涙顔岄崗銊╁劥缁嬪啿鐣炬稉?0閿?  - 閺傛澘顤?`reports missing-anchor counts when all valid descriptors cannot be placed`
    - 閺嶏繝鐛欓崗?missing-anchor 閸︾儤娅欐稉?`validPlacementDescriptors` 娑?`skippedMissingAnchor` 鐠佲剝鏆熷锝団€橀敍?  - 閺傛澘顤?`returns zeroed debug summary when placement has not run`
    - 閺嶏繝鐛欓張顏呭⒔鐞?placement 閺冭埖鎲崇憰浣风矝鏉╂柨娲栫€瑰本鏆?0 閸婅偐绮ㄩ弸鍕剁幢
  - 閸?`skips invalid placement descriptors and anchors outside timerbox` 鐞涖儱鍘栭幗妯款洣閺傤叀鈻堥敍宀冾洬閻╂牑鈧粓鍎撮崚鍡樻箒閺?+ 闁劌鍨?missing-anchor閳ユ繃璐╅崥鍫濇簚閺咁垬鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剝鐤嗙仦鐐扮艾閸欘垵顫囧ù瀣偓褑绶崙鍝勵殩缁撅附鏁归弫娑崇礉娑撳秵鏁奸崣?placement 娑撶粯绁︾粙瀣攽娑撶尨绱?- 閺傛澘顤冩潏鍦櫕閸楁洘绁撮柨浣哥暰閳ユ粎鈹栬箛顐ゅ弾/瀵倸鐖舵潏鎾冲弳/閸忋劏鐑︽潻鍥ｂ偓婵囨喅鐟曚浇绶崙鐚寸礉闂勫秳缍?diagnostics 閹恒儱鍙嗛張鐔碱棑闂勨斂鈧?
缂佹捁顔戦敍姝硊ntime helper 鐏忓繑澹掑▎鈩冩暪閺佹稓鎴风紒顓熷腹鏉╂冻绱漰lacement 鐠嬪啳鐦幗妯款洣閸︺劌鍙ч柨顕€鈧偓閸栨牕婧€閺咁垯绗呭鎻掑徔婢跺洨菙鐎规艾鐡у▓闈涱殩缁撅负鈧?
---

## 缁?6閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 801 tests` 閸忋劑鈧俺绻冮妴?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- `npm run audit:quality`
  - PASS閿涘畭Trend snapshot (50 runs kept)`閿?  - `issues/complexity/coupling/duplicateAdvisoryFiles/duplicateAdvisoryBlocks` 閸у洣璐?`0`閿涘熂?閸忋劋璐?`0`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 8`閵?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑56閹电懓鎮楅敍瀹瞝acement 鐠嬪啳鐦幗妯款洣閸︺劉鈧粍婀潻鎰攽 / 閸忋劍妫ら弫?/ 閸?missing-anchor閳ユ繂婧€閺咁垯绗呴崸鍥у讲缁嬪啿鐣炬潏鎾冲毉閿涘矂妫粋浣瑰瘮缂侇厼鍙忕紒瑁も偓?
---

## 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€樺〒鍛礋閿?
1. 鐟欏倸鐧?CI 閸氬牆鑻熼崥?`REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 閻ㄥ嫮菙鐎规碍鈧?   - 閻╊喗鐖ｉ敍姘崇箾缂侇叀顫囩€?2~3 濞嗭紕婀＄€?CI閿涘瞼鈥樼拋?`tail_lines_band` 缂佸瓨瀵?`balanced` 娑撴柨銇戠拹銉ョ暰娴ｅ秳淇婇幁顖涙￥閺勫孩妯夐幑鐔枫亼閿涙稖瀚㈤崙铏瑰箛 `low` 鏉╃偟鐢婚崨濠咁劅閿涘苯鍟€閸ョ偞绮撮懛?`120`閵?2. 閹稿鎮撴稉鈧崺铏瑰殠閹镐胶鐢诲鈩冾梾閿涘牊鐦￠幍鐟扮箑閸嬫熬绱?   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`
3. 缂佈呯敾閹笛嗩攽 runtime helper 鐏忓繑澹掑▎鈩冩暪閺佹冻绱?~3 閸戣姤鏆?閹电櫢绱?   - 閻╊喗鐖ｉ敍姘躬 0 閸涘﹨顒熼崜宥嗗絹娑撳妲婚崣宥呰剨閿涘苯缂撶拋顔荤瑓娑撯偓閹电浠涢悞?`core_game_manager_base_helpers_runtime.js` 閻?diagnostics 閸欏銈界€电厧鍤敍鍫熸喅鐟曚礁鐡у▓鐢垫閸氬秴宕?+ 閸欘垶鈧鍩呴弬顓ㄧ礆娑撳海骞囬張?`diagnostics-index` 鐎佃甯存０鍕槵鐎涙顔岄妴?4. 鐠囧嫪鍙婇弰顖氭儊鐏?`secondaryTimerPlacementDebugSnapshot` 閹恒儱鍙?diagnostics 閹芥顩?   - 閻╊喗鐖ｉ敍姘喘閸忓牊绉风拹?`secondaryTimerPlacementDebugSummary`閿涘牐鈧矂娼€瑰本鏆ｈ箛顐ゅ弾閿涘绱濋獮鍫曟閸掕泛婀径杈Е閸︾儤娅欐潏鎾冲毉閿涘矂浼╅崗宥呯埗閹焦妫╄箛妤€娅旈棅绛圭幢閸忓牆鐣幋鎰摟濞堢數娅ч崥宥呭礋閿涘苯鍟€閼板啳妾婚拃钘夌氨閸樺棗褰堕妴?
---

## 濮ｅ繑澹掓宀冪槈閸╄櫣鍤庨敍鍫滅箽閹镐椒绗夐崣姗堢礆

- `npm run audit:quality`
- `npm run test:unit`
- `npm run test:smoke:runtime-contract`
- `npm run build`
- 韫囧懓顩﹂弮璁圭窗`node scripts/refactor-gate.mjs --smoke-script=test:smoke:runtime-contract`

---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) placement diagnostics 閸欏銈界€电厧鍤拃钘夋勾閿涙碍鎲崇憰浣烘閸氬秴宕?+ 婢惰精瑙﹂崷鐑樻珯闂傘劍甯?+ 閸欘垶鈧鍩呴弬?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`resolveSecondaryTimerPlacementDiagnosticsPayload(manager, options)`閿?  - 閺傛澘顤冮柊宥咁殰 helper閿?    - `resolveSecondaryTimerPlacementDiagnosticMaxDedupeKeys`
    - `resolveSecondaryTimerPlacementDiagnosticsOptions`
    - `createSecondaryTimerPlacementDiagnosticsPayload`
    - `shouldIncludeSecondaryTimerPlacementDiagnostics`
    - `appendSecondaryTimerPlacementDiagnosticDedupeKeySamples`
  - 鐠囧﹥鏌囨潏鎾冲毉鐎涙顔岄柌鍥╂暏閻ц棄鎮曢崡鏇窗`totalDescriptors / validPlacementDescriptors / placed / skippedDuplicate / skippedMissingAnchor / dedupeKeyKinds / rowIdStrategyHits / parentChildStrategyHits / rowReferenceStrategyHits`閵?- 鐞涘奔璐熺痪锔芥将閿?  - 姒涙顓?`failureOnly=true`閿涘奔绗栨禒鍛躬 `options.failed===true` 閺冩儼绶崙鐚寸幢
  - 姒涙顓婚弮鐘虫た閸旑煉绱檂validPlacementDescriptors=0`閿涘绗夋潏鎾冲毉閿涘苯褰查柅姘崇箖 `includeWhenNoActivity=true` 閺€鎯х磻閿?  - `maxDedupeKeys` 瑜版帊绔撮崠鏍ц嫙娑撳﹪妾?`20`閿涘本鐗遍張顒冪翻閸戠儤鐗稿蹇庤礋 `"<dedupeKey>#<count>"`閵?- 閺佸牊鐏夐敍?  - diagnostics 濞戝牐鍨傛笟褎瀣侀崚鎵旂€规哎鈧椒缍嗛崳顏堢叾閵嗕礁褰茬憗浣稿閻?payload閿?  - 鐢憡鈧焦鍨氶崝鐔荤熅瀵板嫪绗夋禍褏鏁撻弮銉ョ箶閸ｎ亪鐓堕敍灞姐亼鐠愩儴鐭惧鍕徔婢跺洦娓剁亸蹇撳讲鐎规矮缍呮穱鈩冧紖閵?
### 2) 閸楁洘绁寸悰銉╃秷閿涘潷ayload 闂傘劍甯?+ 閺嶉攱婀伴幋顏呮焽 + 閺冪姵妞块崝銊ョ磻閸忕绱?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`returns null diagnostics payload by default when failure flag is not set`
  - 閺傛澘顤?`returns whitelisted diagnostics payload with optional dedupe key samples`
  - 閺傛澘顤?`can include zero-activity diagnostics payload when explicitly requested`

### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓稉鍝勫讲鐟欏倹绁撮幀褍顕遍崙楦垮厴閸旀稑顤冨鐚寸礉娑撳秵鏁?placement 娑撶粯绁︾粙瀣嫲娑撴艾濮熺拠顓濈疅閿?- 闁俺绻冮惂钘夋倳閸楁洖鐡у▓鍏哥瑢婢惰精瑙﹂崷鐑樻珯闂傘劍甯堕敍宀勬娴?diagnostics 閹恒儱鍙嗛梼鑸殿唽鐠囶垳鏁ょ€瑰本鏆ｈ箛顐ゅ弾鐢附娼甸惃鍕）韫囨娅旈棅鎶筋棑闂勨斂鈧?
缂佹捁顔戦敍姘鳖儑57閹电懓鐣幋鎰啊 diagnostics 閸欏銈界€电厧鍤惃鍕壋韫囧啫顨栫痪锔肩礉閸欘垯缍旀稉鍝勬倵缂?diagnostics-index 鐎佃甯撮惃鍕旂€规俺绶崗銉ｂ偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) diagnostics-index 妫板嫭甯撮崗銉ョ摟濞堢绱扮粙鍐茬暰 key + schemaVersion 鐏忎浇顥?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤冪敮鎼佸櫤閿?    - `SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_KEY = "secondaryTimerPlacement"`
    - `SECONDARY_TIMER_PLACEMENT_DIAGNOSTICS_SCHEMA_VERSION = 1`
  - 閺傛澘顤?`resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options)`閿?    - 閸?payload 閸欘垳鏁ら弮鎯扮箲閸?`{ key, schemaVersion, payload }`閿?    - payload 娑撳秴褰查悽銊︽鏉╂柨娲?`null`閵?- 閺佸牊鐏夐敍?  - 娑撳搫鎮楃紒?diagnostics-index 濮瑰洦鈧粯甯撮崗銉﹀絹娓氭稓菙鐎规艾鎳￠崥宥勭瑢閻楀牊婀伴柨姘卞仯閿?  - 娣囨繃瀵旈悳鐗堟箒鐠嬪啰鏁ょ捄顖氱窞閸忕厧顔愰敍灞肩瑝瑜板崬鎼峰鍙夋箒闁槒绶妴?
### 2) 鐠愩劑鍣洪弨鑸垫殐閿涙瓰edupe 閺嶉攱婀扮紒鍕棅閸戣姤鏆熼梽宥咁槻閺夊倸瀹?
- 閺傚洣娆㈤敍姝歫s/core_game_manager_base_helpers_runtime.js`
- 閺€鐟板З閿?  - 閹峰棗鍨?`appendSecondaryTimerPlacementDiagnosticDedupeKeySamples` 娑撹桨绗佸▓?helper閿?    - `collectSecondaryTimerPlacementDiagnosticDedupeEntries`
    - `sortSecondaryTimerPlacementDiagnosticDedupeEntries`
    - `createSecondaryTimerPlacementDiagnosticDedupeKeySamples`
- 閺佸牊鐏夐敍?  - `audit:quality` 閻ㄥ嫬顦查弶鍌氬閸涘﹨顒熸禒?`1` 閸ョ偠鎯ら懛?`0`閿?  - 娣囨繃瀵旂悰灞艰礋娑撳秴褰夐敍灞惧絹閸楀洤鍤遍弫鏉垮讲缂佸瓨濮㈤幀褋鈧?
### 3) 閸楁洘绁寸悰銉╃秷閿涘潟ndex entry 婵傛垹瀹抽敍?
- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-base-helpers-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`returns diagnostics index entry with stable key and schemaVersion`
  - 閺傛澘顤?`returns null diagnostics index entry when payload is excluded`

### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓稉鍝勵嚠閹恒儵顣╂径鍥х摟濞堝吀绗屾径宥嗘絽鎼达附鏁归弫娑崇礉娑撳秵鏁奸崣妯圭瑹閸斅ゎ攽娑撶尨绱?- 閺傛澘顤冩總鎴犲濞村鐦柨浣哥暰 `key/schemaVersion/payload` 缂佹挻鐎敍宀勪缉閸忓秴鎮楃紒顓熺湽閹粯甯撮崗銉︽鐎涙顔屽鍌溞╅妴?
缂佹捁顔戦敍姘鳖儑58閹电懓鎮楅敍瀹抜agnostics payload 瀹告彃鍙挎径鍥ｂ偓婊冨讲閻╁瓨甯村Ч鍥ㄢ偓鐑┾偓婵堟畱缂佹挻鐎崠鏍у弳閸欙綇绱濋獮鍓佹樊閹镐浇宸濋柌蹇涙，缁備礁鍙忕紒瑁も偓?
---

## 缁?8閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-base-helpers-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 806 tests` 閸忋劑鈧俺绻冮妴?- `npm run audit:quality`
  - PASS閿涙瓪issues=0`閵嗕梗complexity=0`閵嗕梗coupling=0`閵嗕梗duplicateAdvisoryFiles=0`閵嗕梗duplicateAdvisoryBlocks=0`閿涘潉Trend snapshot: 50 runs kept`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 9`閵?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑58閹电懓鎮楅敍瀹抜agnostics 妫板嫭甯撮崗銉ㄥ厴閸旀稑鍑￠拃钘夋勾楠炲爼鈧俺绻冮崺铏瑰殠妤犲矁鐦夐敍宀勬，缁備椒绻氶幐浣稿弿缂佽￥鈧?
---

## 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欑粭?8閹电懓鎮楅弴瀛樻煀閿?
1. 鐏?`resolveSecondaryTimerPlacementDiagnosticsIndexEntry` 閹恒儱鍙嗙€圭偤妾?diagnostics 濮瑰洦鈧鍤崣?   - 閻╊喗鐖ｉ敍姘躬娑撳秴绱╅崗銉ョ埗閹礁娅旈棅宕囨畱閸撳秵褰佹稉瀣剁礉娴犲懎銇戠拹銉ユ簚閺咁垱鏁归梿鍡氼嚉 entry 楠炴儼绻橀崗銉х埠娑撯偓缁便垹绱╅妴?2. 娑?diagnostics 濮瑰洦鈧鍤崣锝埶夋稉鈧仦鍌炴肠閹存劖绁寸拠?   - 閻╊喗鐖ｉ敍姘剁崣鐠?`key/schemaVersion/payload` 閸︺劍鐪归幀濠氭懠鐠侯垯鑵戦惃鍕偓蹇庣炊娑撳海鈹栭崐鑹扮箖濠娿倛顢戞稉鎭掆偓?3. 閹镐胶鐢荤憴鍌氱檪 `REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 閻ㄥ嫮婀＄€?CI 缁嬪啿鐣鹃幀?   - 閻╊喗鐖ｉ敍姘辨埛缂侇叀顫囩€?2~3 濞?CI閿涘瞼鈥樼拋?`tail_lines_band` 缂佸瓨瀵?`balanced`閿涙稖瀚㈡潻鐐电敾閸戣櫣骞?`low` 閸愬秷鐦庢导鏉挎礀鐠嬪啨鈧?4. 缂佸瓨瀵斿В蹇斿閸╄櫣鍤庡鈩冾梾閿涘牅绗夐崣姗堢礆
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) 閸樺棗褰堕柧鎹愮熅娣囨繄鏆€ diagnostics entries閿涙瓈ocalHistoryStore 閸忋儱绨辫ぐ鎺嶇閸?
- 閺傚洣娆㈤敍姝歫s/local_history_store.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`normalizeDiagnosticsIndexEntry`閿?  - 閺傛澘顤?`normalizeDiagnosticsIndexEntries`閿?  - `normalizeRecord` 閺傛澘顤冪€涙顔岄柅蹇庣炊閿?    - `diagnostics_index_entries: normalizeDiagnosticsIndexEntries(raw.diagnostics_index_entries)`閵?- 閺佸牊鐏夐敍?  - `saveRecord/importRecords` 鐠侯垰绶炴稉宥呭晙娑撱垹绱?diagnostics 濮瑰洦鈧鐡у▓纰夌幢
  - 閸樺棗褰舵い鐢告桨鐠囪褰囩拋鏉跨秿閺冭泛褰茬粙鍐茬暰閹峰灝鍩岀紒鎾寸€崠?diagnostics entries閵?
### 2) 閸樺棗褰舵い鍨Х鐠愬湱鍋ｉ拃钘夋勾閿涙econdary placement 閸欘亣顕伴幗妯款洣鐏炴洜銇?
- 閺傚洣娆㈤敍姝歫s/history_page.js`
- 閺€鐟板З閿?  - 閺傛澘顤?diagnostics 鐟欙絾鐎芥稉搴＄潔缁€?helper閿?    - `normalizeHistoryDiagnosticsIndexEntry`
    - `normalizeHistoryDiagnosticsIndexEntries`
    - `resolveHistorySecondaryPlacementDiagnosticsEntry`
    - `buildHistorySecondaryPlacementDiagnosticsSummaryText`
    - `appendHistoryDiagnosticsSummary`
  - `renderList` 娑擃厺璐熷В蹇旀蒋鐠佹澘缍嶆潻钘夊閸欘亣顕扮拠濠冩焽閸ф绱欓崨鎴掕厬 `secondaryTimerPlacement` 閺冭泛鐫嶇粈鐚寸礆閿?  - 閺€顖涘瘮閸欘垶鈧鐗遍張顒冾攽閿涘潉dedupeKeySamples` 閺堚偓婢舵艾鐫嶇粈?3 閺夆槄绱氶妴?- 鐏炴洜銇氱粵鏍殣閿?  - 娴犲懎鐫嶇粈铏规閸氬秴宕熼幗妯款洣閺佹澘鈧》绱欓張澶嬫櫏/閺€鍓х枂/閸樺鍣哥捄瀹犵箖/闁挎氨鍋ｇ紓鍝勩亼/閸樺鍣搁柨顔捐閿涘绱?  - 娑撳秵鏁奸崢鍡楀蕉妞ゅ吀瀵屽ù浣衡柤閿涘奔绗夎ぐ鍗炴惙閸ョ偞鏂?鐎电厧鍤?閸掔娀娅庨幐澶愭尦鐞涘奔璐熼妴?
### 3) 閸樺棗褰舵い鍨壉瀵繗藟姒?
- 閺傚洣娆㈤敍姝歴tyle/main.css`
- 閺€鐟板З閿?  - 閺傛澘顤?`.history-item-diagnostics`
  - 閺傛澘顤?`.history-item-diagnostics-samples`
- 閺佸牊鐏夐敍?  - 鐠囧﹥鏌囬幗妯款洣娴犮儰缍嗛獮鍙夊閺嶅嘲绱＄仦鏇犮仛閿涘瞼些閸斻劎顏幑銏ｎ攽閸欘垵顕伴幀褍褰查幒褋鈧?
### 4) smoke 鐟曞棛娲婄悰銉╃秷閿涘牏顏崚鎵伂濞戝牐鍨傛宀冪槈閿?
- 閺傚洣娆㈤敍姝歵ests/smoke/history-records-view-models.smoke.spec.ts`
- 閺€鐟板З閿?  - 濞村鐦▔銊ュ弳鐠佹澘缍嶉弬鏉款杻 `diagnostics_index_entries`閿?  - `renders record head and final board` 閻劋绶ョ悰銉ュ帠閺傤叀鈻堥敍?    - `.history-item-diagnostics` 閸栧懎鎯?`secondaryTimerPlacement`
    - `.history-item-diagnostics` 閸栧懎鎯?`閺堝鏅?3`

### 5) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓稉鍝勭潔缁€鍝勭湴娑撳骸鐡ㄩ崒銊ョ秺娑撯偓閸栨牕顤冨鐚寸礉娑撳秵鏁奸崣妯荤壋韫囧啫顕仦鈧柅鏄忕帆閿?- 闁俺绻冪粩顖氬煂缁?smoke 闁夸礁鐣鹃垾婊嗩唶瑜版洖鍟撻崗?-> 閸樺棗褰舵い鍨閺屾挴鈧繈鎽肩捄顖ょ礉闂勫秳缍嗛崥搴ｇ敾 diagnostics 鐎涙顔岄崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姘鳖儑60閹电懓鐣幋鎰啊 `diagnostics_index_entries` 閻ㄥ嫰顩绘稉顏嗘埂鐎圭偞绉风拹鍦仯閿涘苯宸婚崣鏌ャ€夊鎻掑讲閸欘亣顕扮憴鍌涚ゴ secondary placement 鐠囧﹥鏌囬幗妯款洣閵?
---

## 缁?0閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-models.smoke.spec.ts`
  - PASS閿涙瓪3 passed`閿涘牆宸婚崣鏌ャ€夌拠濠冩焽閹芥顩︾仦鏇犮仛闁炬崘鐭鹃柅姘崇箖閿涘鈧?- `npm run audit:quality`
  - PASS閿涙瓪issues=0`閵嗕梗complexity=0`閵嗕梗coupling=0`閵嗕梗duplicateAdvisoryFiles=0`閵嗕梗duplicateAdvisoryBlocks=0`閵?- `npm run test:unit`
  - PASS閿涙瓪138 files / 809 tests` 閸忋劑鈧俺绻冮妴?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 11`閵?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑60閹电懓鎮楅敍瀹抜agnostics entries 瀹告彃婀崢鍡楀蕉妞ら潧鑸伴幋鎰讲鐟欏倹绁撮梻顓犲箚閿涘矂妫粋浣风箽閹镐礁鍙忕紒瑁も偓?
---

## 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欑粭?0閹电懓鎮楅弴瀛樻煀閿?
1. 婢х偛濮?`diagnostics_index_entries` 娴ｆ挾袧缁撅附娼?   - 閻╊喗鐖ｉ敍姘礋 entry 閺佷即鍣烘稉搴㈢壉閺堫剟鏆辨惔锕侇啎缂冾喚绮烘稉鈧稉濠囨閿涘牆鎯堢€电厧鍙?鐎电厧鍤捄顖氱窞閿涘绱濋梼鍙夘剾閺嬩胶顏?payload 閼躲劏鍎夐妴?2. 鐞涖儱鍘?diagnostics entries 閻ㄥ嫬顕遍崗銉ヮ嚤閸戝搫娲栬ぐ鎺旀暏娓?   - 閻╊喗鐖ｉ敍姘剁崣鐠?`exportRecords/importRecords` 閸?diagnostics 鐎涙顔屾稉宥勬丢婢朵究鈧椒绗夐悾绋胯埌閵?3. 鐠囧嫪鍙婇弰顖氭儊閸?replay 妞ょ敻娼版晶鐐插閸欘亣顕?diagnostics 闂堛垺婢?   - 閻╊喗鐖ｉ敍姘秼 `local_history_id` 閹垫挸绱戠拋鏉跨秿閺冭绱濇径宥囨暏閸氬奔绔撮幗妯款洣鐎涙顔岄敍灞肩箽閹镐浇娉曟い鍏哥閼峰瓨鈧佲偓?4. 閹镐胶鐢荤憴鍌氱檪 CI tail-lines 缁嬪啿鐣鹃幀?   - 閻╊喗鐖ｉ敍姘辨埛缂侇叀顫囩€?2~3 濞嗭紕婀＄€?CI閿涘瞼鈥樼拋?`REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 閻?triage 娣団€冲娇缁嬪啿鐣鹃妴?5. 缂佸瓨瀵斿В蹇斿閸╄櫣鍤庡鈩冾梾閿涘牅绗夐崣姗堢礆
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) diagnostics 濮瑰洦鈧鍤崣锝堟儰閸﹀府绱伴幒銉ュ弳 saved-state payload

- 閺傚洣娆㈤敍姝歫s/core_game_manager_saved_state_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`buildSavedGameStateDiagnosticsPayload(manager)`閿涘瞼绮烘稉鈧禍褍鍤敍?    - `diagnostics_index_entries`
  - 閺傛澘顤?secondary placement entry 鐟欙絾鐎介柧鎹愮熅閿?    - `createSavedStateDiagnosticsIndexEntryOptions`
    - `resolveSavedStateSecondaryPlacementDiagnosticsEntry`
    - `isSavedStateDiagnosticsIndexEntry`
    - `normalizeSavedStateDiagnosticsIndexEntries`
  - `buildSavedGameStatePayload` 閻滄澘鍑￠獮璺哄弳 diagnostics 濞堢绱?    - `diagnostics_index_entries`
- 閹恒儱鍙嗙粵鏍殣閿?  - 娴兼ê鍘涚拫鍐暏 `manager.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(options)`閿?  - 閼?manager 閺堫亝瀵曟潪鍊燁嚉閺傝纭堕敍灞藉灟閸ョ偤鈧偓鐠嬪啰鏁ら崗銊ョ湰 `resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, options)`閿涘牐瀚㈢€涙ê婀敍澶涚幢
  - 缂佺喍绔存禒銉ユ祼鐎?options 闁插洭娉﹂敍?    - `failureOnly=false`
    - `includeWhenNoActivity=false`
    - `maxDedupeKeys=3`

### 2) lite payload 閸氬本顒為柅蹇庣炊 diagnostics entries

- 閺傚洣娆㈤敍姝歫s/core_game_manager_saved_state_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?`buildLiteSavedGameStateDiagnosticsPayload(payload)`閿?  - `buildLiteSavedGameStatePayloadFallback` 閻滄澘鎮撳銉ュ瘶閸氼偓绱?    - `diagnostics_index_entries`
- 閺佸牊鐏夐敍?  - 閸楀厖绌?full payload 閸ョ偤鈧偓閸?lite閿涘畳iagnostics 濮瑰洦鈧鍙嗛崣锝呯摟濞堝吀绮涢崣顖欑箽閻ｆ瑣鈧?
### 3) 閸楁洘绁寸悰銉╃秷閿涘澃aved-state 濮瑰洦鈧鍤崣锝忕礆

- 閺傚洣娆㈤敍姝歵ests/unit/core-game-manager-saved-state-runtime.spec.ts`
- 鐟曞棛娲婇悙鐧哥窗
  - 閺傛澘顤?`builds diagnostics index entries from manager helper with stable options`
  - 閺傛澘顤?`falls back to global diagnostics entry resolver when manager helper is unavailable`
  - 閺傛澘顤?`includes diagnostics index entries in full and lite saved payloads`
  - `loadSavedStateRuntime` 婢х偛濮?`extraContext` 濞夈劌鍙嗛懗钘夊閿涘奔绌舵禍搴ㄧ崣鐠囦礁鍙忕仦鈧崶鐐衡偓鈧捄顖氱窞閵?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓禒鍛煀婢?diagnostics 濮瑰洦鈧鐡у▓纰夌礉娑撳秴濂栭崫宥嗩棎閻╂ɑ浠径宥冣偓浣筋吀閸掑棎鈧礁娲栭弨鍓х搼娑撹绗熼崝锟犫偓鏄忕帆閿?- 闁俺绻?full/lite 閸欏矂鎽肩捄顖欑瑢 manager/global 閸欏苯鍙嗛崣锝嗙ゴ鐠囨洩绱濋梽宥勭秵閸氬海鐢?diagnostics 濮瑰洦鈧粯甯撮崗銉︾磽缁夊顥撻梽鈹库偓?
缂佹捁顔戦敍姘鳖儑59閹电懓鍑＄亸?`resolveSecondaryTimerPlacementDiagnosticsIndexEntry` 閹恒儱鍙嗛垾婊冪杽闂勫懎褰查拃鐣屾磸閻ㄥ嫭鐪归幀璇插毉閸欙絺鈧繐绱檚aved-state payload閿涘绱濋獮璺虹暚閹存劕娲栬ぐ鎺楃崣鐠囦降鈧?
---

## 缁?9閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- `npm run test:unit -- tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - PASS閿涘牆鍙忛柌蹇斿⒔鐞涘矉绱氶敍姝?38 files / 809 tests` 閸忋劑鈧俺绻冮妴?- `npm run audit:quality`
  - PASS閿涙瓪issues=0`閵嗕梗complexity=0`閵嗕梗coupling=0`閵嗕梗duplicateAdvisoryFiles=0`閵嗕梗duplicateAdvisoryBlocks=0`閿涘潉Trend snapshot: 50 runs kept`閿涘鈧?- `npm run test:smoke:runtime-contract`
  - PASS閿涙瓪8 passed`閿涘湧laywright runtime contract閿涘鈧?- `npm run build`
  - PASS閿涙瓪tsc && vite build` 閹存劕濮涢妴?- `npm run report:refactor-progress`
  - PASS閿涙瓪output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 10`閵?- `npm run verify:release-ready`
  - PASS閿涙瓪stable docs + scripts + smoke sharding + gate parameterization verified`閵?- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 娑撶儤妫ゆ径纾嬬箥鐞涘矉绱濋張顏勬儙閸斻劌褰茬憴浣圭セ鐟欏牆娅掔粣妤€褰涢妴?
缂佹捁顔戦敍姘鳖儑59閹电懓鎮楅敍瀹籩condary placement diagnostics 瀹告彃鍙挎径鍥у讲閹镐椒绠欓崠鏍ㄧ湽閹鍤崣锝忕礉闂傘劎顩︽穱婵囧瘮閸忋劎璞㈤妴?
---

## 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欑粭?9閹电懓鎮楅弴瀛樻煀閿?
1. 娑?`diagnostics_index_entries` 婢х偛濮炵粩顖氬煂缁旑垱绉风拹鍦仯
   - 閻╊喗鐖ｉ敍姘躬閸樺棗褰剁拋鏉跨秿/鐠嬪啳鐦い鍨絹娓氭稑褰х拠璇茬潔缁€鐚寸礉妤犲矁鐦?entry 缂佹挻鐎崷銊ф埂鐎圭偟鏁ら幋鐤熅瀵板嫬褰茬憴鍌涚ゴ閵?2. 婢х偛濮?diagnostics entries 閻ㄥ嫪缍嬬粔顖滃閺夌喓鐡ラ悾?   - 閻╊喗鐖ｉ敍姘礋 `diagnostics_index_entries` 鐠佸墽鐤嗛弫浼村櫤娑撳﹪妾烘稉搴″讲闁顥嗛崜顏囶潐閸掓瑱绱濋梼鍙夘剾閺嬩胶顏崷鐑樻珯 payload 閼躲劏鍎夐妴?3. 娣囨繃瀵?CI tail-lines 鐟欏倸鐧傜粣妤€褰?   - 閻╊喗鐖ｉ敍姘辨埛缂侇叀顫囩€?2~3 濞嗭紕婀＄€?CI閿涘瞼鈥樼拋?`REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 閻?triage 娣団€冲娇缁嬪啿鐣鹃妴?4. 缂佸瓨瀵斿В蹇斿閸╄櫣鍤庡鈩冾梾閿涘牅绗夐崣姗堢礆
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`

---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) diagnostics entries 娴ｆ挾袧缁撅附娼拃钘夋勾閿涘牆鍙嗘惔鎾崇秺娑撯偓閸栨牕鐪伴敍?
- 閺傚洣娆㈤敍姝歫s/local_history_store.js`
- 閺€鐟板З閿?  - 閺傛澘顤冩稉濠囨鐢悂鍣洪敍?    - `MAX_DIAGNOSTICS_INDEX_ENTRIES = 6`
    - `MAX_DIAGNOSTIC_PAYLOAD_KEYS = 24`
    - `MAX_DIAGNOSTIC_STRING_LENGTH = 160`
    - `MAX_DIAGNOSTIC_ARRAY_ITEMS = 8`
  - 閺傛澘顤?payload 瑜版帊绔撮崠?閹搭亝鏌?helper閿?    - `truncateDiagnosticText`
    - `normalizeDiagnosticPayloadValue`
    - `normalizeDiagnosticPayloadArrayValue`
    - `normalizeDiagnosticPayloadArray`
    - `normalizeDiagnosticPayload`
  - `normalizeDiagnosticsIndexEntry` 娑?`normalizeDiagnosticsIndexEntries` 婢х偛宸辨稉琛♀偓婊冪摟濞堥潧缍婃稉鈧?+ 閺佷即鍣虹憗浣稿閳ユ縿鈧?  - `normalizeRecord` 缂佈呯敾闁繋绱堕獮璺虹秺娑撯偓 `diagnostics_index_entries`閵?- 閺佸牊鐏夐敍?  - `saveRecord/importRecords` 闁炬崘鐭鹃崸鍥у綀閸氬奔绔存稉濠囨缁撅附娼敍?  - 闂冨弶顒涢弸浣侯伂 diagnostics payload 闁姵鍨氶張顒€婀寸拋鏉跨秿娴ｆ挾袧閼躲劏鍎夐妴?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓禒鍛存閺佺増宓佽ぐ鎺嶇閸栨牔绗岀憗浣稿缁涙牜鏆愰敍灞肩瑝閺€鐟板綁閺嶇绺剧€电懓鐪稉搴℃礀閺€鎹愵攽娑撶尨绱?- 缁撅附娼担宥勭艾鐎涙ê鍋嶉崗銉ュ經閿涘苯鍚嬬€瑰湱骞囬張?history/replay 濞戝牐鍨傜粩顖樷偓?
缂佹捁顔戦敍姘鳖儑61閹电懓鐣幋鎰啊 `diagnostics_index_entries` 閻ㄥ嫪缍嬬粔顖涗笉閻炲棗绨虫惔褋鈧?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) import/export 閸ョ偛缍婄憰鍡欐磰鐞涖儵缍堥敍鍧塱agnostics entries閿?
- 閺傚洣娆㈤敍?  - `tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - `tests/smoke/history-records-import-core.smoke.spec.ts`
- 閺€鐟板З閿?  - 鐎电厧鍤悽銊ょ伐閺傛澘顤?diagnostics 鐠佹澘缍嶅▔銊ュ弳閿涘苯鑻熼弬顓♀枅鐎电厧鍤弬鍥ㄦ拱閸栧懎鎯?`secondaryTimerPlacement`閵?  - 鐎电厧鍙嗛敍鍧rge閿涘鏁ゆ笟瀣暈閸忋儴绉撮梽?payload閿涘本鏌囩懛鈧ぐ鎺嶇閸栨牜绮ㄩ弸婊愮窗
    - entry 閺佷即鍣虹憗浣稿娑?`6`
    - 閺傚洦婀扮憗浣稿娑?`160`
    - 閺佹壆绮嶉弽閿嬫拱鐟佷礁澹€娑?`8`
  - 鐎电厧鍙嗛敍鍧甧place閿涘鏁ゆ笟瀣焽鐟封偓 diagnostics key 娣囨繄鏆€娑撴梻绮ㄩ弸鍕讲鐠囨眹鈧?- 閺佸牊鐏夐敍?  - 闁夸礁鐣?`exportRecords/importRecords` 閸?diagnostics 鐎涙顔屾稉濠勬畱娑撳秳娑径鍙樼瑢娑撳秶鏆╄ぐ顫偓?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掓稉?smoke 閸ョ偛缍婄悰銉╃秷閿涘奔绗夐弨閫涚瑹閸斺€插敩閻浇鐭惧鍕剁幢
- 闁俺绻?merge/replace 閸欏矁鐭惧鍕閺夌噦绱濋梽宥勭秵閸氬海鐢荤€电厧鍙嗙€电厧鍤崶鐐茬秺妞嬪酣娅撻妴?
缂佹捁顔戦敍姘鳖儑62閹电懓鐣幋鎰啊 diagnostics entries 閸︺劌顕遍崗銉ヮ嚤閸戞椽鎽肩捄顖滄畱缁旑垰鍩岀粩顖氭礀瑜版帒鍘规惔鏇樷偓?
---

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) replay 妞ら潧褰х拠?diagnostics 闂堛垺婢橀拃钘夋勾

- 閺傚洣娆㈤敍?  - `replay.html`
  - `style/main.css`
  - `js/replay_ui.js`
- 閺€鐟板З閿?  - `replay.html` 閺傛澘顤冮棃銏℃緲閼哄倻鍋ｉ敍?    - `#replay-diagnostics-panel`
    - `#replay-diagnostics-summary`
    - `#replay-diagnostics-samples`
  - `style/main.css` 閺傛澘顤冮棃銏℃緲閺嶅嘲绱￠敍?    - `.replay-diagnostics-panel`
    - `.replay-diagnostics-summary`
    - `.replay-diagnostics-samples`
  - `js/replay_ui.js` 閺傛澘顤冪憴锝嗙€芥稉搴㈣閺?helper閿涘本鏁幐渚婄窗
    - 娴?local history record 鐠囪褰?`secondaryTimerPlacement` diagnostics entry閿?    - 閸?`local_history_id` 閸ョ偞鏂佺捄顖氱窞濞撳弶鐓嬮幗妯款洣娑撳孩鐗遍張顒婄幢
    - 闂堢偛鎳℃稉顓＄熅瀵?閹躲儵鏁婄捄顖氱窞閼奉亜濮╁〒鍛敄闂堛垺婢橀敍灞肩箽閹镐礁褰х拠璁崇瑢娴ｅ骸娅旈棅鐐解偓?- 閺佸牊鐏夐敍?  - history 娑?replay 妞ら潧婀崥灞肩 diagnostics 閹芥顩︾€涙顔屾稉濠傜杽閻滄媽娉曟い鍏哥閼风顫囧ù瀣剁幢
  - 娑撳秴濂栭崫宥呮礀閺€鐐付閸掓湹瀵屽ù浣衡柤閵?
### 2) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈

- 閺堫剚澹掗弰顖氱潔缁€鍝勭湴婢х偛宸遍敍灞肩瑝閺€?replay 娑撴艾濮熼悩鑸碘偓浣规簚閿?- 闁俺绻?smoke 閻劋绶ラ柨浣哥暰閺堫剙婀寸拋鏉跨秿閸ョ偞鏂佹稉瀣畱 diagnostics 鐏炴洜銇氱悰灞艰礋閵?
缂佹捁顔戦敍姘鳖儑63閹电懓鐣幋?replay 妞?diagnostics 閸欘亣顕板☉鍫ｅ瀭閻愮櫢绱濋懛铏劃閳ユ粎顑?0閹电懓鎮楅崜鈺€缍戞稉澶嬪閳ユ繂鍙忛柈銊ョ暚閹存劑鈧?
---

## 缁?1-63閹靛綊鐛欑拠浣界槈閹诡噯绱?026-03-19閿?
- 鐎规艾鎮?smoke閿?  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
    - PASS閿涙瓪2 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
    - PASS閿涙瓪1 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-models.smoke.spec.ts`
    - PASS閿涙瓪3 passed`
  - `npx playwright test --config=playwright.config.ts tests/smoke/pages-replay-runtime.smoke.spec.ts`
    - PASS閿涙瓪15 passed`
- 閸╄櫣鍤庨梻銊ь洣閿?  - `npm run audit:quality` -> PASS閿涘潉issues=0`閵嗕梗complexity=0`閵嗕梗coupling=0`閿?  - `npm run test:unit` -> PASS閿涘潉138 files / 809 tests`閿?  - `npm run test:smoke:runtime-contract` -> PASS閿涘潉8 passed`閿?  - `npm run build` -> PASS閿涘潉tsc && vite build`閿?  - `npm run report:refactor-progress` -> PASS閿涘潉output_tail_lines: 80`閵嗕梗tail_lines_band: balanced`閵嗕梗runs kept: 12`閿?  - `npm run verify:release-ready` -> PASS
- 鐠囧瓨妲戦敍?  - 閺堫剝鐤?smoke 閸у洣璐熼弮鐘层仈鏉╂劘顢戦敍灞炬弓閸氼垰濮╅崣顖濐潌濞村繗顫嶉崳銊х崶閸欙絻鈧?
缂佹捁顔戦敍姘鳖儑61-63閹电懓鐣幋鎰倵閿涘本绔婚崡鏇氳厬閳ユ粓娓堕弨閫涘敩閻讲鈧繄娈戦崜鈺€缍戞い鐟板嚒濞撳懘娴傞敍宀勬，缁備椒绻氶幐浣稿弿缂佽￥鈧?
---

## 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欑粭?3閹电懓鎮楅弴瀛樻煀閿?
1. 閹镐胶鐢荤憴鍌氱檪 CI tail-lines 缁嬪啿鐣鹃幀褝绱欓棃鐐板敩閻焦鏁奸崝顭掔礆
   - 閻╊喗鐖ｉ敍姘辨埛缂侇叀顫囩€?2~3 濞嗭紕婀＄€?CI閿涘瞼鈥樼拋?`REFACTOR_GATE_OUTPUT_TAIL_LINES=80` 閻?triage 娣団€冲娇閹镐胶鐢荤粙鍐茬暰閵?2. 缂佸瓨瀵斿В蹇斿閸╄櫣鍤庡鈩冾梾閿涘牅绶ョ悰宀嬬礆
   - `npm run audit:quality`
   - `npm run test:unit`
   - `npm run test:smoke:runtime-contract`
   - `npm run build`
3. 閸欘垶鈧顤冮柌蹇ョ礄閹稿娓堕敍灞肩瑝閺勵垰缍嬮崜宥嗙閸楁洖绻€閸嬫熬绱?   - 閼汇儱鎮楃紒顓熸煀婢?diagnostics key閿涘本閮ㄩ悽銊ь儑61閹甸€涚秼缁夘垳瀹抽弶鐔剁瑢缁?2/63閹电懓娲栬ぐ鎺撃侀弶鎸庡⒖鐏炴洘绁寸拠鏇氱瑢鐏炴洜銇氶妴?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) WS2-02 閺€璺虹啲閿涙mport/export 閸愭瑥鍙嗛崣锝囩埠娑撯偓
- 閺傚洣娆㈤敍?  - `js/core_game_manager_runtime_call_helpers_runtime.js`
  - `js/core_game_manager_bindings_runtime.js`
  - `js/core_game_manager_replay_helpers_runtime.js`
- 閺€鐟板З閿?  - 閺傛澘顤?replay/import/export 閻╃鍙х紒鐔剁閸愭瑥鍙嗛崣锝忕窗
    - `setRuntimeReplayMoves`
    - `setRuntimeReplaySpawns`
    - `setRuntimeReplayMovesV2`
    - `setRuntimeUndoEnabled`
    - `setRuntimeDisableSessionSync`
    - `setRuntimeReplayDelay`
  - 鐏?replay import/export 闁炬崘鐭炬稉顓犳畱閸忔娊鏁惄瀛樺复鐠у鈧壈绺肩粔璁宠礋缂佺喍绔撮崘娆忓弳閸欙綀鐨熼悽銊ｂ偓?- 閺佸牊鐏夐敍?  - import/export 娑?replay 娑撳鎽肩捄顖氬彠闁款喚濮搁幀浣稿晸閸忋儱鐤勯悳棰佺閼锋潙瀵查敍宀勬娴ｅ骸鎮楃紒顓㈠櫢閺嬪嫬娲栬ぐ鎺楊棑闂勨斂鈧?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npm run verify:prepush`
  - PASS閿?    - game-manager-audit
    - entry-manifest-audit
    - legacy-boundary-audit
    - engine-audit
    - unit
    - smoke
    - build

### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閺堫剚澹掓禒銉⑩偓婊冨晸閸忋儱褰涚紒鐔剁閳ユ繀璐熸稉浼欑礉鐞涘奔璐熺拠顓濈疅娣囨繃瀵旀稉宥呭綁閿涘本婀鏇炲弳閺傛澘濮涢懗钘夊瀻閺€顖樷偓?- 瑜版挸澧犲▓瀣╃稇妞嬪酣娅撻崷銊ょ艾閿涙俺顫夐崚娆忓嚒閽€钘夋勾閸掗鍞惍渚婄礉娴ｅ棗鐨婚張顏勫弿闁劌娴愰崠鏍﹁礋閼奉亜濮╃€孤ゎ吀妞ゅ箍鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. WS3-01閿涙艾鐣幋?replay/import/export 閻?contracts 鐟曞棛娲婇惌鈺呮█閿涘牆鐡у▓鐐光偓浣规降濠ф劑鈧焦绉风拹瑙勬煙閵嗕焦鏌囩懛鈧敍澶堚偓?2. WS8-01閿涙碍鏌婃晶鐐┾偓婊冨彠闁款喚濮搁幀浣稿晸閸忋儰绗夊妤冪搏鏉?runtime helper閳ユ繄娈戠€孤ゎ吀閼存碍婀伴獮鑸靛复閸?CI 闂傘劎顩﹂妴?3. 婢х偠藟閼辨氨鍔嶉崶鐐茬秺閿涙俺澶勯崣铚傝厬韫?閺堫剙婀撮崢鍡楀蕉/閸ョ偞鏂佹い鐢垫畱 smoke 婵傛垹瀹抽崷鐑樻珯閿涘苯鑸伴幋?F sign-off 鐠囦焦宓侀妴?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) WS8-01閿涙艾鍟撻崗銉ㄧ珶閻ｅ矂妫粋渚€顩婚幍纭呮儰閸﹀府绱檙eplay/import/export閿?- 閺傚洣娆㈤敍?  - `scripts/game-manager-audit.mjs`
  - `tests/unit/game-manager-audit-helpers.spec.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?replay 閸忔娊鏁€涙顔岄崘娆忓弳鏉堝湱鏅€孤ゎ吀鐟欏嫬鍨敍?  - 娴犲懎鍘戠拋闀愪簰娑撳鐡у▓闈涙躬 `setRuntime*ForReplay` 閸栧懓顥婇崙鑺ユ殶閸愬懓绁撮崐纭风窗
    - `replayIndex`
    - `replayMoves`
    - `replaySpawns`
    - `replayMovesV2`
    - `undoEnabled`
    - `disableSessionSync`
    - `replayDelay`
  - 娑撯偓閺冿附顥呭ù瀣煂缂佹洝绻冮崘娆忓弳閿涘畭game-manager-audit` 閻╁瓨甯存径杈Е闂冪粯鏌囬妴?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npm run test:unit -- tests/unit/game-manager-audit-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌?unit閿?39 files / 820 tests閿?- `npm run verify:prepush`
  - PASS閿涘潊udit/unit/smoke/build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 瑜版挸澧犻梻銊ь洣瀹歌尙绮＄憰鍡欐磰 replay/import/export 娑撳鎽肩捄顖炵彯妫版垵鍟撻悙鐧哥礉閼宠姤婀侀弫鍫ユЩ濮濄垹娲栧ù浣烘纯閹恒儴绁撮崐绗衡偓?- 閸撯晙缍戞搴ㄦ珦閺勵垵顩惄鏍桨閿涙aved-state/session-init 缁涘膩閸ф鐨诲鍛八夋鎰倱缁槒顫夐崚娆嶁偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. WS3-01閿涙艾鐣幋?replay/import/export contracts 閻晠妯€娑撳孩鏌囩懛鈧妴?2. WS8-01閿涙碍濡搁崘娆忓弳鏉堝湱鏅€孤ゎ吀閹碘晛鐫嶉崚?saved-state/session-init閵?3. 閼辨柨濮?smoke 婵傛垹瀹抽悽銊ょ伐閿涘苯鑸伴幋鎰暚閺佹潙褰傜敮鍐獓鐠囦焦宓侀柧淇扁偓?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) WS3-01 妫ｆ牗澹掗拃钘夋勾閿涙瓭ontracts 鐟曞棛娲婇惌鈺呮█ + 閺堚偓鐏忓繑鏌囩懛鈧?- 閺傚洣娆㈤敍?  - `src/contracts/index.ts`
  - `tests/unit/contracts.spec.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 閺€鐟板З閿?  - 婢х偛濮?replay/import/export 閻ㄥ嫬绻€婵夘偄鐡у▓闈涚埗闁插繋绗屾潻鎰攽閺冭埖娓剁亸蹇旂墡妤犲苯鍤遍弫甯幢
  - 婢х偛濮炵紒鐔剁閻晠妯€鐢悂鍣洪敍宀勬肠娑擃厼锛愰弰搴＄摟濞堢偣鈧胶鏁撴禍褎鏌熼妴浣圭Х鐠愯鏌熼妴浣规焽鐟封偓娴ｅ秶鐤嗛敍?  - 婢х偠藟 unit 濮濓絽寮介悽銊ょ伐閿涘瞼鈥樻穱婵堢叐闂冨吀绗岀€涙顔岀痪锔芥将閸欘垱澧界悰灞烩偓?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npx vitest run tests/unit/contracts.spec.ts`
  - PASS閿? file / 26 tests閿?- `npm run verify:prepush`
  - PASS閿涘潊udit/unit/smoke/build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閺堫剚澹掗幎濞锯偓娓僶ntracts 鐟曞棛娲婇惌鈺呮█閳ユ繀绮犻弬鍥ㄣ€傞惄顔界垼鏉烆兛璐熸禒锝囩垳鐢悂鍣?+ 閸楁洘绁撮弬顓♀枅閿涘苯鍣虹亸鎴濆經婢跺瀹崇€规岸顥撻梽鈹库偓?- 娴犲秹娓堕幍鈺佺潔閼煎啫娲块敍鍧癮ved-state/session-init閿涘鑻熺痪鍐插弳 gate閿涘本澧犻懗钘夎埌閹存劕鐣弫鎾４閻滎垬鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹碘晛鐫嶉惌鈺呮█鐟曞棛娲婇崚?saved-state/session-init閵?2. 閹跺﹦鐓╅梼闈涚暚閺佸瓨鈧勭墡妤犲本甯撮崗?CI gate閵?3. 婢х偠藟 matrix 閺勭姴鐨犻崚?smoke 閻ㄥ嫬娲栬ぐ鎺旀暏娓氬鈧?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) gate 閼辨柨濮╅敍姝漮ntracts-matrix-audit 閽€钘夋勾
- 閺傚洣娆㈤敍?  - `scripts/contracts-matrix-audit.mjs`
  - `scripts/refactor-gate.mjs`
  - `scripts/refactor-timeout-env-keys.mjs`
  - `scripts/release-readiness-check.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - `tests/unit/refactor-timeout-env-keys.spec.ts`
  - `tests/unit/release-readiness-check-helpers.spec.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?contracts 閻晠妯€鐎孤ゎ吀閼存碍婀伴敍?  - 閹恒儱鍙?refactor gate 閹笛嗩攽闁炬拝绱?  - 鐞?timeout env 閺勭姴鐨犻敍?  - 鐞?release-ready 瀵櫣瀹抽弶鐕傜幢
  - 鐞涖儴绶熼崝鈺佸礋濞村妲婚崶鐐衡偓鈧妴?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `node scripts/contracts-matrix-audit.mjs` -> PASS
- `npm run verify:release-ready` -> PASS
- `npm run verify:prepush` -> PASS閿涘牆鎯?contracts-matrix-audit閿?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- contracts 閻晠妯€瀹歌尪绻橀崗?CI 闂冪粯鏌囬柧鎹愮熅閿涘苯娲栭柅鈧搴ㄦ珦閺勫孩妯夐梽宥勭秵閵?- 娴犲秹娓堕幍鈺佺潔鐟曞棛娲婇懠鍐ㄦ纯閼?saved-state/session-init閿涘苯缍嬮崜宥呯潣娴滃簶鈧粓顩婚幍鐟板讲閻㈩煉绱濇稉宥嗘Ц閺堚偓缂佸牓妫撮悳顖椻偓婵勨偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹碘晛鐫嶉惌鈺呮█ + 鐎孤ゎ吀閸?saved-state/session-init閵?2. 婢х偠藟鐎电懓绨?smoke 婵傛垹瀹抽崷鐑樻珯楠炶埖鐭囧ǎ鈧?F sign-off閵?3. 鐠囧嫪鍙?WS3-01 / WS8-01 閻?done 閺夆€叉楠炶泛鍣径鍥ㄦ暪閸欙絻鈧?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) contracts 閻晠妯€閹碘晛鐫嶉崚?saved-state/session-init
- 閺傚洣娆㈤敍?  - `src/contracts/index.ts`
  - `src/bootstrap/play-startup-payload.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 閺€鐟板З閿?  - 閺傛澘顤?`SavedGameStatePayload` / `SessionInitPayload` 閸氬牆鎮撻敍?  - 閺傛澘顤冪€电懓绨茶箛鍛綖鐎涙顔岀敮鎼佸櫤娑撳孩娓剁亸蹇旂墡妤犲苯鍤遍弫甯幢
  - 閻晠妯€娴?3 鐞涘本澧跨仦鏇炲煂 5 鐞涘矉绱濋獮鏈电箽閹镐礁鍚嬬€圭懓鍩嗛崥宥咁嚤閸戞亽鈧?
### 2) gate 閸氬本顒炴稉搴㈢墡妤犲苯顤冨?- 閺傚洣娆㈤敍?  - `scripts/contracts-matrix-audit.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - `tests/unit/contracts.spec.ts`
- 閺€鐟板З閿?  - 鐎孤ゎ吀閼存碍婀伴弨顖涘瘮鐟欙絾鐎?`CORE_CONTRACT_COVERAGE_MATRIX`閿?  - 瀵儤鐗庢灞芥値閸氬矁顢戦弫棰佺瑢濮ｅ繗顢戠€涙顔岀€瑰本鏆ｉ幀褝绱?  - 閸楁洘绁寸憰鍡欐磰閺傛澘鎮庨崥宀冾攽娑撳孩鏌婇弽锟犵崣閸戣姤鏆熼妴?
### 3) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `node scripts/contracts-matrix-audit.mjs` -> PASS
- `npm run verify:release-ready` -> PASS
- `npm run verify:prepush` -> PASS閿涘牆鎯?contracts-matrix-audit閿?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閻╊喖澧?contracts 閻晠妯€鐟曞棛娲婂鍙夊⒖鐏炴洖鍩?saved-state/session-init閿涘瞼绮ㄩ弸鍕磽缁夊顥撻梽鈺勭箻娑撯偓濮濄儰绗呴梽宥冣偓?- 娑撳绔撮梼鑸殿唽娑撴槒顩︽搴ㄦ珦閺勵垪鈧粎宸辩亸鎴狀伂閸掓壆顏?smoke 鐠囦焦宓侀垾婵撶礉闂団偓鐞涖儵缍堥崥搴″晙閸?WS3/WS8 閺€璺哄經閵?
### 5) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 婢х偠藟 saved-state/session-init 閻?smoke 婵傛垹瀹抽崷鐑樻珯閵?2. 鐎孤ゎ吀閼存碍婀版晶鐐插 assertions 鐠侯垰绶炵€涙ê婀幀褎顥呴弻銉ｂ偓?3. 閺佸鎮?F sign-off 鐠囦焦宓侀獮鎯扮槑娴?WS3/WS8 鐎瑰本鍨氶弶鈥叉閵?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) smoke 婵傛垹瀹崇悰銉╃秷閿涘澃aved-state/session-init閿?- 閺傚洣娆㈤敍?  - `tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - `src/contracts/index.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?SessionInit 娑?SavedState 閻ㄥ嫮顏崚鎵伂 smoke 閸氬牆鎮撻弬顓♀枅閿?  - 鐏忓棙鏌?smoke 閸︾儤娅欓幐鍌氬弳 contracts 閻晠妯€ assertions閵?
### 2) matrix 鐎孤ゎ吀婢х偛宸遍敍鍧卻sertions 鐠侯垰绶炵€涙ê婀幀褝绱?- 閺傚洣娆㈤敍?  - `scripts/contracts-matrix-audit.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
- 閺€鐟板З閿?  - 鐎孤ゎ吀閼存碍婀伴弬鏉款杻 assertions 鐎涙顔岀憴锝嗙€芥稉搴ょ熅瀵板嫬鐡ㄩ崷銊︹偓褎顥呴弻銉礄閸?`*` 闁岸鍘ら敍澶涚幢
  - 閸楁洘绁寸憰鍡欐磰鐠侯垰绶炲Λ鈧弻銉︻劀閸欏秵鐗辨笟瀣ㄢ偓?
### 3) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `node scripts/contracts-matrix-audit.mjs` -> PASS
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts` -> PASS
- `npm run verify:prepush` -> PASS

### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閻晠妯€娴犲簶鈧粌鐡у▓闈涚摠閸︺劉鈧繂宕岀痪褍鍩岄垾婊冪摟濞?+ 濞村鐦捄顖氱窞閸欘垵鎻垾婵撶礉鐠愩劑鍣洪梻顓犲箚閺囨潙鐣弫娣偓?- 娑撳绔村銉╂付缂佈呯敾閹绘劕宕岄垾婊嗩洬閻╂牗绻佹惔锔光偓婵囩墡妤犲矉绱濋柆鍨帳閸欘亝婀佺捄顖氱窞濞屸剝婀侀張澶嬫櫏閺傤叀鈻堥妴?
### 5) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 婢х偛濮?contract 鐞涘瞼楠?unit/smoke 鐟曞棛娲婃惔锕傛，缁備降鈧?2. 鐞?saved-state 瀵倸鐖剁捄顖氱窞 smoke閵?3. 閸戝棗顦?WS3/WS8 閺€璺哄經鐠囦焦宓佹稉搴ｎ劮閺€鑸的侀弶瑁も偓?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) WS8-01閿涙瓭ontracts 閻晠妯€鐟曞棛娲婂ǎ鍗炲闂傘劎顩﹂拃钘夋勾
- 閺傚洣娆㈤敍?  - `scripts/contracts-matrix-audit.mjs`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?assertions 濞ｅ崬瀹崇憴鍕灟閿涙碍鐦℃稉?contract 鐞涘矁鍤︾亸鎴犵拨鐎?`1 閺?unit + 1 閺?smoke`閿?  - 閺傛澘顤?`verifyMatrixAssertionCoverageDepth()` 楠炶埖甯撮崗?matrix 鐎孤ゎ吀娑撶粯绁︾粙瀣剁幢
  - 閸楁洘绁寸悰銉╃秷濮濓絽寮介弽铚傜伐閿涘瞼鈥樻穱婵囩箒鎼达箓妫粋浣稿讲闂冪粯鏌囬崶鐐衡偓鈧妴?
### 2) WS3-01閿涙瓔ubmit/SavedState smoke 婵傛垹瀹崇悰銉╃秷
- 閺傚洣娆㈤敍?  - `tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts`
  - `tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - `src/contracts/index.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 閺€鐟板З閿?  - 閸?`/records` 閹绘劒姘﹀ù浣衡柤閹规洝骞忕拠閿嬬湴娴ｆ挸鑻熼弬顓♀枅 `SubmitPayload` 韫囧懎锝炵€涙顔屾稉?`final_board` 閺佹壆绮嶇紒鎾寸€敍?  - 閺傛澘顤?SavedState 瀵倸鐖剁捄顖氱窞 smoke閿?    - `saved-state restore rejects version-mismatch payload`
    - `saved-state restore rejects malformed board payload`
  - 閻晠妯€ assertions 娑撳骸鐔€缁炬寧鏋冨锝呮倱濮濄儲娲块弬甯礉5 鐞?contract 閸у洩鎻崚?`unit + smoke` 閺堚偓娴ｅ酣鍘ゆ０婵勨偓?
### 3) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npm run test:unit -- tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - PASS閿涘牆鍙忛柌?unit閿?40 files / 832 tests閿?- `node scripts/contracts-matrix-audit.mjs`
  - PASS
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-online-submit-timeout-retry.smoke.spec.ts`
  - PASS閿? test閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts`
  - PASS閿? test閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 4) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS3/WS8 閸︺劉鈧粌鐡у▓闈涚暚閺佸瓨鈧?+ 鐠侯垰绶為崣顖濇彧閹?+ 鐟曞棛娲婂ǎ鍗炲 + 瀵倸鐖剁捄顖氱窞 smoke閳ユ繂娲撶仦鍌炴，缁備椒绗傚鎻掕埌閹存劙妫撮悳顖樷偓?- 瑜版挸澧犻崜鈺€缍戞搴ㄦ珦娑撴槒顩﹂弰顖涚ウ缁嬪鈧囶棑闂勨晪绱癋 sign-off 鐠囦焦宓佺悰銊ㄧ箷閺堫亞绮烘稉鈧Ч鍥ㄢ偓鑽ゎ劮閺€韬测偓?
### 5) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鏉堟挸鍤?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?2. 閸氼垰濮?WS3-02閿涘牆宸婚崣鏌ユ瀵繒绮ㄩ弸鍕讣缁夎鍩?contracts閿涘顩婚幍鐟板瀼閻楀洢鈧?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉烆喚婀＄€?CI閿涘瞼鈥樼拋銈嗙箒鎼达箓妫粋浣呵旂€规碍妫ょ拠顖涘Г閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) WS3-02 妫ｆ牗澹掗崚鍥╁閿涙istoryRecord 鏉╂劘顢戦弮?contracts 閸?- 閺傚洣娆㈤敍?  - `src/contracts/index.ts`
  - `src/storage/history-idb.ts`
  - `tests/unit/contracts.spec.ts`
- 閺€鐟板З閿?  - 閸?contracts 娑擃厽鏌婃晶?HistoryRecord 鏉╂劘顢戦弮鍓佸閺夌噦绱?    - `HISTORY_RECORD_REQUIRED_KEYS`
    - `isHistoryRecordLike()`
    - `normalizeHistoryRecordLike()`
  - `history-idb` 娴犲簶鈧粎娲块幒銉ц閸ㄥ鏌囩懛鈧垾婵囨暭娑撹　鈧竷ontracts 瑜版帊绔撮崠鏍у弳閸欙絺鈧繐绱濈憰鍡欐磰鏉╀胶些閵嗕礁顕遍崗銉ｂ偓浣筋嚢閸愭瑣鈧焦鐖堕弽鍥嚢閸欐牞鐭惧鍕┾偓?  - 閸樺棗褰剁€电厧鍙?envelope 閸掋倖鏌囬弨閫涜礋婢跺秶鏁?`isHistoryExportEnvelopeLike()`閿涘苯鍣虹亸鎴︽瀵繒绮ㄩ弸鍕瀻閺€顖樷偓?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npx vitest run tests/unit/contracts.spec.ts`
  - PASS閿? file / 29 tests閿?- `npx vitest run tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - PASS閿? file / 6 tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - PASS閿? tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? test閿?- `node scripts/contracts-matrix-audit.mjs`
  - PASS
- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閺堫剚澹掔€瑰本鍨氭禍?WS3-02 閻ㄥ嫰顩绘稉顏佲偓婊冨讲閹笛嗩攽鏉╀胶些閻愬厜鈧繐绱濋崢鍡楀蕉閺佺増宓侀柧鎹愮熅瀵偓婵绮犻梾鎰础缂佹挻鐎潪顒€鎮?contracts 鏉╂劘顢戦弮鍓佹埂濠ф劑鈧?- 瑜版挸澧犳稉鏄忣洣妞嬪酣娅撻弰?`js/local_history_store.js` 娴犲秳绻氶悾娆戝缁?`normalizeRecord` 鐎圭偟骞囬敍灞界毣閺堫亜鐣崗銊ュ礋娑撯偓閻喐绨崠鏍モ偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹恒劏绻?WS3-02 缁楊兛绨╅幍鐧哥窗鐏?`local_history_store` 瑜版帊绔撮崠鏍偓鏄忕帆閺€鑸垫殐閸?contracts閵?2. 鏉堟挸鍤?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈夋，缁備胶菙鐎规碍妫ょ拠顖涘Г閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) WS3-02 缁楊兛绨╅幍鐧哥窗`local_history_store` 瑜版帊绔撮崠鏍ㄦ暪閺?- 閺傚洣娆㈤敍?  - `src/core/game-settings-storage.ts`
  - `js/core_game_settings_storage_runtime.js`
  - `js/local_history_store.js`
  - `tests/unit/core-game-settings-storage.spec.ts`
- 閺€鐟板З閿?  - 閺傛澘顤冪紒鐔剁閸忋儱褰?`normalizeHistoryRecordFromContext`閿涘湵S 娑?runtime 閸氬本顒為敍澶涚幢
  - `local_history_store` 閻?`normalizeRecord` 閺€閫涜礋娴兼ê鍘涙径宥囨暏鐠囥儱鍙嗛崣锝忕礉fallback 娴犲懍缍旀稉鍝勫悑鐎圭懓鍘规惔鏇幢
  - 娣囨繃瀵?owner/diagnostics 閹碘晛鐫嶇€涙顔岄柅鏄忕帆娑撳秴褰夐敍宀勪缉閸忓秷顢戞稉鍝勬礀瑜版帇鈧?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-21閿?- `npx vitest run tests/unit/core-game-settings-storage.spec.ts`
  - PASS閿? file / 24 tests閿?- `npx vitest run tests/unit/contracts.spec.ts`
  - PASS閿? file / 29 tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-import-core.smoke.spec.ts`
  - PASS閿? tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? test閿?- `node scripts/contracts-matrix-audit.mjs`
  - PASS
- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閸樺棗褰惰ぐ鎺嶇閸栨牠鈧槒绶韫矤 `local_history_store` 閻ㄥ嫬顒濈粩瀣杽閻滄媽娴嗘稉?runtime 閸欘垰顦查悽銊ュ弳閸欙綇绱漌S3-02 缂佈呯敾閸氭垟鈧粌宕熸稉鈧惇鐔哥爱閳ユ繃甯规潻娑栤偓?- 閸撯晙缍戞搴ㄦ珦娑撴槒顩﹂崷銊ュ坊閸欐彃鐫嶇粈鍝勭湴閻ㄥ嫰娈ｅ蹇撶摟濞堝灚瀚剧憗鍛瀻閺€顖ょ礉闂団偓缂佈呯敾閺€鑸垫殐閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹殿偅寮块獮鑸垫暪閺?`history_page.js` / `user_profile_page.js` 閻ㄥ嫬宸婚崣鎻掔摟濞堝灚瀚剧憗鍛瀻閺€顖樷偓?2. 鏉堟挸鍤?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈夋，缁備胶菙鐎规碍妫ょ拠顖涘Г閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) WS3-02 缁楊兛绗侀幍鐧哥窗`user_profile_page` 閸樺棗褰剁拋鏉跨秿瑜版帊绔撮崠鏍ㄦ暪閺?- 閺傚洣娆㈤敍?  - `js/user_profile_page.js`
  - `src/entries/user-profile.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?`normalizeHistoryRecordViaRuntime()`閿涘瞼绮烘稉鈧挧?`CoreGameSettingsStorageRuntime.normalizeHistoryRecordFromContext`閿?  - `normalizeRecordDetailPayload()` 娑?`normalizeUserRecordsFromApi()` 閺€閫涜礋娴兼ê鍘涘☉鍫ｅ瀭 runtime 瑜版帊绔撮崠鏍波閺嬫粣绱濇穱婵堟殌 fallback 閸忔粌绨抽敍?  - `user-profile` 閸忋儱褰涚悰銉╃秷 runtime 娓氭繆绂嗙€电厧鍙嗛敍宀勪缉閸忓秹銆夐棃銏犵湴閸戣櫣骞囬垾婊勬箒鐠嬪啰鏁ら弮鐘虹箥鐞涘本妞傞垾婵堟畱娑撳秳绔撮懛娣偓?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - PASS閿? tests閿?- `npx vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - PASS閿?3 tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閺堫剚澹掔亸?user-profile 閸樺棗褰剁€涙顔岃ぐ鎺嶇閸栨牔绮犳い鐢告桨鐏炲倿鍣告径宥嗗鐟佸懏甯规潻娑樺煂 runtime 缂佺喍绔撮崗銉ュ經閿涘S3-02 閸楁洑绔撮惇鐔哥爱閻╊喗鐖ｇ紒褏鐢婚崜宥堢箻閵?- 瑜版挸澧犻崜鈺€缍戞搴ㄦ珦閺?`history_page.js` 娴犲秵婀佺仦鏇犮仛鐏炲倸鐡у▓闈涘瀻閺€顖ょ礉闂団偓缂佈呯敾閺€鑸垫殐閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹殿偅寮块獮鑸垫暪閺?`history_page.js` 閸撯晙缍戠€涙顔岄幏鑹邦棅閸掑棙鏁敍灞肩喘閸忓牆顦查悽?runtime/contracts 閸忋儱褰涢妴?2. 娴溠冨毉楠炲墎顒烽弨?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ｂ偓?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀婢х偛缍婃稉鈧崠鏍熅瀵板嫰鏆遍張鐔呵旂€规哎鈧?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) WS3-02 缁楊剙娲撻幍鐧哥窗`history_page` 閸樺棗褰剁拋鏉跨秿濞撳弶鐓嬭ぐ鎺嶇閸栨牗鏁归弫?- 閺傚洣娆㈤敍?  - `js/history_page.js`
  - `src/entries/history.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?`normalizeHistoryRecordViaRuntime` / `normalizeHistoryRecordForView`閿涘istory 閸掓銆冨〒鍙夌厠娴兼ê鍘涚挧?runtime contracts 瑜版帊绔撮崠鏍电幢
  - `renderList` 閺€閫涜礋濞戝牐鍨傝ぐ鎺嶇閸栨牜绮ㄩ弸婊愮礉閸戝繐鐨い鐢告桨鐏炲倿鍣告径宥呯摟濞堝灚瀚剧憗鍜冪幢
  - `normalizeBoardMatrix` 娴兼ê鍘涙径宥囨暏 runtime 瑜版帊绔撮崠鏍翻閸戠尨绱濋弮褍鐡х粭锔胯鐟欙絾鐎介柅鏄忕帆娴犲懍绻氶悾?fallback閿?  - `history` entry 鐞涖儵缍?runtime 娓氭繆绂嗙€电厧鍙嗛敍宀勪缉閸忓秷绻嶇悰灞炬閸忋儱褰涚紓鍝勩亼閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-runtime-contract.smoke.spec.ts`
  - PASS閿? tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閺堫剚澹掔€瑰本鍨?history 妞ゅ吀瀵屽〒鍙夌厠闁炬崘鐭鹃惃?contracts/runtime 閺€鑸垫殐閿涘S3-02 閹镐胶鐢婚崥鎴斺偓婊冨礋娑撯偓閻喐绨垾婵囧腹鏉╂稏鈧?- 閸撯晙缍戞搴ㄦ珦娑撴槒顩﹂崷?owner/diagnostics 閻ㄥ嫰銆夐棃顫瑩閻劎绮ㄩ弸鍕剁礉娴犲秹娓堕崡蹇氼唴閸栨牓鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 缂佈呯敾閺€鑸垫殐 owner/diagnostics 缂佹挻鐎獮鎯扮槑娴?contracts/runtime 閸忋儱褰涢妴?2. 娴溠冨毉 WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀鐠侯垰绶為梹鎸庢埂缁嬪啿鐣鹃妴?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) WS3-02 缁楊兛绨查幍鐧哥窗owner/diagnostics 瑜版帊绔撮崠鏍у弳閸欙絿绮烘稉鈧?- 閺傚洣娆㈤敍?  - `src/core/game-settings-storage.ts`
  - `js/core_game_settings_storage_runtime.js`
  - `js/local_history_store.js`
  - `js/history_page.js`
  - `tests/unit/core-game-settings-storage.spec.ts`
- 閺€鐟板З閿?  - 閺傛澘顤?runtime 缂佺喍绔撮崗銉ュ經閿?    - `normalizeHistoryOwnerMetaFromContext`
    - `normalizeHistoryDiagnosticsIndexEntriesFromContext`
  - `local_history_store` 閺€閫涜礋娴兼ê鍘涙径宥囨暏缂佺喍绔撮崗銉ュ經婢跺嫮鎮?owner 娑?diagnostics閿?  - `history_page` 閺€閫涜礋娴兼ê鍘涙径宥囨暏缂佺喍绔撮崗銉ュ經婢跺嫮鎮?owner 閺勫墽銇氭稉?diagnostics 鐟欙絾鐎介敍?  - 鐞涖儵缍?owner/diagnostics 閸楁洘绁撮弬顓♀枅閿涘矁顩惄?key 瑜版帊绔撮崠鏍︾瑢 payload 闂勬劕绠欑憴鍕灟閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/core-game-settings-storage.spec.ts`
  - PASS閿?6 tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- owner/diagnostics 鐟欏嫬鍨韫矤妞ょ敻娼伴弫锝囧仯闁槒绶弨鑸垫殐閸?runtime 閸楁洖鍙嗛崣锝忕礉闂勫秳缍嗘禍鍡楀坊閸欐煡鎽肩捄顖炴瀵繒绮ㄩ弸鍕磽缁夊顥撻梽鈹库偓?- 閸撯晙缍戞搴ㄦ珦閿涙瓭ontracts 鐏炲倸鐨婚張顏呮▔瀵繐锛愰弰?owner/diagnostics 閸楀繗顔呴敍灞肩矝闂団偓娑撳绔撮幍纭吽夋鎰┾偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鐏?owner/diagnostics 瀵洖鍙?`src/contracts` 閺堚偓鐏忓繐宕楃拋顔荤瑢閺傤叀鈻堥妴?2. 娴溠冨毉 WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?3. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋銈嗘煀閸忋儱褰涢梹鎸庢埂缁嬪啿鐣鹃妴?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) WS3-02 缁楊剙鍙氶幍鐧哥窗owner/diagnostics 閸楀繗顔呮潻娑樺弳 contracts
- 閺傚洣娆㈤敍?  - `src/contracts/index.ts`
  - `tests/unit/contracts.spec.ts`
- 閺€鐟板З閿?  - 閹碘晛鐫?`HistoryRecord` 閸楀繗顔呯€涙顔岄敍姝歰wner_type/owner_user_id/owner_nickname/owner_key/diagnostics_index_entries`閿?  - 閺傛澘顤?`HISTORY_OWNER_META_REQUIRED_KEYS`閵嗕梗HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS`閿?  - 閺傛澘顤?owner/diagnostics 閻?normalize + is helper閿?  - `normalizeHistoryRecordLike` / `isHistoryRecordLike` 閼辨柨濮╅弬?helper閿?  - 鐞涖儵缍?contracts 閸楁洘绁存稉搴＄箑婵夘偊鏁弬顓♀枅閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/contracts.spec.ts`
  - PASS閿?1 tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- owner/diagnostics 瀹歌弓绗夐崘宥嗘Ц閳ユ粈绮?runtime 鐟欏嫬鍨垾婵撶礉閼板本妲搁弰搴ｂ€橀惃?contracts 閸楀繗顔呯€涙顔屾稉搴㈢墡妤犲矁鍏橀崝娑栤偓?- 閸撯晙缍戞搴ㄦ珦閺?matrix 鐏忔碍婀悪顒傜彌鐟曞棛娲婃潻娆庤⒈缁崵绮ㄩ弸鍕剁礉閸氬海鐢婚棁鈧拠鍕強閺勵垰鎯侀幍鈺佺潔閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 娴溠冨毉 WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ヨ嫙鐎瑰本鍨氱粵鐐暪閵?2. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋?contracts 閹碘晛鐫嶉梹鎸庢埂缁嬪啿鐣鹃妴?3. 鐠囧嫪鍙婇獮璺哄枀鐎规碍妲搁崥锔藉⒖鐏?contracts matrix 鐟曞棛娲?owner/diagnostics閵?

## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) WS8-01 闂傘劎顩﹂崡鍥╅獓閿涙瓭ontracts matrix 鐟曞棛娲婇幍鈺佺潔閸?`HistoryRecord`
- 閺傚洣娆㈤敍?  - `scripts/contracts-matrix-audit.mjs`
  - `src/contracts/index.ts`
  - `tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - `tests/unit/contracts.spec.ts`
  - `docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md`
- 閺€鐟板З閿?  - matrix gate 娴?5 閸氬牆鎮撻崡鍥╅獓娑?6 閸氬牆鎮撻敍灞炬煀婢?`HistoryRecord`閿?  - token 鐎孤ゎ吀鐞涖儵缍?HistoryRecord 閸?owner/diagnostics 閻╃鍙?required keys 娑?`is*` 閸戣姤鏆熼敍?  - matrix 鐞涘瞼绮︾€?`HistoryRecord` 閻?producer/consumer/assertion閿涘苯鑻熷陇鍐?unit+smoke 濞ｅ崬瀹崇痪锔芥将閿?  - 閸╄櫣鍤庨弬鍥ㄣ€傞崥灞绢劄閸楀洨楠囬崚?6 閸氬牆鎮撻悧鍫熸拱閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - PASS閿?7 tests閿?- `node scripts/contracts-matrix-audit.mjs`
  - PASS
- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- owner/diagnostics 瀹告彃鐤勯悳鎵斥偓娓僶ntracts 閸楀繗顔?+ matrix gate + unit/smoke 濞ｅ崬瀹抽垾婵堟畱娑撳鐪伴梼鎻掓礀闁偓缁撅附娼妴?- 閸撯晙缍戞稉鏄忣洣瀹搞儰缍旀禒搴㈠Η閺堫垰鐤勯悳鎷屾祮閸氭垶绁︾粙瀣劮閺€璁圭礄F sign-off 鐠囦焦宓佺悰顭掔礆閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 娴溠冨毉楠炲墎顒烽弨?WS3/WS8 F sign-off 鐠囦焦宓佺悰銊ｂ偓?2. 鏉╃偟鐢荤憴鍌氱檪 2-3 鏉?CI閿涘瞼鈥樼拋?6 閸氬牆鎮?matrix 缁嬪啿鐣鹃妴?3. 鐠囧嫪鍙婇獮鑸靛⒔鐞?WS8-01 閻?done 閺€璺哄經閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) 濞翠胶鈻奸弨璺哄經閿涙俺藟姒?WS3/WS8 閻?F sign-off 鐠囦焦宓佺悰銊ヨ嫙閺囧瓨鏌婇惇瀣緲閻樿埖鈧?- 閺傚洣娆㈤敍?  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 娴溠冨毉 WS3-01 / WS8-01 閻?F sign-off 鐠囦焦宓佺悰顭掔礄娴ｆ捇鐛?娑撴艾濮?鐠囦焦宓?妞嬪酣娅撻敍澶涚幢
  - 鐏?WS3-01 娴?`in_progress` 閺囧瓨鏌婃稉?`done`閿?  - 鐏?WS8-01 閻ㄥ嫬鏁稉鈧梼璇差敚妞よ妲戠涵顔昏礋閳ユ粌绶?2-3 鏉?CI 鏉╃偟鐢荤粙鍐茬暰閹嗩潎鐎电啿鈧繐绱濇穱婵囧瘮 `in_progress`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/contracts.spec.ts tests/unit/contracts-matrix-audit-helpers.spec.ts`
  - PASS閿?7 tests閿涘本閮ㄩ悽銊ь儑77閹佃鏁归崣锝堢槈閹诡噯绱?- `node scripts/contracts-matrix-audit.mjs`
  - PASS閿涘牊閮ㄩ悽銊ь儑77閹佃鏁归崣锝堢槈閹诡噯绱?- `npm run verify:prepush`
  - PASS閿涘牊閮ㄩ悽銊ь儑77閹佃鏁归崣锝堢槈閹诡噯绱?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS3-01 瀹稿弶寮х搾铏暪閸欙絾娼禒璺鸿嫙鏉烆剙鍙嗙€瑰本鍨氶幀浣碘偓?- WS8-01 瑜版挸澧犳搴ㄦ珦閺€鑸垫殐娑撳搫宕熼悙瑙勭ウ缁嬪顥撻梽鈺嬬礄缂?CI 鏉╃偟鐢荤憴鍌氱檪 run 鐠囦焦宓侀敍澶涚礉娑撳秴鍟€閺勵垰鐤勯悳鎵繁閸欙絻鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹笛嗩攽楠炲墎娅ョ拋?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪閿涘澁un id閵嗕礁鍙ч柨顔筋劄妤犮們鈧胶绮ㄧ拋鐚寸礆閵?2. 缂佈呯敾閹恒劏绻?WS3-02閿涘本绔婚悶鍡楀坊閸欐煡鎽肩捄顖氬⒖娴?fallback 閸掑棙鏁獮鎯八?smoke閵?3. 濠娐ゅ喕缁嬪啿鐣鹃幀褎娼禒璺烘倵閿涘苯鐨?WS8-01 鏉?`done` 楠炶泛鎮撳銉╁櫡缁嬪顣堕悩鑸碘偓浣碘偓?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) WS3-02 缁楊兛绔烽幍鐧哥窗history 妞ょ敻娼?owner/diagnostics 濞撳弶鐓嬮崣锝呯窞閺€鑸垫殐
- 閺傚洣娆㈤敍?  - `js/history_page.js`
- 閺€鐟板З閿?  - owner 閺勫墽銇氭稉宥呭晙閸︺劑銆夐棃銏犵湴閸嬫矮绨╁▎?runtime 瑜版帊绔撮崠鏍电礉缂佺喍绔撮崺杞扮艾 `normalizeHistoryRecordForView()` 鏉堟挸鍤敍?  - `normalizeHistoryRecordForView()` 閺€閫涜礋娴兼ê鍘涙径宥囨暏 runtime 瑜版帊绔撮崠鏍ф倵閻?record閿涘牆鎯?owner/diagnostics/replay閿涘绱濋崙蹇撶毌闁插秴顦茬€涙顔岄幏鑹邦棅閿?  - owner 缁涙盯鈧鈧銆嶉弸鍕紦閺€閫涜礋閸忓牆缍婃稉鈧崠鏍ф倵鐠侊紕鐣婚敍宀€鈥樻穱婵堢摣闁绗岄崚妤勩€冨〒鍙夌厠閸欙絽绶炴稉鈧懛杈剧幢
  - diagnostics 閹芥顩︾拠璇插絿娴兼ê鍘涘☉鍫ｅ瀭瀹告彃缍婃稉鈧崠鏍ㄦ蒋閻╊噯绱濈紓鍝勩亼閺冭泛鍟€鐠ф澘鍘规惔鏇炲瀻閺€顖樷偓?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閸樺棗褰舵い鐢垫畱 owner 娑?diagnostics 瀹歌尪绻樻稉鈧銉︽暪閺佹稑鍩岀紒鐔剁瑜版帊绔撮崠鏍懠鐠侯垽绱濇い鐢告桨鐏炲倿鍣告径宥堫潐閸掓瑧鎴风紒顓炲櫤鐏忔垯鈧?- 瑜版挸澧犳稉鏄忣洣閸撯晙缍戠€圭偟骞囨搴ㄦ珦閸?`local_history_store.js` 閻?fallback 閸掑棙鏁敍宀勬付缂佈呯敾閺€璺哄經閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹恒劏绻?WS3-02 娑撳绔撮幍鐧哥窗閺€鑸垫殐 `local_history_store.js` 娑?owner/diagnostics fallback閵?2. 鐠佹澘缍?WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓侀獮璺虹暚閹存劖鏁归崣锝堢槑娴艰埇鈧?3. 鐟欏倸鐧傛潏鐐垼閸氬骸鐨?WS8-01 娴?`in_progress` 鏉烆兛璐?`done`閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) WS3-02 缁楊剙鍙撻幍鐧哥窗`local_history_store` 瑜版帊绔撮崠鏍熅瀵板嫬骞撻柌?- 閺傚洣娆㈤敍?  - `js/local_history_store.js`
- 閺€鐟板З閿?  - `resolveOwnerMetaFromRaw()` 婢х偛濮?`preferRuntime` 瀵偓閸忕绱濋崗浣筋啅閸︺劌鍑￠張?runtime 瑜版帊绔撮崠鏍波閺嬫粍妞傞柆鍨帳闁插秴顦茬拫鍐暏 runtime閿?  - `normalizeDiagnosticsIndexEntries()` 婢х偛濮?`preferRuntime` 瀵偓閸忕绱濋崙蹇撶毌 diagnostics 閻ㄥ嫰鍣告径?runtime 瑜版帊绔撮崠鏍电幢
  - `normalizeRecord()` 閺€閫涜礋婢跺秶鏁ら崡鏇燁偧 runtime 瑜版帊绔撮崠鏍波閺嬫粣绱檂base`閿涘缍旀稉?owner/diagnostics 娑撶粯绨敍灞藉涧閺堝鐡у▓鐢靛繁婢惰鲸妞傞崘宥呮礀闁偓 raw閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `node scripts/contracts-matrix-audit.mjs`
  - PASS
- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閸樺棗褰剁€涙ê鍋嶉柧鎹愮熅閻ㄥ嫰鍣告径宥呯秺娑撯偓閸栨牞鐨熼悽銊ュ嚒鏉╂稐绔村銉ュ櫤鐏忔埊绱漌S3-02 閳ユ粌宕熸稉鈧惇鐔哥爱閳ユ繄娲伴弽鍥╂埛缂侇厽甯规潻娑栤偓?- 閸撯晙缍戞搴ㄦ珦閼辨氨鍔嶉崷?payload 閹靛浼?sanitize fallback 閺勵垰鎯佹潻妯垮厴缂佈呯敾娑撳鐭囬崚?runtime/contracts閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 缂佈呯敾缁墽鐣?diagnostics payload 閹靛浼?fallback 閸掑棙鏁敍灞借嫙鐞涖儲娓剁亸蹇撴礀瑜版帇鈧?2. 閹笛嗩攽 WS8-01 閻?2-3 鏉?CI 鏉╃偟鐢荤憴鍌氱檪楠炴儼顔囪ぐ?run 鐠囦焦宓侀妴?3. 鐟欏倸鐧傞柅姘崇箖閸氬孩甯规潻?WS8-01 閺€璺哄經鏉?`done`閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) WS3-02 缁楊兛绡€閹电櫢绱癶istory record 瑜版帊绔撮崠鏍︾瑓濞屽鍩?runtime 閸楁洖鍙嗛崣?- 閺傚洣娆㈤敍?  - `src/core/game-settings-storage.ts`
  - `js/core_game_settings_storage_runtime.js`
  - `js/local_history_store.js`
  - `tests/unit/core-game-settings-storage.spec.ts`
- 閺€鐟板З閿?  - `normalizeHistoryRecordFromContext()`閿涘湵S/runtime閿涘澧跨仦鏇氳礋閻╁瓨甯存禍褍鍤?owner 娑?diagnostics 鐎涙顔岄敍灞筋槻閻劍妫﹂張?helper閿?  - `local_history_store` 鐠嬪啰鏁?runtime 瑜版帊绔撮崠鏍ㄦ娴肩姴鍙?auth 娑?diagnostics 闂勬劕绠欓崣鍌涙殶閿?  - runtime 瑜版帊绔撮崠鏍ㄥ灇閸旂喐妞傞惄瀛樺复婢跺秶鏁ょ拋鏉跨秿閿涘苯鍣虹亸?store 鐏?owner/diagnostics 娴滃本顐艰ぐ鎺嶇閸栨牓鈧?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/core-game-settings-storage.spec.ts`
  - PASS閿?6 tests閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閸樺棗褰剁拋鏉跨秿 owner/diagnostics 瑜版帊绔撮崠鏍箻娑撯偓濮濄儰绗呭▽澶婅嫙缂佺喍绔撮敍瀛窼3-02 閸氭垟鈧粌宕熸稉鈧惇鐔哥爱閳ユ繄鎴风紒顓熸暪閺佹稏鈧?- 瑜版挸澧犻崜鈺€缍戦梼璇差敚娑撴槒顩﹂崷?WS8-01 閻?CI 鏉╃偟鐢荤憴鍌氱檪鐠囦焦宓佺悰銉ョ秿閿涘奔绗夐弰顖氱杽閻滄壆宸遍崣锝冣偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鐞涖儱缍?WS8-01 閻?2-3 鏉?CI run 鐠囦焦宓侀獮璺虹暚閹存劘娴?`done` 鐠囧嫪鍙婇妴?2. 鐠囧嫪鍙婇獮鑸电閻炲棗澧挎担?diagnostics payload 閹靛浼?fallback 閸愭ぞ缍戦妴?3. 鐎瑰本鍨?WS8 閺€璺哄經閸氬骸鍨忛幑銏犲煂娑撳绔?workstream 閹佃顐奸妴?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) WS8-01 閺€璺哄經閿涙俺藟瑜版洝绻涚紒?CI 鐟欏倸鐧傜拠浣瑰祦楠炴儼娴?`done`
- 閺傚洣娆㈤敍?  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 闁俺绻?GitHub Actions API 鐞涖儱缍?`Smoke` 鏉╃偟鐢?3 濞嗏剝鍨氶崝?run閿涘潰ain閿涘绱?    - `23381819139`
    - `23381923006`
    - `23382265813`
  - 閺嶏繝鐛欐稉濠呭牚 run 閻ㄥ嫬鍙ч柨?job閿涘潉Refactor Gate`閵嗕梗Smoke` 鐎涙劒鎹㈤崝掳鈧梗Release Ready`閵嗕梗Diagnostics Index`閿涘娼庢稉?success閿?  - 閻婢樻稉顓炵殺 WS8-01 娴?`in_progress` 閺囧瓨鏌婃稉?`done`閿涘瓗 sign-off 娴犲骸绶熺憴鍌氱檪閺囧瓨鏌婃稉?pass閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `Invoke-RestMethod https://api.github.com/repos/jieChris/2048-next/actions/runs?per_page=30`
  - PASS閿涘牊鍨氶崝鐔诲箯閸?run 閸掓銆冮敍?- `Invoke-RestMethod https://api.github.com/repos/jieChris/2048-next/actions/runs/{id}/jobs?per_page=20`
  - PASS閿? 娑?run 閻ㄥ嫬鍙ч柨?job 閸忋劑鍎?success閿?- `npm run verify:prepush`
  - PASS閿涘牊婀伴崷?refactor gate 娑?CI 鐟欏倸鐧傜紒鎾诡啈娑撯偓閼疯揪绱?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS8-01 瀹告彃鐣幋鎰ウ缁嬪绗岄幎鈧張顖氬蓟閺€璺哄經閿涘矂妫粋渚€鎽肩捄顖濈箻閸忋儳菙鐎规碍鈧降鈧?- 瑜版挸澧犻崜鈺€缍戞稉濠氼棑闂勨晛鍑￠崚鍥ㄥ床娑?WS3-02 鐏忛箖銆嶉弨鑸垫殐閿涘潐iagnostics payload fallback 閸愭ぞ缍戦敍澶涚礉娑撳秴鐫樻禍搴ㄦ，缁備浇鍏橀崝娑氬繁閸欙絻鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 缂佈呯敾 WS3-02閿涙碍绔婚悶?diagnostics payload 閹靛浼?fallback 閸愭ぞ缍戦獮鎯八夌€规艾鎮滈崶鐐茬秺閵?2. 閸氼垰濮?WS4/WS6 娑撳绔撮幍閫涙崲閸斺剝濯堕崚鍡礄閸忋儱褰涙担鎾堕兇 + storage/API 閹跺€熻杽閿涘鈧?3. 閺囧瓨鏌婇柌宀€鈻肩喊鎴炩偓鏄忣潔闁?M1/M3 閻ㄥ嫰妯佸▓鐢电波鐠佸搫鑻熺紒娆忓毉娑撳绔撮梼鑸殿唽閻╊喗鐖ｉ妴?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) WS3-02 缁楊剙宕勯幍鐧哥窗`local_history_store` 閸愭ぞ缍?runtime 閸掑棙鏁〒鍛倞
- 閺傚洣娆㈤敍?  - `js/local_history_store.js`
- 閺€鐟板З閿?  - 閸掔娀娅?owner 閻ㄥ嫬鍟戞担?runtime helper 鐠侯垰绶為敍鍧剅esolveRuntimeNormalizedHistoryOwnerMeta`閿涘绱?  - 閸掔娀娅?diagnostics 閻ㄥ嫬鍟戞担?runtime helper 鐠侯垰绶為敍鍧剅esolveRuntimeNormalizedDiagnosticsIndexEntries`閿涘绱?  - 缂佸瓨瀵?`normalizeRecord` 閻ㄥ嫬寮荤捄顖氱窞閿涙瓪runtime 鐠佹澘缍嶈ぐ鎺嶇閸栨牗鍨氶崝鐔烘纯閹恒儱顦查悽鈺?/ `fallback 閺堫剙婀磋ぐ鎺嶇閸栨溁閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npx vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - PASS閿?7 tests閿?- `npm run verify:prepush`
  - PASS閿涘潛ame-manager-audit / entry-manifest-audit / legacy-boundary-audit / contracts-matrix-audit / engine-audit / unit / smoke / build 閸忋劑鈧俺绻冮敍?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閸樺棗褰剁€涙ê鍋嶉柧鎹愮熅閻ㄥ嫬缍婃稉鈧崠鏍熅瀵板嫯绻樻稉鈧銉х暆閸栨牭绱濋柌宥咁槻鐠嬪啰鏁ゆ搴ㄦ珦缂佈呯敾闂勫秳缍嗛妴?- WS3-02 瑜版挸澧犳搴ㄦ珦瀹告煡妾锋稉琛♀偓婊勬暪閸欙絿鐡ラ悾銉┾偓澶嬪閳ユ繐绱檉allback 閺勵垰鎯佺紒褏鐢绘穱婵堟殌閿涘绱濇稉宥呭晙閺勵垰鐤勯悳鏉款槻閺夊倸瀹虫搴ㄦ珦閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鏉堟挸鍤?WS3-02 閺€璺哄經缁涙牜鏆愰敍鍫滅箽閻ｆ瑥鍘规惔鏇熷灗缂佈呯敾娑撳鐭囬敍澶婅嫙閺囧瓨鏌婇悩鑸碘偓浣碘偓?2. 閸氼垰濮?WS4/WS6 娑撳绔撮幍閫涙崲閸斺剝濯堕崚鍡曠瑢閹笛嗩攽閵?3. 閺囧瓨鏌?M3 娑撳绔撮梼鑸殿唽閻╊喗鐖ｆ稉搴ㄧ崣閺€鑸电垼閸戝棎鈧?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) 闂冭埖顔岄弨璺哄經娑撳簼绗呮稉鈧梼鑸殿唽閸氼垰濮╅敍姝怱3-02 缂佹挻顢?+ WS6-01 閸氼垰濮?- 閺傚洣娆㈤敍?  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 鐏?WS3-02 娴?`in_progress` 閺囧瓨鏌婃稉?`done`閿涘瞼绮ㄧ拋杞拌礋閳ユ粈瀵岄柧鎹愮熅缂佺喍绔撮崚?runtime/contracts閿涘畺allback 娴犲懍缍旈崗鐓庮啇閸忔粌绨抽垾婵撶幢
  - 鐏?WS6-01 娴?`pending` 閺囧瓨鏌婃稉?`in_progress`閿?  - 鐞涖儱缍?WS6 妫ｆ牞鐤嗛幍顐ｅ伎閸╄櫣鍤庨敍鍧剆rc/entries`閿涙ocalStorage 2 婢跺嫨鈧公etch 0 婢跺嫸绱氭稉?entry-manifest 鐎孤ゎ吀缂佹挻鐏夐妴?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npm run audit:entry-manifest`
  - PASS
- `Select-String -Path src/entries/*.ts -Pattern "localStorage\\."`
  - 閸涙垝鑵?2 婢跺嫸绱檂home-family-shared.ts:422/442`閿?- `Select-String -Path src/entries/*.ts -Pattern "fetch\\("`
  - 閸涙垝鑵?0 婢?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS3 閸樺棗褰剁紒鎾寸€潻浣盒╂稉鑽ゅ殠瀹稿弶鏁归崣锝忕礉妞嬪酣娅撴禒搴樷偓婊呯波閺嬪嫯绺肩粔鐑┾偓婵婃祮閸氭垟鈧粌鐡ㄩ崒銊﹀▕鐠烇紕绮烘稉鈧垾婵勨偓?- 瑜版挸澧犳稉鏄忣洣妞嬪酣娅撻弰?WS6 閻ㄥ嫬绱╃€靛吋鈧?localStorage 閻愰€涚秴婵″倷缍嶇痪鍐插弳缂佺喍绔?helper閿涘矁鈧矂娼弽绋跨妇闁炬崘鐭剧粙鍐茬暰閹囨６妫版ǜ鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. WS6-01 娑撳绔撮幍鐧哥窗婢跺嫮鎮?`home-family-shared.ts` 2 婢?localStorage 閻愰€涚秴閵?2. WS4 娑撳绔撮幍鐧哥窗鏉堟挸鍤棃鐐电埠娑撯偓閸忋儱褰涙い鐢告桨婢跺嫮鐤嗘导妯哄帥缁狙勭閸楁洏鈧?3. 閺囧瓨鏌?M3/M4 娑撳绔撮梼鑸殿唽妤犲本鏁归崣锝呯窞楠炶泛鎮撳銉ф箙閺夎￥鈧?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?5閹电櫢绱?
### 1) WS6-01 妫ｆ牗澹掔€圭偘缍旈敍姝歴rc/entries` 閻╃绻?localStorage 濞撳懘娴?- 閺傚洣娆㈤敍?  - `src/entries/home-family-shared.ts`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 鐏忓棗绱╃€靛吋璇炵仦鍌涚垼鐠佹媽顕伴崘娆愭暭娑撳搫顦查悽?`game-settings-storage` helper閿涘瞼些闂勩倝銆夐棃銏犵湴 direct `localStorage` 鐠嬪啰鏁ら敍?  - 閸ョ偛锝為惇瀣緲娑撳孩澧界悰灞炬）韫囨绱癢S6-01 瑜版挸澧犻崺铏瑰殠閺囧瓨鏌婃稉?`src/entries localStorage=0 / fetch=0`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `Select-String -Path src/entries/*.ts -Pattern "localStorage\\."`
  - 閸涙垝鑵?0 婢?- `npm run audit:entry-manifest`
  - PASS
- `npx vitest run tests/unit/core-game-settings-storage.spec.ts tests/unit/contracts.spec.ts`
  - PASS閿?7 tests閿?- `npm run verify:prepush`
  - PASS閿涘牆鍙忛柧鎹愮熅閿?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 瀹歌弓绮犻垾婊冪唨缁捐法娲忛悙鍏夆偓婵婄箻閸忋儮鈧粌鍨庨崺鐔绘儰閸︽壋鈧繈妯佸▓纰夌礉`src/entries` 鐏炲倿娼版潏鎯у煂妫ｆ牗澹掗惄顔界垼閵?- 閸撯晙缍戞搴ㄦ珦闂嗗棔鑵戦崷銊ュ坊閸欐彃鐪扮€涙﹢鍣洪敍鍧剆rc+js` 缂佹潙瀹抽敍澶夌瑢 WS4 閸忋儱褰涙担鎾堕兇婢跺嫮鐤嗛敍灞藉嚒鏉╂稑鍙嗘稉瀣╃閹电瀵栭崶娣偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. WS6-01閿涙碍澧跨仦鏇熷閹诲繐鍩?`src/features` / `src/app` 楠炶泛鑸伴幋鎰瀻閸╃喐绔婚崡鏇樷偓?2. WS4閿涙氨绮伴崙?4 娑擃亪娼紒鐔剁閸忋儱褰涙い鐢告桨閻ㄥ嫯绺肩粔?瑜版帗銆傛导妯哄帥缁狙佲偓?3. 閺囧瓨鏌?WS6 done 閺夆€叉娑撳氦顩惄鏍芳閹稿洦鐖ｉ敍灞肩箽閹镐礁褰查柌蹇撳閹恒劏绻橀妴?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?6閹电櫢绱?
### 1) WS6-01 缁楊兛绨╅幍鐧哥窗`src` 鐏炲倻娲挎潻?storage/network 濞撳懘娴傜涵顔款吇
- 閺傚洣娆㈤敍?  - `src/storage/history-idb.ts`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 鐏?`history-idb` 鏉╀胶些濞翠胶鈻兼稉顓犳畱 localStorage 鐠佸潡妫堕弨鑸垫殐閸掓澘鍞撮柈?helper閿涘苯骞撻梽銈嗘殠閻愬湱娲块幒銉問闂傤噯绱?  - 婢跺秵澹傜涵顔款吇 `src` 閸忋劎娲拌ぐ?direct `localStorage`/`fetch` 閸у洣璐?0閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `Select-String -Path src/**/*.ts,src/**/*.js -Pattern "localStorage\\.|fetch\\("`
  - 閸涙垝鑵?0 婢?- `npm run verify:prepush`
  - PASS閿涘牆鍙忛柧鎹愮熅閿?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 閸欐牕绶遍梼鑸殿唽閹囧櫡缁嬪顣堕敍姝歴rc` 鐏炲倸鍑℃潏鎯у煂閳ユ粓銆夐棃?濡€虫健娑撳秶娲挎潻?storage/network閳ユ繄娲伴弽鍥モ偓?- 瑜版挸澧犻崜鈺€缍戞搴ㄦ珦闂嗗棔鑵戦崷?`js` 閸樺棗褰剁仦鍌氱摠闁插骏绱濈仦鐐扮艾閸氬海鐢婚崚鍡樺濞岃崵鎮婇懠鍐ㄦ纯閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鐎?`js` 鐏炲倸浠涢悙閫涚秴閸掑棛楠囬敍鍫ョ彯妫版垿銆夐棃顫喘閸忓牞绱氶妴?2. 閸忓牆鐣幋鎰閹靛綊鐝０鎴︺€夐棃銏㈡畱 storage/network 閻╃绻涢弨鑸垫殐閵?3. 閺囧瓨鏌?WS6 閸欏苯鐪版灞炬暪閺嶅洤鍣敍鍫ユ▉濞堜絻鎻幋?vs 閸忋劋绮ㄦ潏鐐灇閿涘鈧?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?7閹电櫢绱?
### 1) WS6-01 缁楊兛绗侀幍鐧哥窗妤傛﹢顣舵い鐢告桨閿涘潝istory閿涘』torage 閺侊絿鍋ｉ弨鑸垫殐
- 閺傚洣娆㈤敍?  - `js/history_page.js`
  - `src/storage/history-idb.ts`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - `history_page` 鐏?localStorage 鐠佸潡妫堕梿鍡曡厬閸掍即銆夐崘?helper閿涘本娴涢幑銏℃殠閻愮鐨熼悽顭掔幢
  - `history-idb` 鐏?migration localStorage 鐠佸潡妫堕梿鍡曡厬閸?helper閿?  - 閺傚洦銆傛稉顓∷夎ぐ?`src+js` 閹稿洦鐖ｉ崣妯哄閿涙瓪localStorage 50 -> 40`閿涘畭fetch 7 -> 7`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘牆鍙忛柧鎹愮熅閿?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 瀹歌尪绻橀崗銉⑩偓婊勫瘻妤傛﹢顣堕弬鍥︽濞撳懐鎮婇垾婵堟畱閸欘垶鍣洪崠鏍х杽閺備粙妯佸▓鐐光偓?- 娑撴槒顩﹂崜鈺€缍戞搴ㄦ珦閸?`js` 閸樺棗褰剁仦鍌氱摠闁插骏绱?0 婢?localStorage閿涘绱濇担鍡楀嚒閸忓嘲顦幐澶嬪濞嗭紕菙鐎规矮绗呴梽宥囨畱鐠侯垰绶為妴?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 娑撳绔撮幍鐟邦槱閻?`js/user_profile_page.js` 閻?storage 閺侊絿鍋ｉ妴?2. 閹镐胶鐢荤紒瀛樺Б `src+js` 閸涙垝鑵戦弫鎷岀Ъ閸斿灝鑻熼崶鐐诧綖閺傚洦銆傞妴?3. 閼辨柨濮?WS4閿涘矂妲诲銏犲弳閸欙絾鏆庨悙鐟板冀瀵箍鈧?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?8閹电櫢绱?
### 1) WS6-01 缁楊剙娲撻幍鐧哥窗`user_profile_page` storage 閺侊絿鍋ｅ〒鍛存祩
- 閺傚洣娆㈤敍?  - `js/user_profile_page.js`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 婢х偛濮?`local/session storage` helper 楠炶埖娴涢幑?direct 鐠嬪啰鏁ら敍?  - 閺傚洣娆㈢痪?storage 閻╃绻涢崨鎴掕厬娴?`5` 闂勫秴鍩?`0`閿?  - 閹鍣洪幐鍥ㄧ垼閺囧瓨鏌婇敍姝歴rc+js localStorage 40 -> 35`閿涘畭fetch 7 -> 7`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - PASS閿? tests閿?- `npm run verify:prepush`
  - PASS閿涘牆鍙忛柧鎹愮熅閿?- `Select-String -Path js/user_profile_page.js -Pattern "localStorage\\.|sessionStorage\\."`
  - 閸涙垝鑵?0 婢?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 缂佈呯敾閹稿鈧粓鐝０鎴炴瀮娴犳湹绱崗鍫氣偓婵埱旂€规矮绗呴梽宥忕礉閺€鑸垫殐閼哄倸顨旈崣顖涘付閵?- 娑撴槒顩﹂崜鈺€缍戞搴ㄦ珦鏉烆剙鎮?`local_history_store.js`閵嗕梗theme_manager.js` 缁涘宸婚崣鎻掔湴妤傛ê鎳℃稉顓熸瀮娴犺翰鈧?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 娑撳绔撮幍鐟邦槱閻?`local_history_store.js` storage 閺侊絿鍋ｉ妴?2. 娑撳绔撮幍鐟邦槱閻?`theme_manager.js` storage 閺侊絿鍋ｉ妴?3. 鐎?`js` 鐏?fetch 閻愰€涚秴瀵よ櫣鐝涙穱婵堟殌/閺€鑸垫殐閸掑棛琚憴鍕灟閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?9閹电櫢绱?
### 1) WS6-01 缁楊兛绨查幍鐧哥窗妤傛﹢顣堕弬鍥︽閿涘潤ocal_history_store / theme_manager閿涘』torage 閺侊絿鍋ｅ〒鍛倞
- 閺傚洣娆㈤敍?  - `js/local_history_store.js`
  - `js/theme_manager.js`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 娑撱倖鏋冩禒鑸垫煀婢?localStorage helper 楠炶埖娴涢幑?direct 鐠嬪啰鏁ら敍?  - 閺傚洣娆㈢痪褍鎳℃稉顓炴綆闂勫秳璐?0閿?  - 閹鍣洪幐鍥ㄧ垼閺囧瓨鏌婇敍姝歴rc+js localStorage 35 -> 23`閿涘畭fetch 7 -> 7`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `Select-String -Path js/local_history_store.js,js/theme_manager.js -Pattern "localStorage\\."`
  - 閸涙垝鑵?0 婢?- `npm run verify:prepush`
  - PASS閿涘牆鍙忛柧鎹愮熅閿?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 閻ㄥ嫰鐝０鎴炴瀮娴犺埖涓嶉悶鍡欐埛缂侇厽婀侀弫鍫礉閹稿洦鐖ｆ稉瀣楠炲懎瀹抽弰搴㈡▔閵?- 瑜版挸澧犳稉鏄忣洣閸撯晙缍戞搴ㄦ珦闂嗗棔鑵戦崷?`online_leaderboard_runtime.js` 娑?`account_page.js` 閻?storage/fetch 閻愰€涚秴閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 娑撳绔撮幍鐟邦槱閻?`online_leaderboard_runtime.js`閵嗕梗account_page.js`閵?2. 瑜般垺鍨?fetch 閻愰€涚秴閸掑棛琚憴鍕灟楠炶泛鍟撻崗銉︽瀮濡楋絻鈧?3. 閹镐胶鐢绘禒銉﹀瘹閺嶅洩绉奸崝鍧椻攳閸?WS6 閺€璺哄經閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?0閹电櫢绱?
### 1) WS6-01 缁楊剙鍙氶幍鐧哥窗`api_shared_utils` / `refactor_cutover_migration` / `replay_ui` storage 閺€鑸垫殐
- 閺傚洣娆㈤敍?  - `js/api_shared_utils.js`
  - `js/refactor_cutover_migration.js`
  - `js/replay_ui.js`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 娑撹桨绗侀弬鍥︽缂佺喍绔村鏇炲弳 storage resolver/helper閿涘瞼些闂?direct `localStorage.*` 娑?`sessionStorage.*` 鐠佸潡妫堕柧鎹愮熅閿?  - `refactor_cutover_migration` 婢х偛濮?storage 娑撳秴褰查悽銊︽閻ㄥ嫬鍙嗛崣锝囩叚鐠侯垽绱濋柆鍨帳鏉╀胶些闂冭埖顔岄幎娑㈡晩閿?  - 閹稿洦鐖ｉ崶鐐诧綖閿涙瓪src+js localStorage` 娴?`15` 闂勫秴鍩?`7`閿涘畭src+js fetch` 娣囨繃瀵?`7`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-account-login-storage.smoke.spec.ts tests/smoke/pages-account-settings.smoke.spec.ts tests/smoke/pages-replay-import.smoke.spec.ts tests/smoke/pages-replay-runtime.smoke.spec.ts`
  - 妫ｆ牞鐤?1 娓?`pages-account-settings` URL 缁涘绶熺搾鍛閿涘牆浼撻崣鎴礆閵?- `npx playwright test --config=playwright.config.ts tests/smoke/pages-account-settings.smoke.spec.ts`
  - PASS閿涘牆顦茬捄鎴︹偓姘崇箖閿涘鈧?- `npm run verify:prepush`
  - PASS閿涘澁efactor gate 閸忋劑鎽肩捄顖炩偓姘崇箖閿涘鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 缂佈呯敾缁嬪啿鐣炬稉瀣赴閿涘苯缍嬮崜宥呭嚒鐏?`localStorage` 閹鍣洪崢瀣煂娑擃亙缍呴弫鑸偓?- 娑撴槒顩﹂崜鈺€缍戞搴ㄦ珦鏉烆兛璐?`fetch` 閻愰€涚秴濞岃崵鎮婄憴鍕灟娑撳孩娓堕崥搴″殤婢?legacy 妞ょ敻娼伴弨璺虹啲閿涘奔绗夌仦鐐扮艾閺嶇绺鹃柧鎹愮熅缁嬪啿鐣鹃幀褔顥撻梽鈹库偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 婢跺嫮鎮婇崜鈺€缍?localStorage 閺傚洣娆㈤敍姝歫s/core_custom_spawn_runtime.js`閵嗕梗js/core_i18n_runtime.js`閵嗕梗js/pku2048_inline_stats_runtime.js`閵嗕梗js/core_timer_module_runtime.js`閵?2. 閽€钘夋勾 fetch 閻愰€涚秴閸掑棛琚憴鍕灟閿涘湏PI helper 娣囨繄鏆€閵嗕線銆夐棃銏㈡纯鏉╃偞鏁归弫娑崇礆楠炶泛鍟撻崗?guardrails/roadmap閵?3. 缂佸瓨瀵旈垾婊勭槨閹电懓鎻╅悡?+ 鐎规艾鎮?smoke + verify:prepush閳ユ繆濡總蹇曟纯閸?WS6 閺€璺哄經閵?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?1閹电櫢绱?
### 1) WS6-01 缁楊兛绔烽幍鐧哥窗鐎瑰本鍨?`localStorage` 鐏忛箖銆嶅〒鍛存祩
- 閺傚洣娆㈤敍?  - `js/core_custom_spawn_runtime.js`
  - `js/core_i18n_runtime.js`
  - `js/pku2048_inline_stats_runtime.js`
  - `js/core_timer_module_runtime.js`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 閸ユ稒鏋冩禒璺哄弿闁劍鏁兼稉?storage resolver/helper 鐠侯垰绶為敍宀€些闂?direct `localStorage.*` 鐠佸潡妫堕敍?  - 閹稿洦鐖ｉ崶鐐诧綖閿涙瓪src+js localStorage` 娴?`7` 闂勫秴鍩?`0`閿涘畭src+js fetch` 娴犲秳璐?`7`閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npm run verify:prepush`
  - PASS閿涘澁efactor gate 閸忋劑鎽肩捄顖炩偓姘崇箖閿涙瓫udit/unit/smoke/build閿涘鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 閻?storage 閻╃绻涢弨鑸垫殐閻╊喗鐖ｅ鑼舵彧閹存劧绱檂localStorage=0`閿涘鈧?- 瑜版挸澧犳搴ㄦ珦瀹歌弓绮犻垾婊冪摠閸屻劍鏆庨悙鍏夆偓婵嗗瀼閹诡澀璐熼垾婊呯秹缂佹粏顔栭梻顔跨珶閻ｅ本涓嶉悶鍡忊偓婵撶礄fetch 閻愰€涚秴閸掑棛琚稉搴ゎ潐閸掓瑥娴愰崠鏍电礆閵?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鐎电懓澧挎担?7 婢?`fetch` 閻愰€涚秴閸嬫艾鍨庣仦鍌氼槱缂冾噯绱橝PI helper 娣囨繄鏆€閿涘矂銆夐棃銏㈡纯鏉╃偞鏁归弫娑崇礆閵?2. 鐏忓棗鍨庣仦鍌濐潐閸掓瑥鍟撻崗?guardrails 娑?roadmap閿涘苯鑻熺悰銉ヮ吀鐠伮ゎ潐閸掓瑣鈧?3. 鏉╃偟鐢荤憴鍌氱檪 gate閿涘瞼鈥樼拋?`localStorage=0` 缁嬪啿鐣炬稉宥呭冀瀵箍鈧?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?2閹电櫢绱?
### 1) WS6-01 缁楊剙鍙撻幍鐧哥窗妞ょ敻娼扮仦?fetch 閺€鑸垫殐娑撳骸寮婚幐鍥ㄧ垼濞撳懘娴?- 閺傚洣娆㈤敍?  - `js/api_shared_utils.js`
  - `js/account_page.js`
  - `js/account_settings_page.js`
  - `js/online_leaderboard_runtime.js`
  - `js/password_page.js`
  - `js/register_page.js`
  - `js/user_profile_page.js`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 閺傛澘顤?shared `callFetch` 閸忋儱褰涢敍?  - 鐠愶箑褰?閹烘帟顢戝?濞夈劌鍞?鐎靛棛鐖?閻劍鍩涙稉濠氥€夋い鐢告桨閻ㄥ嫯顕Ч鍌氬弿闁劍鏁兼稉娲偓姘崇箖 shared helper 鐠嬪啰鏁ら敍?  - 閹稿洦鐖ｉ崶鐐诧綖閿涙瓪src+js fetch 7 -> 0`閿涘奔绗?`localStorage=0` 娑撯偓鐠у嘲鑸伴幋鎰蓟濞撳懘娴傞妴?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npm run verify:prepush`
  - PASS閿涘澁efactor gate 閸忋劑鎽肩捄顖炩偓姘崇箖閿涘鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- WS6 瑜版挸澧犲鑼舵彧閸掓壋鈧粓銆夐棃銏犵湴 direct storage/fetch 濞撳懘娴傞垾婵堟畱閸忔娊鏁梼鑸殿唽閻╊喗鐖ｉ妴?- 閸撯晙缍戞搴ㄦ珦娑撴槒顩﹂弰顖氬煑鎼达箑瀵查梻顕€顣介敍姘冲娑撳秷藟 guardrail/audit閿涘苯鎮楃紒顓炵磻閸欐垵褰查懗钘夊毉閻滄澘娲栧ù浣碘偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 閹?storage/fetch 鏉堝湱鏅憴鍕灟閸愭瑥鍙?`ARCHITECTURE_GUARDRAILS.md`閵?2. 娑撻缚绔熼悾宀冾潐閸掓瑨藟鐎孤ゎ吀濡偓閺屻儻绱濈痪鍐插弳 CI gate閵?3. 缂佹瑥鍤?WS6-01 閻?done 闁偓閸戠儤娼禒璺鸿嫙閹笛嗩攽鏉╃偟鐢?CI 鐟欏倸鐧傞妴?
## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?3閹电櫢绱?
### 1) WS6-01 缁楊兛绡€閹电櫢绱皊ervice-boundary 濮濓絽绱￠梻銊ь洣娑撳﹦鍤?- 閺傚洣娆㈤敍?  - `scripts/service-boundary-audit.mjs`
  - `tests/unit/service-boundary-audit-helpers.spec.ts`
  - `scripts/refactor-gate.mjs`
  - `package.json`
  - `docs/ARCHITECTURE_GUARDRAILS.md`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - 閺傛澘顤?`service-boundary-audit`閿涘本顒滃蹇涙▎閺?`src+js` 娑擃厾娈?direct `localStorage.*` / `sessionStorage.*` / `fetch(...)`閿?  - 鐏忓棜顕?audit 閹恒儱鍙?`verify:prepush`閿?  - 閸?guardrails 閺傚洦銆傛い鍫曞劥鐞涖儱缍?2026-03-22 update閿涘苯鍟撻弰?`R4/R5` 閻ㄥ嫭顒滃蹇撴嚒娴犮倓绗岄崣灞剧闂嗚泛鐔€缁捐￥鈧?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npm run audit:service-boundary`
  - PASS閿?27 files, 0 violations閿?- `npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts`
  - PASS
- `npm run verify:prepush`
  - 閺堚偓缂?PASS
  - 鏉╁洨鈻肩拠瀛樻閿涙矮鑵戦梻缈犺⒈濞嗏€崇暚閺佺绻嶇悰灞藉瀻閸掝偄鎳℃稉顓熸＆閺?smoke 閸嬭泛褰傜搾鍛閿涘苯宕熼悽銊ょ伐婢跺秷绐囬崸鍥偓姘崇箖閿涘瞼顑囨稉澶嬵偧閸忋劑鎽肩捄顖濈獓缂佽￥鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閻滄澘婀稉宥勭矌閳ユ粌浠涢崚棰佺啊閳ユ繈銆夐棃銏犵湴 storage/fetch 閸欏本绔婚梿璁圭礉閼板奔绗栭垾婊冪暓娴ｅ繋绨￠垾婵婄箹閺壜ょ珶閻ｅ矉绱癈I 瀹歌尪鍏橀懛顏勫З闂冪粯鏌囬崶鐐寸ウ閵?- 瑜版挸澧犳稉鏄忣洣閸撯晙缍戞搴ㄦ珦閺?smoke 缁嬪啿鐣鹃幀褍鎷?WS6-01 閺€璺哄經閺嶅洤鍣敍宀冣偓灞肩瑝閺勵垱鐏﹂弸鍕珶閻ｅ瞼宸辨径渚库偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 鐎规矮绠?WS6-01 閻?`done` 闁偓閸戠儤娼禒鏈电瑢鏉╃偟鐢?CI 鐟欏倸鐧傞弽鍥у櫙閵?2. 鐠囧嫪鍙?`service-boundary-audit` 閺勵垰鎯侀棁鈧憰浣稿讲鐎孤ゎ吀娓氬顦婚崚妤勩€冮妴?3. 缂佈呯敾閹恒劏绻?WS4 妞ょ敻娼伴崗銉ュ經娴ｆ挾閮村〒鍛礋閿涘矂浼╅崗宥勭矤閺傛澘顤冮崗銉ュ經娓氀冩礀濞翠降鈧?
### WS6-01 閺€璺哄經閺嶅洤鍣敍鍫ｅ磸濡楀牞绱?- 閹稿洦鐖ｉ敍姝歴rc+js direct localStorage = 0`閿涘畭src+js direct fetch = 0`
- 闂傘劎顩﹂敍姝歛udit:service-boundary` 瀹歌尪绻橀崗?`verify:prepush`
- 缁嬪啿鐣鹃幀褝绱版稉璇插瀻閺€顖濈箾缂?3 鏉?CI 闁俺绻冩稉鏃€妫ゆ潏鍦櫕閸ョ偞绁?- 閺傚洦銆傞敍姝ardrails / roadmap / execution log 瀹告彃鎮撳?- 娓氬顦婚敍姘弓閻ф槒顔囬惂钘夋倳閸楁洘鍨?ADR 閻ㄥ嫪绶ユ径鏍电礉娑撳秴鍘戠拋绋跨殺 WS6-01 閺嶅洩顔囨稉鍝勭暚閹?## 閺堫剝鐤嗘晶鐐哄櫤閿涘牏顑?4閹电櫢绱?
### 1) WS4-01 / WS4-02閿涙艾鍙嗛崣锝勭秼缁鍨庣猾璇差吀鐠佲€茬瑐缁?- 閺傚洣娆㈤敍?  - `scripts/entry-manifest-audit.mjs`
  - `tests/unit/entry-manifest-audit-helpers.spec.ts`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 閺€鐟板З閿?  - `entry-manifest-audit` 娑撳秴鍟€閸欘亜鍙ц箛?`play/replay`閿涘矁鈧本妲稿鈧慨瀣墡妤犲苯鍙忛柈?16 娑?2048 妞ょ敻娼伴崗銉ュ經閻ㄥ嫭鐏﹂弸鍕瀻缁紮绱?  - 閸忋儱褰涢悳鎵Ц鐞氼偅顒滃蹇撳瀻閹存劒琚辩猾浼欑窗
    - `manifest-bootstrap`
    - `direct-module`
  - 鏉╂瑦鍓伴崨宕囨絻 WS4 閸撯晙缍戦崐鍝勫瀹稿弶妯夊蹇撳閿涘苯鎮楃紒顓＄讣缁夎绗夐崘宥夋浆娴滃搫浼愮拋鏉跨箓妞ょ敻娼伴悳鎵Ц閵?
### 2) 妤犲矁鐦夌拠浣瑰祦閿?026-03-22閿?- `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
  - PASS
- `npm run audit:entry-manifest`
  - PASS
- `npm run verify:prepush`
  - 閺堚偓缂?PASS
  - 鏉╁洨鈻肩拠瀛樻閿涙矮鑵戦梻缈犵濞嗏€崇暚閺佺绻嶇悰灞芥嚒娑擃厽妫﹂張?`index-ui-bootstrap-actions` smoke 閸嬭泛褰傜搾鍛閿涙稑宕熼悽銊ょ伐婢跺秷绐囬柅姘崇箖閿涘苯鎮楃紒顓炵暚閺佹挳鎽肩捄顖濈獓缂佽￥鈧?
### 3) 妞嬪酣娅撻幒褍鍩楃紒鎾诡啈
- 閻滄澘婀崗銉ュ經娴ｆ挾閮撮惃鍕瘜鐟曚線妫舵０妯圭瑝閸愬秵妲搁垾婊呮箙娑撳秷顫嗛垾婵撶礉閼板本妲搁垾? 娑?direct-module 閸忋儱褰涙担鏇熸鏉╀胶些閵嗕浇绺奸崚鏉挎憿闁插备鈧縿鈧?- 鏉╂瑤绔村銉ф畱閹板繋绠熼崷銊ょ艾閹跺﹤鍙嗛崣锝呪偓鍝勫閸欐ɑ鍨氶崣?CI 缁撅附娼惃鍕▔瀵繑绔婚崡鏇礉娑?WS4 閸氬海鐢婚惇鐔割劀鏉╀胶些閸嬫艾鍣径鍥モ偓?
### 4) 閹恒儰绗呴弶銉╂付鐟曚礁浠涢惃鍕紣娴ｆ粣绱欓弰搴ｂ€橀敍?1. 缂佹瑥鍤?`history / modes / palette / account-family` 閻ㄥ嫯绺肩粔璁崇喘閸忓牏楠囬妴?2. 閸掋倖鏌囬崫顏冪昂 direct-module 閸忋儱褰涙惔鏃囶嚉楠炶泛鍙嗙紒鐔剁 bootstrap/manifest閿涘苯鎽㈡禍娑樺讲娴犮儰缍旀稉娲▉濞堝灚鈧傜伐婢舵牓鈧?3. 閺勫海鈥?`index.html` 娑?2048 妞ょ敻娼扮化鑽ょ埠娑斿妫块惃鍕毐閺堢喕绔熼悾灞烩偓?
## 鏈疆澧為噺锛堢95鎵癸級

### 1) WS4-02B锛氬畬鎴?`palette` 椤甸潰绯荤粺鏍锋澘杩佺Щ鏀跺彛
- 鏂囦欢锛?  - `src/entries/palette.ts`
  - `src/pages/palette-page.ts`
  - `scripts/entry-manifest-audit.mjs`
  - `tests/unit/entry-manifest-audit-helpers.spec.ts`
  - `tests/unit/palette-entry-bootstrap.spec.ts`
  - `tests/smoke/pages-palette-page-system.smoke.spec.ts`
  - `docs/PLATFORM_REFACTOR_MASTER_PLAN.md`
  - `docs/ROADMAP_MILESTONES.md`
  - `docs/EXECUTION_LOG.md`
- 鏀瑰姩锛?  - 灏?`palette` 浠?`direct-module` 杩佷负绗簩涓?`manifest-bootstrap` 椤甸潰鏍锋澘锛?  - 灏嗛〉闈㈣閰嶄笅娌夊埌 `src/pages/palette-page.ts`锛?  - 鏇存柊鍏ュ彛瀹¤锛屼娇鍏舵寮忔壙璁?`palette` 鐨勬柊鏋舵瀯褰㈡€侊紱
  - 鏂板鍏ュ彛 bootstrap unit 涓庨〉闈㈢郴缁?smoke锛屽苟淇濈暀鏃㈡湁 palette smoke 鍥炲綊瑕嗙洊銆?
### 2) 楠岃瘉璇佹嵁锛?026-03-22锛?- `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/palette-entry-bootstrap.spec.ts tests/unit/app-bootstrap-direct-page.spec.ts`
  - PASS锛?3 passed锛?- `npm run audit:entry-manifest`
  - PASS
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-palette-page-system.smoke.spec.ts tests/smoke/index-ui-settings-models.smoke.spec.ts -g palette`
  - PASS锛? passed锛?- `npm run verify:prepush`
  - PASS锛坅udit/unit/smoke/build 鍏ㄩ摼璺€氳繃锛?
### 3) 椋庨櫓鎺у埗缁撹
- WS4 涓嶅啀鍋滅暀鍦ㄢ€滃叆鍙ｇ洏鐐光€濓紝鑰屾槸杩涘叆鈥滄牱鏉块〉杩佺Щ鈥濄€?- 褰撳墠 16 涓凡瀹¤鍏ュ彛涓紝杩樺墿 6 涓?`direct-module` 鍏ュ彛鏈鐞嗐€?- 宸插畬鎴愭牱鏉块〉锛歚modes`銆乣palette`銆?- 褰撳墠涓昏鍓╀綑椋庨櫓涓嶆槸 `core/contracts`锛岃€屾槸椤甸潰绯荤粺浠嶅厑璁?`src/pages/*` 鐩存帴渚濊禆 `../../js/*.js` 鐨勮繃娓℃€侊紝杩欓渶瑕佸崟鐙畾涔夐€€鍑鸿矾寰勩€?
### 4) 鎺ヤ笅鏉ラ渶瑕佸仛鐨勫伐浣滐紙鏄庣‘锛?1. 鍚姩 `WS4-02C`锛氳縼绉?`history + account`锛岃椤甸潰绯荤粺瑕嗙洊涓€涓姛鑳介〉鍜屼竴涓处鍙峰３椤点€?2. 璇勪及鏄惁寤虹珛鐙珛鐨?`legacy-runtime-import boundary` 瀹¤锛岄€愭绂佹 `src/pages/*` 鐩存帴寮曞叆 `../../js/*.js`銆?3. 缁х画绱 `WS6-01` 杩炵画 CI 绋冲畾鎬ц瘉鎹紝涓洪樁娈垫€?sign-off 鍋氬噯澶囥€
## 本轮增量（第97批）

### 1) WS4-02D 第一刀：`account_settings` 进入 unified bootstrap
- 文件：
  - `src/entries/account-settings.ts`
  - `src/pages/account-settings-page.ts`
  - `src/entries/runtime-manifest.ts`
  - `src/bootstrap/page-bootstrap.ts`
  - `src/entries/home-family-shared.ts`
  - `scripts/entry-manifest-audit.mjs`
  - `tests/unit/runtime-manifest.spec.ts`
  - `tests/unit/account-settings-entry-bootstrap.spec.ts`
  - `tests/unit/account-settings-page-bootstrap.spec.ts`
  - `tests/smoke/pages-account-settings-page-system.smoke.spec.ts`
- 改动：
  - 为 `account_settings.html` 正式引入 `pageId = "account-settings"`；
  - 将入口改为 `bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage)`；
  - 将其纳入 `runtime-manifest` 与入口审计；
  - 增加 dedicated page-system smoke。

### 2) 验证证据（2026-03-22）
- `npx vitest run tests/unit/account-settings-entry-bootstrap.spec.ts tests/unit/account-settings-page-bootstrap.spec.ts tests/unit/runtime-manifest.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
  - PASS（22 passed）
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-account-settings-page-system.smoke.spec.ts tests/smoke/pages-account-settings.smoke.spec.ts`
  - PASS（2 passed）
- `npm run verify:prepush`
  - PASS（audit/unit/smoke/build 全链路通过）

### 3) 风险控制结论
- `account_settings` 已不应再计入剩余 direct-module。
- 当前真正剩余的 direct-module 为：`register / password / user-profile`。
- `user-profile` 需要从 auth/security 口径中移出，改按 `profile-history-replay` 家族处理。

### 4) 接下来需要做的工作（明确）
1. 对齐 `MASTER_PLAN / ROADMAP / EXECUTION_LOG` 的口径为“剩余 3 个 direct-module”。
2. 启动 `register + password` 的 auth-security family 迁移。
3. 单独规划 `user-profile` 的重分类与 dedicated page-system smoke。
## 第98批增量（2026-03-22）

### 1）WS4-02D 第二刀：完成 `register + password` 的 auth-security family 迁移
- 文件：
  - `src/entries/register.ts`
  - `src/entries/password.ts`
  - `src/pages/register-page.ts`
  - `src/pages/password-page.ts`
  - `src/entries/runtime-manifest.ts`
  - `src/bootstrap/page-bootstrap.ts`
  - `src/entries/home-family-shared.ts`
  - `scripts/entry-manifest-audit.mjs`
  - `tests/unit/register-entry-bootstrap.spec.ts`
  - `tests/unit/password-entry-bootstrap.spec.ts`
  - `tests/smoke/pages-register-page-system.smoke.spec.ts`
  - `tests/smoke/pages-password-page-system.smoke.spec.ts`
- 改动：
  - 将 `register.html` 与 `password.html` 的入口都改为 `bootstrapDirectPage(...)`。
  - 新增 `src/pages/register-page.ts`、`src/pages/password-page.ts`，作为统一页面系统下的薄壳页模块，暂时继续承接现有 `js/register_page.js`、`js/password_page.js` 的实现。
  - 将 `register/password` 正式纳入 `runtime-manifest`、`page-bootstrap` 与 `entry-manifest-audit`。
  - 为两页补齐 dedicated unit 与 page-system smoke。

### 2）验证证据（2026-03-22）
- `npx vitest run tests/unit/register-entry-bootstrap.spec.ts tests/unit/password-entry-bootstrap.spec.ts tests/unit/runtime-manifest.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/bootstrap-page-bootstrap.spec.ts`
  - PASS（30 passed）
- `npm run audit:entry-manifest`
  - PASS
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-register-page-system.smoke.spec.ts tests/smoke/pages-password-page-system.smoke.spec.ts tests/smoke/pages-account-register-flow.smoke.spec.ts tests/smoke/pages-password-flow.smoke.spec.ts`
  - PASS（6 passed）
- 第一次 `npm run verify:prepush`
  - 失败点：既有用例 `pages-online-submit-timeout-retry.smoke.spec.ts` 首跑超时
- 单用例复跑 `pages-online-submit-timeout-retry.smoke.spec.ts`
  - PASS
- 第二次 `npm run verify:prepush`
  - PASS（audit / unit / smoke / build 全绿）

### 3）阶段结论
- `register + password` 已不再属于剩余 `direct-module` 债务。
- 当前已审计的 16 个页面入口里，只剩 `user-profile` 仍是 `direct-module`。
- `register + password` 已冻结为 `auth-security` family；`user-profile` 需要改挂到 `profile-history-replay` family，而不是继续挂在 auth/security 下。

### 4）接下来需要做的工作
1. 完成 `user-profile` 的 family 重分类与 page-system 迁移，把剩余 `direct-module` 压到 `0`。
2. 在不改动业务逻辑的前提下，继续观察 `register/password` 的 CI 稳定性，确认没有新增页面系统回归。
3. 继续推进 `WS6-01A`，把 `service-boundary` 从 syntax-level gate 升级为 owner-aware gate。
## 第99批增量（2026-03-22）

### 1）WS4-02D 第三刀：完成 `user-profile` 的 page-system 迁移
- 文件：
  - `src/entries/user-profile.ts`
  - `src/pages/user-profile-page.ts`
  - `src/entries/runtime-manifest.ts`
  - `src/bootstrap/page-bootstrap.ts`
  - `src/entries/home-family-shared.ts`
  - `scripts/entry-manifest-audit.mjs`
  - `tests/unit/user-profile-entry-bootstrap.spec.ts`
  - `tests/smoke/pages-user-profile-page-system.smoke.spec.ts`
- 改动：
  - 将 `user.html` 的入口改为 `bootstrapDirectPage(...)`。
  - 新增 `src/pages/user-profile-page.ts`，继续承接现有 `js/user_profile_page.js` 的页面逻辑。
  - 将 `user-profile` 正式纳入 `runtime-manifest`、`page-bootstrap`、`home-family-shared` 与 `entry-manifest-audit`。
  - 补齐 dedicated unit 与 page-system smoke。
  - 结构口径上，`user-profile` 已从 `auth-security` 移出，改挂到 `profile-history-replay`。

### 2）验证证据（2026-03-22）
- `npx vitest run tests/unit/user-profile-entry-bootstrap.spec.ts tests/unit/runtime-manifest.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/bootstrap-page-bootstrap.spec.ts`
  - PASS（29 passed）
- `npm run audit:entry-manifest`
  - PASS
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-user-profile-page-system.smoke.spec.ts tests/smoke/pages-user-profile-title.smoke.spec.ts`
  - PASS（7 passed）
- 最终 `npm run verify:prepush`
  - PASS（audit / unit / smoke / build 全绿）

### 3）阶段结论
- 当前已审计的 16 个页面入口里，剩余 `direct-module = 0`。
- `WS4-02` 在页面入口收口层面可记为 `stage pass`。
- 但 `M4` 还不能记为 `done`，因为 `src/pages/* -> ../../js/*.js` 仍是过渡适配层。

### 4）接下来需要做的工作
1. 启动 `WS4-03`，为 `src/pages/* -> ../../js/*.js` 建立 `legacy-runtime-import boundary`，防止 page shell 长期固化。
2. 继续把页面编排从 `js/*_page.js` 往 `features/services` 收。
3. 并行推进 `WS6-01A`，把 `service-boundary` 从 syntax-level gate 升级为 owner-aware gate。
## [2026-03-22] Batch-WS4-03

### 1) 目标
- 冻结 `src/pages/* -> ../../js/*.js` 的 legacy 适配入口，阻止新增 legacy import。

### 2) 改动
- `scripts/page-legacy-runtime-boundary-audit.mjs`
- `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- `scripts/refactor-gate.mjs`
- `package.json`

### 3) 验证
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/refactor-gate-helpers.spec.ts`

### 4) 阶段结论
- `WS4-03` 边界已落地为 allowlist gate；新增 legacy page import 会直接阻断。

### 5) 接下来要做的事
1. 逐页移除 legacy import，并删除对应 allowlist 条目。
2. 若必须引入新的 legacy import，必须同步更新 allowlist 并说明原因。

## [2026-03-22] Batch-WS4-02E
### 1) Ŀ��
- Undo snapshot/restore ���� Engine facade��legacy runtime ���� fallback��

### 2) �Ķ�
- `src/bootstrap/engine-facade-host.ts`
- `src/entries/home-family-bootstrap.ts`
- `js/core_undo_snapshot_runtime.js`
- `js/core_undo_restore_runtime.js`
- `tests/unit/bootstrap-engine-facade-host.spec.ts`

### 3) ��֤
- `npx vitest run tests/unit/bootstrap-engine-facade-host.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/core-undo-restore.spec.ts`

### 4) �׶ν���
- Undo snapshot/restore �������� `CoreEngineFacade`��ʧ��ʱ���� legacy �߼���

### 5) ������Ҫ���Ĺ���
1. �ƽ� WS4-02B��`palette` ȥ legacy������ theme settings runtime����
2. ���� undo ��� smoke �����棬ȷ���޻ع顣

## [2026-03-22] Batch-WS4-02B
### 1) Ŀ��
- `palette` ȥ legacy������ theme settings runtime����

### 2) �Ķ�
- `src/pages/palette-page.ts`
- `scripts/page-legacy-runtime-boundary-audit.mjs`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx vitest run tests/unit/palette-entry-bootstrap.spec.ts`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-palette-page-system.smoke.spec.ts`

### 4) �׶ν���
- `palette` ���Ƴ� `core_theme_settings_*` legacy import��page-legacy allowlist ͬ��������

### 5) ������Ҫ���Ĺ���
1. �������� `modes` / `history` �� legacy import����С allowlist��
2. ���� `palette` ��� smoke ���ǣ�ȷ���޻ع顣

## [2026-03-22] Batch-WS4-03A
### 1) Ŀ��
- `modes` ���� legacy import���Ƴ� `core_i18n_runtime.js`��

### 2) �Ķ�
- `src/pages/modes-page.ts`
- `scripts/page-legacy-runtime-boundary-audit.mjs`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-modes-page-system.smoke.spec.ts`

### 4) �׶ν���
- `modes` ������ `theme_manager.js` legacy import��allowlist ����������

### 5) ������Ҫ���Ĺ���
1. ��� `history` ҳ�� legacy import�����ȸ�����滻�� runtime��
2. �������� allowlist �����붨�� smoke ֤�ݡ�

## [2026-03-22] Batch-WS4-03B
### 1) Ŀ��
- `history` ���� legacy import���Ƴ� `core_i18n_runtime.js`��

### 2) �Ķ�
- `src/pages/history-page.ts`
- `scripts/page-legacy-runtime-boundary-audit.mjs`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`

### 4) �׶ν���
- `history` ���Ƴ� `core_i18n_runtime.js` legacy import��allowlist ����������

### 5) ������Ҫ���Ĺ���
1. ��� `history_page.js` ��ɶ���Ǩ�Ƶ� runtime �߼���
2. �������������� allowlist��

## [2026-03-22] Batch-WS4-03C
### 1) Ŀ��
- `history` ȥ legacy��refactor_cutover_migration����

### 2) �Ķ�
- `src/bootstrap/refactor-cutover-migration.ts`
- `src/pages/history-page.ts`
- `scripts/page-legacy-runtime-boundary-audit.mjs`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`

### 4) �׶ν���
- `history` �Ƴ� `refactor_cutover_migration.js` legacy import��Ǩ���߼��䵽 TS��

### 5) ������Ҫ���Ĺ���
1. ��� `history_page.js` �ڲ��߼���ɸѡ״̬����Ⱦģ�͵ȣ���
2. �������� allowlist �����붨�� smoke��

## [2026-03-22] Batch-WS4-03D
### 1) Ŀ��
- history ҳ���Ƴ� `history_page.js` ֱ����ת�� entry ���� legacy��

### 2) �Ķ�
- `src/pages/history-page.ts`
- `src/entries/history.ts`
- `scripts/page-legacy-runtime-boundary-audit.mjs`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-history-page-system.smoke.spec.ts`

### 4) �׶ν���
- history page shell ���� `history_page.js` ���legacy ���� entry ���ء�

### 5) ������Ҫ���Ĺ���
1. �� `history_page.js` ��ɸѡ/��Ⱦ�߼�Ǩ�Ƶ� TS feature ģ�顣
2. �������� allowlist �����붨�� smoke��

## [2026-03-22] Batch-WS4-03E
### 1) Ŀ��
- history ҳ���� TS runtime ȡ�� legacy history_page.js�����Ƴ� entry loader��

### 2) �Ķ�
- `src/pages/history-page-runtime.ts`
- `src/pages/history-page.ts`
- `src/entries/history.ts`

### 3) ��֤
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx vitest run tests/unit/history-entry-bootstrap.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-history-page-system.smoke.spec.ts tests/smoke/pages-local-history-autosave.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts tests/smoke/history-records-toolbar-events.smoke.spec.ts tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-view-models.smoke.spec.ts`

### 4) �׶ν���
- history page �Ѵ� legacy history_page.js �л��� TS runtime�������̲�ȫ��ͨ����

### 5) ������Ҫ���Ĺ���
1. �������滻ʣ�� legacy ������LocalHistoryStore/ModeCatalog/CoreGameSettingsStorageRuntime����
2. ���� F �����嵥�����������ǩ�֡�
