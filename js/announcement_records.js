(function () {
  window.ANNOUNCEMENT_RECORDS = [
    {
      id: "2026-04-06-v2.4",
      version: "v2.4",
      date: "2026-04-06",
      title: "5x5 接力模式上线与 UI 优化",
      title_en: "5x5 Relay Mode Released + UI Polish",
      content:
        "本次更新新增了 5x5 棋盘接力模式，并同步优化了模式页、接力页与部分操作提示的 UI 细节。\n\n" +
        "5x5 接力模式详细用法：\n" +
        "1. 先登录账号，再进入「5x5 接力」页面。\n" +
        "2. 在「5x5 无撤回版」先游玩一局，回到接力页点击「制档」，即可把当前盘面创建为接力档案。\n" +
        "3. 持有者可继续游玩后点击「提交进度」，更新该档案的快照与回放分段。\n" +
        "4. 其他用户可在档案列表点击「申请接档」；持有者在申请列表中选择并批准目标用户。\n" +
        "5. 持有者也可直接指定递交：输入目标用户昵称并发起指定递交，目标用户确认后即完成移交。\n" +
        "6. 目标用户确认接档成功后，会获得该档案所有权，并可在接力页「读档」后跳转到 5x5 无撤回版继续游玩。\n" +
        "7. 当档案彻底结束或不再需要时，可由当前持有者执行「销档」永久删除。\n\n" +
        "补充说明：\n" +
        "- 同一时间每位用户最多持有 1 个接力档案。\n" +
        "- 档案移交会同步最新进度，便于多人连续接力。",
      content_en:
        "This release introduces 5x5 Relay Mode and further polishes UI details across modes/relay pages.\n\n" +
        "How to use 5x5 Relay Mode:\n" +
        "1. Sign in, then open the \"5x5 Relay\" page.\n" +
        "2. Play in \"5x5 No-Undo\" first, return to relay page, and click \"Create\" to archive current board.\n" +
        "3. The holder can keep playing and click \"Submit Progress\" to update snapshot and replay segments.\n" +
        "4. Other users click \"Request Claim\" in list; holder reviews requests and approves one target.\n" +
        "5. Holder may also designate by nickname directly; target confirms and handoff completes.\n" +
        "6. After confirmation, target becomes holder and can click \"Load\" to continue in 5x5 No-Undo.\n" +
        "7. When a case is finished, current holder can \"Delete\" it permanently.\n\n" +
        "Notes:\n" +
        "- Each user can hold at most one relay case at a time.\n" +
        "- Handoff synchronizes latest progress for continuous relay play."
    },
    {
      id: "2026-04-06-v2.3",
      version: "v2.3",
      date: "2026-04-06",
      title: "新增 5x5 接力模式与界面优化",
      title_en: "5x5 Relay Mode Added + UI Improvements",
      content:
        "本次更新新增 5x5 接力模式（MVP），并优化了接力页与模式页的部分交互和视觉样式。\n\n" +
        "5x5 接力模式详细用法：\n" +
        "1. 登录账号后进入“5x5 接力模式”。\n" +
        "2. 先在“5x5 无撤回版”游玩一局，回到接力页点击“制档”创建档案。\n" +
        "3. 如需指定递交，输入“档案ID”和“目标用户昵称”，点击“指定递交”。\n" +
        "4. 目标用户会在“接档确认”模块看到待接档案，点击“确认接档”即可获得存档并继续游玩。\n" +
        "5. 持有者可在继续游玩后点击“提交进度”更新快照与回放；需要交接时由目标用户先申请或由持有者直接指定后再交接。\n" +
        "6. 点击“读档”会将当前档案同步到 5x5 无撤回版并跳转开始游玩；“销档”会永久删除该档案。\n\n" +
        "说明：每个用户同一时间仅可持有一个接力档案。",
      content_en:
        "This update adds 5x5 Relay Mode (MVP) and improves parts of the relay/modes UI.\n\n" +
        "How to use 5x5 Relay Mode:\n" +
        "1. Sign in and open \"5x5 Relay Mode\".\n" +
        "2. Play in \"5x5 No-Undo\" first, then return and click \"Create\" to archive your current board.\n" +
        "3. To designate handoff directly, enter \"Case ID\" and target \"Nickname\", then click \"Designate Handoff\".\n" +
        "4. The target user receives it in \"Claim Confirmation\" and clicks \"Confirm Claim\" to take ownership.\n" +
        "5. Holder can continue playing and click \"Submit\" to update snapshot/replay before handoff.\n" +
        "6. \"Load\" syncs case snapshot to 5x5 No-Undo and redirects to continue; \"Delete\" permanently removes the case.\n\n" +
        "Note: each user can hold only one relay case at a time."
    },
    {
      id: "2026-03-21-v2.2",
      version: "v2.2",
      date: "2026-03-21",
      title: "排行榜与登录功能测试版",
      title_en: "Leaderboard & Login Test Build",
      content: "新增排行榜功能和登录功能的测试版本，欢迎体验并反馈问题。",
      content_en:
        "Added a test build for leaderboard and login features. Feedback is welcome."
    },
    {
      id: "2026-03-11-v2.1",
      version: "v2.1",
      date: "2026-03-11",
      title: "V2.1 体验与稳定性更新",
      title_en: "V2.1 UX & Stability Update",
      content:
        "本次更新重点为体验优化与稳定性修复：完善中英文切换，修复移动端英文状态下切回中文不生效问题；色板功能已独立为单独页面，支持标准/斐波那契分离编辑、导入导出与实时预览；模式选择页重构为常用入口优先展示，其余模式分组收纳，页面更清晰；并修复推荐入口卡片在部分主题下文字不可见问题。同时修复了主题设置模块中的 TypeScript 构建报错，提升版本发布稳定性。",
      content_en:
        "This update focuses on UX improvements and stability fixes: improved full Chinese/English switching and fixed the mobile issue where switching back to Chinese could fail in English mode; moved the palette feature to a standalone page with separate Standard/Fibonacci editing, import/export, and live preview; redesigned the mode selection page to prioritize commonly used entries while grouping advanced modes into collapsible sections for cleaner navigation; and fixed unreadable text on featured mode cards under some themes. Also fixed a TypeScript build error in the theme settings module to improve release stability."
    },
    {
      id: "2026-03-05-v2.0",
      version: "v2.0",
      date: "2026-03-05",
      title: "V2.0 重构上线",
      title_en: "V2.0 Refactor Release",
      content:
        "本次大版本更新，主要完成了高耦合代码重构与技术栈升级，并修复了老版本中的多项问题。IPS 统计修复、自定义 4 率模式修复、新盘面与局内出数问题修复、障碍块模式修复、回放文件与 2048Verse 通用并支持导入 2048endgameTablebase v9.0 分析、历史本地记录修复、布局优化、Logo 新增、移动端体验优化、按钮图标/文字切换、方块字体尺寸优化、主题效果优化等。遇到问题或建议可发邮件：1203214493@qq.com。",
      content_en:
        "This major release focuses on refactoring high-coupling code and upgrading the tech stack, along with many bug fixes and UX improvements. Fixed: IPS stats, custom 4-rate mode, new-board and in-game spawns, obstacle mode issues, local history persistence, and more. Replay code is now compatible with 2048Verse and supports importing 2048endgameTablebase v9.0 analysis. Added logo updates, mobile UX improvements, icon/text button switch, tile font-size optimization, and theme polishing. Feedback: 1203214493@qq.com."
    },
    {
      id: "2026-02-22-v1.9",
      version: "v1.9",
      date: "2026-02-22",
      title: "移动端适配与斐波那契修复",
      title_en: "Mobile Adaptation & Fibonacci Fixes",
      content: "本版本完成移动端适配并提升整体体验，同时修复了斐波那契模式中的若干问题。",
      content_en: "This version improves mobile adaptation and overall experience, and fixes several issues in Fibonacci mode."
    },
    {
      id: "2026-02-21-v1.81",
      version: "v1.81",
      date: "2026-02-21",
      title: "封顶模式与练习板更新",
      title_en: "Capped Modes & Practice Board Update",
      content: "新增多个封顶模式入口，支持从棋盘直接跳转练习板；练习板功能更新并加入新手指引。",
      content_en: "Added multiple capped-mode entries and direct board-to-practice navigation. Practice board was updated with a beginner guide."
    },
    {
      id: "2026-02-21-v1.8",
      version: "v1.8",
      date: "2026-02-21",
      title: "回归本地练习",
      title_en: "Back to Local Practice",
      content: "移除未完成的登录与排行榜功能。本站定位为本地练习工具，历史记录本地保存，支持查看、导入、导出与回放。",
      content_en: "Removed unfinished login and online ranking features. The site is positioned as a local practice tool with local history, import/export, and replay support."
    },
    {
      id: "2026-02-20-v1.72",
      version: "v1.72",
      date: "2026-02-20",
      title: "中局自动保存上线",
      title_en: "Mid-Game Auto Save",
      content: "新增本地中局自动保存：未结束对局在刷新或关闭后可继续。仅主动点击“新游戏”才会清空当前局。",
      content_en: "Added local mid-game auto save: unfinished runs can continue after refresh/close. Only clicking New Game clears the current run."
    },
    {
      id: "2026-02-19-v1.71",
      version: "v1.71",
      date: "2026-02-19",
      title: "模式与主题迭代",
      title_en: "Modes & Themes Iteration",
      content: "补充多个模式并优化计时器逻辑，修复部分主题显示与计时器表现问题。",
      content_en: "Added more modes and optimized timer logic, with fixes for some theme rendering and timer behavior issues."
    }
  ];
})();
