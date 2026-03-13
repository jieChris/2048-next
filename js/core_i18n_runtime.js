(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_KEY = "ui_language_v1";
  var DEFAULT_LANG = "zh";
  var currentLang = null;
  var applying = false;
  var observer = null;
  var refreshTimer = 0;
  var languageSelectLockUntil = 0;
  var dialogPatched = false;
  var originalAlert = null;
  var originalConfirm = null;
  var originalPrompt = null;

  function getNow() {
    if (global.Date && typeof global.Date.now === "function") return global.Date.now();
    return new Date().getTime();
  }

  function lockLanguageSelect(ms) {
    var duration = Number(ms);
    if (!Number.isFinite(duration) || duration < 0) duration = 0;
    var next = getNow() + duration;
    if (next > languageSelectLockUntil) languageSelectLockUntil = next;
  }

  function isLanguageSelectLocked() {
    return getNow() < languageSelectLockUntil;
  }

  var PAGE_TITLE_MAP = {
    "index.html": { zh: "2048", en: "2048" },
    "undo_2048.html": { zh: "2048（可撤回）", en: "2048 (Undo)" },
    "capped_2048.html": { zh: "2048（封顶）", en: "2048 (Capped)" },
    "practice_board.html": { zh: "2048练习板", en: "2048 Practice Board" },
    "pku2048.html": { zh: "PKU2048", en: "PKU2048" },
    "play.html": { zh: "2048 多玩法", en: "2048 Multi Modes" },
    "replay.html": { zh: "2048 高级回放", en: "2048 Advanced Replay" },
    "history.html": { zh: "2048 本地历史记录", en: "2048 Local History" },
    "modes.html": { zh: "2048 模式选择", en: "2048 Modes" },
    "palette.html": { zh: "2048 色板中心", en: "2048 Palette Center" }
  };

  var MODE_KEY_LABELS = {
    standard_4x4_pow2_no_undo: "Standard 4x4 (No Undo)",
    standard_4x4_pow2_undo: "Classic 4x4 (Undo)",
    board_3x3_pow2_no_undo: "3x3 (No Undo)",
    board_3x4_pow2_no_undo: "4x3 (No Undo)",
    board_2x4_pow2_no_undo: "4x2 (No Undo)",
    board_5x5_pow2_no_undo: "5x5 (No Undo)",
    board_6x6_pow2_no_undo: "6x6 (No Undo)",
    board_7x7_pow2_no_undo: "7x7 (No Undo)",
    board_8x8_pow2_no_undo: "8x8 (No Undo)",
    board_9x9_pow2_no_undo: "9x9 (No Undo)",
    board_10x10_pow2_no_undo: "10x10 (No Undo)",
    fib_4x4_no_undo: "Fibonacci 4x4 (No Undo)",
    fib_3x3_no_undo: "Fibonacci 3x3 (No Undo)",
    fib_4x3_no_undo: "Fibonacci 4x3 (No Undo)",
    fib_4x2_no_undo: "Fibonacci 4x2 (No Undo)",
    capped_4x4_pow2_64_no_undo: "4x4 Capped 64",
    capped_4x4_pow2_1024_no_undo: "4x4 Capped 1024",
    capped_4x4_pow2_no_undo: "4x4 Capped 2048",
    capped_4x4_pow2_4096_no_undo: "4x4 Capped 4096",
    spawn_custom_4x4_pow2_no_undo: "4x4 Custom 4-Rate (No Undo)",
    spawn50_3x3_pow2_no_undo: "3x3 Spawn 50/50 (No Undo)",
    dirlock5_4x4_pow2_no_undo: "4x4 Direction Lock (No Undo)",
    obstacle_4x4_pow2_no_undo: "4x4 Obstacle Blocks (No Undo)",
    board_3x3_pow2_undo: "3x3 (Undo)",
    board_3x4_pow2_undo: "4x3 (Undo)",
    board_2x4_pow2_undo: "4x2 (Undo)",
    board_5x5_pow2_undo: "5x5 (Undo)",
    board_6x6_pow2_undo: "6x6 (Undo)",
    board_7x7_pow2_undo: "7x7 (Undo)",
    board_8x8_pow2_undo: "8x8 (Undo)",
    board_9x9_pow2_undo: "9x9 (Undo)",
    board_10x10_pow2_undo: "10x10 (Undo)",
    fib_4x4_undo: "Fibonacci 4x4 (Undo)",
    fib_3x3_undo: "Fibonacci 3x3 (Undo)",
    fib_4x3_undo: "Fibonacci 4x3 (Undo)",
    fib_4x2_undo: "Fibonacci 4x2 (Undo)",
    spawn_custom_4x4_pow2_undo: "4x4 Custom 4-Rate (Undo)",
    limit3_4x4_pow2_undo: "4x4 Limited Undo (3)",
    limit5_4x4_pow2_undo: "4x4 Limited Undo (5)",
    combo_4x4_pow2_undo: "4x4 Combo Scoring (Undo)"
  };

  var THEME_LABELS = {
    classic: "Classic", ocean: "Ocean Breeze", vaporwave: "Vaporwave", matcha: "Matcha", dracula: "Dracula",
    sunset: "Sunset", blueprint: "Blueprint", candy: "Candy", terminal: "Terminal", paper: "Paper",
    coffee: "Coffee", ink: "Ink", lava: "Lava", chalkboard: "Chalkboard", comic: "Comic",
    leather: "Leather", forest: "Forest", pop: "High Contrast", neon_flux: "Dynamic Neon", neon_black: "Neon Pulse",
    cyberpunk: "Cyberpunk", retro: "Retro Pixel", glass: "Frosted Glass", space: "Deep Space", sakura: "Sakura",
    mecha: "Mecha", neumorphism: "Neumorphism", clay: "Clay", bauhaus: "Bauhaus", nordic: "Nordic Frost",
    luxury: "Black Gold", yanyuan: "Yanyuan Autumn", horse_year: "Year of the Horse"
  };

  var FIXED_SELECTOR_TEXT = [
    { s: "#announcement-modal h3", zh: "版本公告", en: "Announcements" },
    { s: "#announcement-close-btn", zh: "关闭", en: "Close" },
    { s: "#replay-modal-title", zh: "回放", en: "Replay" },
    { s: "#replay-action-btn", zh: "执行", en: "Run" },
    { s: "#settings-modal h3", zh: "设置", en: "Settings" },
    { s: "#settings-close-btn", zh: "关闭", en: "Close" },
    { s: "#toolkit-palette-link", zh: "主题设置", en: "Theme Settings" },
    { s: "label[for='timer-module-view-toggle'].settings-toggle-title", zh: "计时器模式", en: "Timer Mode" },
    { s: "label[for='pku2048-inline-stats-toggle']", zh: "统计面板", en: "Stats Panel" },
    { s: "#pku2048-inline-stats-toggle + span", zh: "直接显示在页面中", en: "Show inline on page." },
    { s: "#mode-intro-title", zh: "模式简介", en: "Mode Intro" },
    { s: ".mode-intro-leaderboard-title", zh: "模式排名榜单", en: "Mode Rankings" },
    { s: "#mode-intro-close-btn", zh: "关闭", en: "Close" },
    { s: "#import-replay-file-btn", zh: "导入回放文件", en: "Import Replay File" },
    { s: "#import-replay-text-btn", zh: "粘贴回放代码", en: "Paste Replay Code" }
  ];

  var FIXED_SELECTOR_ATTR = [
    { s: "#top-home-btn", a: "title", zh: "回首页", en: "Home" },
    { s: "#top-announcement-btn", a: "title", zh: "版本公告", en: "Announcements" },
    { s: "#stats-panel-toggle", a: "title", zh: "统计", en: "Stats" },
    { s: "#top-export-replay-btn", a: "title", zh: "导出回放", en: "Export Replay" },
    { s: "#top-practice-btn", a: "title", zh: "直通练习板", en: "Practice Board" },
    { s: "#top-advanced-replay-btn", a: "title", zh: "高级回放", en: "Advanced Replay" },
    { s: "#top-modes-btn", a: "title", zh: "模式选择", en: "Mode Selection" },
    { s: "#top-history-btn", a: "title", zh: "历史记录", en: "History" },
    { s: "#top-settings-btn", a: "title", zh: "设置", en: "Settings" },
    { s: "#top-restart-btn", a: "title", zh: "新游戏", en: "New Game" },
    { s: "#top-restart-btn", a: "aria-label", zh: "新游戏", en: "New Game" },
    { s: "#top-undo-btn", a: "title", zh: "撤回", en: "Undo" },
    { s: "#practice-mobile-undo-btn", a: "title", zh: "撤回", en: "Undo" },
    { s: "#practice-mobile-undo-btn", a: "aria-label", zh: "撤回", en: "Undo" },
    { s: "#timerbox-toggle-btn", a: "title", zh: "展开计时器", en: "Toggle Timers" },
    { s: "#timerbox-toggle-btn", a: "aria-label", zh: "展开计时器", en: "Toggle Timers" },
    { s: "#history-keyword", a: "placeholder", zh: "模式/分数/ID", en: "Mode / Score / ID" },
    { s: "#palette-name-input", a: "placeholder", zh: "输入色板名称", en: "Palette name" }
  ];

  var PHRASES = [
    ["主题设置", "Theme Settings"], ["统计面板", "Stats Panel"], ["直接显示在页面中", "Show inline on page."],
    ["页面中英文切换", "Switch page language."], ["打开指引", "Open Guide"],
    ["设置", "Settings"], ["关闭", "Close"], ["回放", "Replay"], ["执行", "Run"], ["版本公告", "Announcements"],
    ["统计", "Stats"], ["导出回放", "Export Replay"], ["直通练习板", "Practice Board"], ["高级回放", "Advanced Replay"],
    ["模式选择", "Mode Selection"], ["历史记录", "History"], ["回首页", "Home"], ["首页", "Home"], ["模式", "Mode"],
    ["关键词", "Keyword"], ["排序", "Sort"], ["全部模式", "All Modes"], ["刷新", "Refresh"], ["导出全部", "Export All"],
    ["导入合并", "Import & Merge"], ["导入并替换", "Import & Replace"], ["清空全部", "Clear All"], ["上一页", "Prev"], ["下一页", "Next"],
    ["新游戏", "New Game"], ["新局", "New Run"], ["撤回", "Undo"], ["撤销", "Undo"], ["继续游戏", "Keep Going"],
    ["无撤回", "No Undo"], ["可撤回", "Undo"],
    ["玩法提示", "Guide"], ["展开计时器", "Show Timers"], ["收起计时器", "Hide Timers"],
    ["棋子配色", "Tile Theme"], ["选择主题", "Select Theme"], ["配色预览", "Theme Preview"],
    ["色板", "Palette"], ["新建", "Create"], ["新建副本", "New Copy"], ["重命名", "Rename"], ["删除", "Delete"], ["导出", "Export"], ["导入", "Import"],
    ["标准 16 色", "Standard 16 Colors"], ["斐波那契 16 色", "Fibonacci 16 Colors"],
    ["胜利提示", "Win Prompt"], ["合成 2048 后弹出胜利提示", "Show win prompt after reaching 2048"],
    ["点击这里返回首页", "Click here to return Home"], ["点击下方数字后点击棋盘，可自定义当前盘面。", "Pick a number, then click cells to edit the board."],
    ["练习板支持直通局面与基线重试。", "Practice board supports direct board transfer and baseline retries."],
    ["模式加载中...", "Loading mode..."], ["模式简介", "Mode Intro"], ["模式排名榜单", "Mode Rankings"],
    ["榜单功能即将上线，这里将展示 64 封顶模式排行榜。", "Leaderboard coming soon. Rankings for 64-capped mode will be shown here."],
    ["不可撤回模式", "No-Undo Modes"], ["可撤回模式", "Undo Modes"], ["推荐入口", "Recommended"], ["规则实验", "Rule Experiments"],
    ["概率变种", "Spawn Variants"], ["工具入口", "Tools"], ["其他页面", "Other Pages"], ["练习板（Legacy）", "Practice Board (Legacy)"],
    ["本站为本地练习工具，所有记录保存在本地。可在历史页面查看、导出、导入和回放。", "This site is for local practice. Records are stored locally and can be viewed, exported, imported and replayed from History."],
    ["暂无历史记录。你可以开始一局游戏后再回来查看。", "No local records yet. Start a game and come back later."],
    ["未知", "Unknown"], ["分数:", "Score:"], ["最大块:", "Max Tile:"], ["时长:", "Duration:"], ["结束:", "Ended:"],
    ["确认删除这条记录？", "Delete this record?"], ["确认导入并替换全部当前历史记录？", "Import and replace all current local history?"],
    ["确认清空全部本地历史记录？此操作不可撤销。", "Clear all local history? This cannot be undone."],
    ["导入回放", "Import Replay"], ["开始回放", "Start Replay"], ["导入回放文件失败:", "Failed to import replay file:"],
    ["加载本地回放失败:", "Failed to load local replay:"], ["在线回放已移除。请从本地历史页面打开回放。", "Online replay is removed. Open replay from local history page."],
    ["色板中心", "Palette Center"], ["独立管理砖块与计时图例配色，支持导入导出与实时预览。", "Manage tile/timer legend colors with import/export and live preview."],
    ["色板列表", "Palette List"], ["未选择色板", "No Palette Selected"], ["输入色板名称", "Palette name"],
    ["实时预览", "Live Preview"], ["标准", "Standard"], ["斐波那契", "Fibonacci"], ["计时图例", "Timer Legend"],
    ["只读", "Read-only"], ["可编辑", "Editable"], ["当前", "Current"], ["内置", "Built-in"], ["自定义", "Custom"],
    ["当前色板为只读，请先新建副本。", "Current palette is read-only. Create a copy first."], ["色板颜色已更新。", "Palette color updated."],
    ["请输入色板名称。", "Please input palette name."], ["当前环境不支持导入。", "Import is not supported in current environment."],
    ["当前环境不支持导出。", "Export is not supported in current environment."], ["读取所选文件失败。", "Failed to read selected file."],
    ["导入失败，请检查 JSON 格式。", "Import failed. Please check JSON format."], ["已加载色板中心。", "Palette center loaded."],
    ["经典", "Classic"], ["海洋之风", "Ocean Breeze"], ["蒸汽波", "Vaporwave"], ["抹茶", "Matcha"], ["吸血鬼", "Dracula"],
    ["日落", "Sunset"], ["蓝图", "Blueprint"], ["糖果", "Candy"], ["终端", "Terminal"], ["纸张", "Paper"],
    ["咖啡", "Coffee"], ["水墨", "Ink"], ["岩浆", "Lava"], ["黑板", "Chalkboard"], ["美漫", "Comic"],
    ["皮革", "Leather"], ["森林", "Forest"], ["高对比", "High Contrast"], ["动态霓虹", "Dynamic Neon"], ["炫彩闪烁", "Neon Pulse"],
    ["赛博朋克", "Cyberpunk"], ["复古像素", "Retro Pixel"], ["磨砂玻璃", "Frosted Glass"], ["深邃太空", "Deep Space"],
    ["樱花漫舞", "Sakura"], ["机械装甲", "Mecha"], ["新拟态", "Neumorphism"], ["黏土拟态", "Clay"], ["包豪斯", "Bauhaus"],
    ["北欧冰霜", "Nordic Frost"], ["黑金奢华", "Black Gold"], ["燕园秋色", "Yanyuan Autumn"], ["马年大吉", "Year of the Horse"],
    ["合并数字，合成 2048 方块！ 本页为无撤回版。", "Create the 2048 tile! This page has no undo."],
    ["合并数字，合成 2048 方块！ 按 Z 可撤销。", "Merge numbers to create the 2048 tile! Press Z to undo."],
    ["玩法说明： 使用 方向键、WASD、KHJL 移动方块。本页不支持撤回，按 R 键重开游戏。当两个相同数字的方块接触时，它们会 合并成一个！", "How to play: Use Arrow keys, WASD, or KHJL to move tiles. Undo is disabled on this page. Press R to restart. When two tiles with the same number touch, they merge into one."],
    ["玩法说明： 使用 方向键、WASD、KHJL 移动方块，按 Z 键撤回上一步，按 R 键重开游戏。当两个相同数字的方块接触时，它们会 合并成一个！", "How to play: Use Arrow keys, WASD, or KHJL to move tiles. Press Z to undo and R to restart. When two tiles with the same number touch, they merge into one."],
    ["方向键", "Arrow keys"],
    ["移动方块", "move tiles"],
    ["按 R 键重开游戏", "press R to restart"],
    ["按 Z 键撤回上一步", "press Z to undo one step"],
    ["当两个相同数字的方块接触时，它们会 合并成一个！", "When two tiles with the same number touch, they merge into one!"],
    ["项目由Gemini和Codex基于几个项目整合改版，开源在GitHub。", "This project is an integrated fork adapted with Gemini and Codex, open sourced on GitHub."],
    ["项目由Gemini和Codex基于几个项目整合改，开源在GitHub。", "This project is an integrated fork adapted with Gemini and Codex, open sourced on GitHub."],
    ["基于 Veewo Studio 的 1024 且概念受 Asher Vollmer 的 Threes 启发。", "Based on 1024 by Veewo Studio and inspired by Threes by Asher Vollmer."],
    ["Undo Mod 由 Alok Menghrajani 制作，源代码。项目改自2048。计时器参考2048-timer。", "Undo mod by Alok Menghrajani. Forked from 2048. Timer reference: 2048-timer."],
    ["项目由Gemini和Codex基于几个项目整合改版，开源在GitHub。原作者 Gabriele Cirulli. 基于 Veewo Studio 的 1024 且概念受 Asher Vollmer 的 Threes 启发。 Undo Mod 由 Alok Menghrajani 制作，源代码。项目改自2048。计时器参考2048-timer。", "This project is an integrated fork adapted with Gemini and Codex and is open source on GitHub. Original game by Gabriele Cirulli, based on 1024 by Veewo Studio and inspired by Threes by Asher Vollmer. Undo mod by Alok Menghrajani. Timer reference: 2048-timer."],
    ["欢迎加入中国第一2048交流群：", "Join the 2048 community group: "],
    ["推荐具有排行榜功能的", "Recommended leaderboard site: "],
    ["2048 标题", "2048 Title"],
    ["在任何页面点击该标题，都可以返回主页。", "Click this title on any page to return home."],
    ["上一步", "Back"], ["下一步", "Next"], ["跳过", "Skip"],
    ["步骤 ", "Step "], [" · ", " · "],
    ["选中 0 后，点击同一格会按 0→2→4→…→65536 循环。", "After selecting 0, clicking the same cell cycles 0→2→4→…→65536."],
    ["▲ 上移 ▼ 下移", "▲ Up ▼ Down"],
    ["▲ 上移", "▲ Up"],
    ["▼ 下移", "▼ Down"],
    ["选择你要进入的模式", "Choose a mode"],
    ["2幂 - 尺寸扩展", "Powers of 2 - Size Variants"],
    ["封顶/概率/规则实验", "Capped / Spawn / Rule Experiments"],
    ["历史", "History"],
    ["⏯ 暂停", "⏯ Pause"],
    ["▶ 播放", "▶ Play"],
    ["Import Replay文件 粘贴Replay代码", "Import replay file / paste replay code"],
    ["UndoBack", "undo one step"],
    ["暂停", "Pause"],
    ["护眼·暖砂", "Eye Care · Warm Sand"],
    ["护眼·夜纸", "Eye Care · Night Paper"],
    ["跟随主题", "Follow Theme"],
    ["本地历史", "Local History"],
    ["4x4 自定义4率（可撤回）", "4x4 Custom 4-Rate (Undo)"],
    ["4x4 自定义4率（无撤回）", "4x4 Custom 4-Rate (No Undo)"],
    ["4x4 自定义4率", "4x4 Custom 4-Rate"],
    ["实际出4率", "Actual 4-Rate"],
    ["出2数量", "2 Spawns"],
    ["出4数量", "4 Spawns"],
    ["4x4 概率 95/5（可撤回）", "4x4 Spawn 95/5 (Undo)"],
    ["4x4 概率 95/5（无撤回）", "4x4 Spawn 95/5 (No Undo)"],
    ["4x4 概率 80/20（可撤回）", "4x4 Spawn 80/20 (Undo)"],
    ["4x4 概率 80/20（无撤回）", "4x4 Spawn 80/20 (No Undo)"],
    ["3x3 概率 50/50（无撤回）", "3x3 Spawn 50/50 (No Undo)"],
    ["3x3 概率50/50（无撤回）", "3x3 Spawn 50/50 (No Undo)"],
    ["3*3 概率50/50（无撤回）", "3x3 Spawn 50/50 (No Undo)"],
    ["限次撤回 4x4（3次）", "4x4 Limited Undo (3)"],
    ["限次撤回 4x4（5次）", "4x4 Limited Undo (5)"],
    ["限次撤回（3次）", "Limited Undo (3)"],
    ["限次撤回（5次）", "Limited Undo (5)"],
    ["连击加分 4x4（可撤回）", "4x4 Combo Scoring (Undo)"],
    ["连击加分", "Combo Scoring"],
    ["方向锁 4x4（每5步锁1方向）", "4x4 Direction Lock (Lock one direction every 5 moves)"],
    ["方向锁", "Direction Lock"],
    ["障碍块 4x4（无撤回）", "4x4 Obstacle Blocks (No Undo)"],
    ["障碍块", "Obstacle Blocks"],
    ["练习板（直通）", "Practice Board (Direct)"],
    ["按时间（新到旧）", "By Time (Newest First)"],
    ["按时间（旧到新）", "By Time (Oldest First)"],
    ["按分数（高到低）", "By Score (High to Low)"]
  ];

  var zhToEn = {};
  var enToZh = {};
  var sortedZh = [];
  var sortedEn = [];
  var EXTRA_PHRASES = [
    ["新手指引", "Beginner Guide"],
    ["重新播放首页功能指引", "Replay homepage feature guide"],
    ["打开后将立即进入首页新手引导，完成后自动关闭。", "Enable to enter the homepage beginner guide immediately; it closes automatically after completion."],
    ["该功能仅在首页可用。", "This feature is only available on Home."],
    ["按钮样式", "Button Style"],
    ["文字按钮模式", "Text Button Mode"],
    ["移动端顶部按钮显示风格。", "Display style for top buttons on mobile."],
    ["当前为图标按钮，视觉更简洁。", "Current: icon buttons for cleaner visuals."],
    ["当前为文字按钮，可读性更强。", "Current: text buttons for better readability."],
    ["公告", "News"],
    ["练习", "Practice"],
    ["练习板", "Practice Board"],
    ["直通练习板", "Practice Board"],
    ["合成 2048 后弹出胜利提示", "Show win prompt after reaching 2048"],
    ["合成 2048 时会弹出胜利提示，可选择继续游戏。", "Show win prompt when reaching 2048, with Keep Going option."],
    ["合成 2048 时不弹出胜利提示，将自动继续游戏。", "Do not show win prompt after 2048; continue automatically."],
    ["打开色板页面", "Open Palette Page"],
    ["色板编辑已迁移到独立页面。", "Palette editing has moved to a standalone page."],
    ["通知按钮", "Announcements"],
    ["提示文本", "Guide"],
    ["展开计时器", "Toggle Timers"],
    ["界面语言", "Language"],
    ["中文", "Chinese"],
    ["模式", "Modes"],
    ["新局", "New"],
    ["计时", "Timers"],
    ["首页", "Home"],
    ["设置", "Settings"],
    ["历史", "History"],
    ["统计", "Stats"],
    ["导出", "Export"],
    ["回放", "Replay"],
    ["撤回", "Undo"]
  ];

  function buildMaps() {
    var seen = {};
    for (var i = 0; i < PHRASES.length; i += 1) {
      var zh = PHRASES[i][0];
      var en = PHRASES[i][1];
      if (!zh || !en) continue;
      zhToEn[zh] = en;
      if (!seen[en]) {
        enToZh[en] = zh;
        seen[en] = true;
      }
    }
    for (var j = 0; j < EXTRA_PHRASES.length; j += 1) {
      var extZh = EXTRA_PHRASES[j][0];
      var extEn = EXTRA_PHRASES[j][1];
      if (!extZh || !extEn) continue;
      zhToEn[extZh] = extEn;
      if (!seen[extEn]) {
        enToZh[extEn] = extZh;
        seen[extEn] = true;
      }
    }
    sortedZh = Object.keys(zhToEn).sort(function (a, b) { return b.length - a.length; });
    sortedEn = Object.keys(enToZh).sort(function (a, b) { return b.length - a.length; });
  }

  function normalizeLang(value) {
    var raw = String(value || "").toLowerCase().trim();
    if (raw.indexOf("en") === 0) return "en";
    if (raw.indexOf("zh") === 0) return "zh";
    return DEFAULT_LANG;
  }

  function readLanguage() {
    try {
      var saved = global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null;
      if (saved) return normalizeLang(saved);
    } catch (_e1) {}
    return DEFAULT_LANG;
  }

  function saveLanguage(lang) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, lang);
    } catch (_e2) {}
  }

  function translateCore(text, lang) {
    var out = String(text == null ? "" : text);
    var keys = lang === "en" ? sortedZh : sortedEn;
    var dict = lang === "en" ? zhToEn : enToZh;
    for (var i = 0; i < keys.length; i += 1) {
      out = out.split(keys[i]).join(dict[keys[i]]);
    }
    return out;
  }

  function translateDynamic(text, lang) {
    var out = String(text || "");
    if (lang === "en") {
      out = out.replace(/^4率\s*[:：]?\s*/u, "4-Rate: ");
      out = out.replace(/^总步数\s*[:：]?\s*/u, "Total Moves: ");
      out = out.replace(/^移动步数\s*[:：]?\s*/u, "Move Count: ");
      out = out.replace(/^撤回步数\s*[:：]?\s*/u, "Undo Count: ");
      out = out.replace(/^总分\s*[:：]?\s*/u, "Total Score: ");
      out = out.replace(/实际出4率/gu, "Actual 4-Rate");
      out = out.replace(/出2数量/gu, "2 Spawns");
      out = out.replace(/出4数量/gu, "4 Spawns");
      out = out.replace(/^步骤\s*(\d+)\s*\/\s*(\d+)$/u, "Step $1 / $2");
      out = out.replace(/^第\s*(\d+)\s*\/\s*(\d+)\s*页$/u, "Page $1 / $2");
      out = out.replace(/^共\s*(\d+)\s*条\s*·\s*第\s*(\d+)\/(\d+)\s*页$/u, "Total $1 · Page $2/$3");
      out = out.replace(/([+-]?\d+)\s*步/gu, "$1 steps");
      out = out.replace(/（4率\s*([0-9]+(?:\.[0-9]+)?)%）/gu, " (4-Rate $1%)");
      out = out.replace(/^已导入\s*(\d+)\s*个色板。$/u, "Imported $1 palette(s).");
      out = out.replace(/^已导入\s*(\d+)\s*个色板，部分名称已自动重命名。$/u, "Imported $1 palette(s); duplicate names were renamed.");
      out = out.replace(/（可Undo）/gu, "(Undo)");
      out = out.replace(/（无Undo）/gu, "(No Undo)");
      out = out.replace(/（可撤回）/gu, "(Undo)");
      out = out.replace(/（无撤回）/gu, "(No Undo)");
      out = out.replace(/（2048，无Undo）/gu, "(2048, No Undo)");
      out = out.replace(/限次撤回\s*（\s*(\d+)\s*次\s*）/gu, "Limited Undo ($1)");
      out = out.replace(/连击加分/gu, "Combo Scoring");
      out = out.replace(/方向锁/gu, "Direction Lock");
      out = out.replace(/障碍块/gu, "Obstacle Blocks");
      out = out.replace(/概率\s*50\/50/gu, "Spawn 50/50");
      out = out.replace(/版/gu, "");
      out = out.replace(/无Undo/gu, "No Undo");
      out = out.replace(/可Undo/gu, "Undo");
      out = out.replace(/2幂/gu, "Powers of 2");
      out = out.replace(/封顶/gu, "Capped");
    } else {
      out = out.replace(/^4-Rate\s*[:：]?\s*/u, "4率: ");
      out = out.replace(/^Total Moves\s*[:：]?\s*/u, "总步数: ");
      out = out.replace(/^Move Count\s*[:：]?\s*/u, "移动步数: ");
      out = out.replace(/^Undo Count\s*[:：]?\s*/u, "撤回步数: ");
      out = out.replace(/^Total Score\s*[:：]?\s*/u, "总分: ");
      out = out.replace(/Actual 4-Rate/gu, "实际出4率");
      out = out.replace(/2 Spawns/gu, "出2数量");
      out = out.replace(/4 Spawns/gu, "出4数量");
      out = out.replace(/^Step\s*(\d+)\s*\/\s*(\d+)$/u, "步骤 $1 / $2");
      out = out.replace(/^Page\s*(\d+)\s*\/\s*(\d+)$/u, "第 $1 / $2 页");
      out = out.replace(/^Total\s*(\d+)\s*·\s*Page\s*(\d+)\/(\d+)$/u, "共 $1 条 · 第 $2/$3 页");
      out = out.replace(/([+-]?\d+)\s*steps/gu, "$1 步");
      out = out.replace(/\(4-Rate\s*([0-9]+(?:\.[0-9]+)?)%\)/gu, "（4率 $1%）");
      out = out.replace(/Limited Undo\s*\(\s*(\d+)\s*\)/gu, "限次撤回（$1次）");
      out = out.replace(/Combo Scoring/gu, "连击加分");
      out = out.replace(/Direction Lock/gu, "方向锁");
      out = out.replace(/Obstacle Blocks/gu, "障碍块");
      out = out.replace(/Spawn\s*50\/50/gu, "概率50/50");
    }
    return out;
  }

  function translateText(text, lang) {
    var src = String(text == null ? "" : text);
    if (!src.trim()) return src;
    var lead = (src.match(/^\s*/u) || [""])[0];
    var tail = (src.match(/\s*$/u) || [""])[0];
    var core = src.trim();
    core = translateCore(core, lang);
    core = translateDynamic(core, lang);
    return lead + core + tail;
  }

  function applyFixed(lang) {
    for (var i = 0; i < FIXED_SELECTOR_TEXT.length; i += 1) {
      var item = FIXED_SELECTOR_TEXT[i];
      var nodes = global.document.querySelectorAll(item.s);
      for (var j = 0; j < nodes.length; j += 1) nodes[j].textContent = lang === "en" ? item.en : item.zh;
    }
    for (var k = 0; k < FIXED_SELECTOR_ATTR.length; k += 1) {
      var ai = FIXED_SELECTOR_ATTR[k];
      var attrNodes = global.document.querySelectorAll(ai.s);
      for (var m = 0; m < attrNodes.length; m += 1) attrNodes[m].setAttribute(ai.a, lang === "en" ? ai.en : ai.zh);
    }
  }

  function applyThemeOptions(lang) {
    var options = global.document.querySelectorAll("#theme-select-options .custom-option");
    for (var i = 0; i < options.length; i += 1) {
      var option = options[i];
      if (option.dataset && !option.dataset.labelZh) option.dataset.labelZh = option.textContent || "";
      var id = option.dataset ? option.dataset.value : "";
      if (lang === "en" && id && THEME_LABELS[id]) option.textContent = THEME_LABELS[id];
      else if (lang === "zh" && option.dataset && option.dataset.labelZh) option.textContent = option.dataset.labelZh;
      else option.textContent = translateText(option.textContent, lang);
    }
    var select = global.document.getElementById("theme-select");
    if (!select || !select.options) return;
    for (var j = 0; j < select.options.length; j += 1) {
      var op = select.options[j];
      if (op.dataset && !op.dataset.labelZh) op.dataset.labelZh = op.textContent || "";
      if (lang === "en" && THEME_LABELS[op.value]) op.textContent = THEME_LABELS[op.value];
      else if (lang === "zh" && op.dataset && op.dataset.labelZh) op.textContent = op.dataset.labelZh;
      else op.textContent = translateText(op.textContent, lang);
    }
  }

  function applyModeButtons(lang) {
    var buttons = global.document.querySelectorAll("body[data-page='modes'] .mode-hub-btn");
    for (var i = 0; i < buttons.length; i += 1) {
      var btn = buttons[i];
      if (btn.dataset && !btn.dataset.labelZh) btn.dataset.labelZh = btn.textContent || "";
      var href = String(btn.getAttribute("href") || "");
      var match = href.match(/[?&]mode_key=([^&]+)/);
      if (match && lang === "en") {
        var key = "";
        try { key = decodeURIComponent(match[1] || ""); } catch (_e3) { key = match[1] || ""; }
        if (MODE_KEY_LABELS[key]) { btn.textContent = MODE_KEY_LABELS[key]; continue; }
      }
      if (lang === "zh" && btn.dataset && btn.dataset.labelZh) btn.textContent = btn.dataset.labelZh;
      else btn.textContent = translateText(btn.textContent, lang);
    }
  }

  function setTextIfChanged(node, text) {
    if (!node) return;
    var next = String(text == null ? "" : text);
    if (node.textContent !== next) node.textContent = next;
  }

  function setHtmlIfChanged(node, html) {
    if (!node) return;
    var next = String(html == null ? "" : html);
    if (node.innerHTML !== next) node.innerHTML = next;
  }

  function setHtmlIfChangedByLang(node, lang, zhHtml, enHtml) {
    if (!node) return;
    var safeLang = lang === "en" ? "en" : "zh";
    var next = safeLang === "en" ? String(enHtml == null ? "" : enHtml) : String(zhHtml == null ? "" : zhHtml);
    var data = node.dataset || null;
    if (data && data.i18nHtmlLang === safeLang && node.innerHTML === next) return;
    if (node.innerHTML !== next) node.innerHTML = next;
    if (data) data.i18nHtmlLang = safeLang;
  }

  function applyPalettePageText(lang) {
    if (!global.document.body || global.document.body.getAttribute("data-page") !== "palette-hub") return;
    var copy = lang === "en"
      ? {
          title: "Palette Center",
          subtitle: "Manage tile and timer-legend colors with import/export and live preview.",
          listTitle: "Palette List",
          currentName: "Current Palette",
          create: "New Copy",
          rename: "Rename",
          remove: "Delete",
          exportLabel: "Export",
          importLabel: "Import",
          navHome: "Home",
          navAccount: "Account",
          navPractice: "Practice",
          standard16: "Standard 16 Colors",
          fib16: "Fibonacci 16 Colors",
          livePreview: "Live Preview",
          standard: "Standard",
          fibonacci: "Fibonacci",
          timerLegend: "Timer Legend",
          namePlaceholder: "Palette name",
          custom: "Custom",
          current: "Current"
        }
      : {
          title: "色板中心",
          subtitle: "独立管理砖块与计时图例配色，支持导入导出与实时预览。",
          listTitle: "色板列表",
          empty: "未选择色板",
          create: "新建副本",
          rename: "重命名",
          remove: "删除",
          exportLabel: "导出",
          importLabel: "导入",
          navHome: "回首页",
          navAccount: "账号中心",
          navPractice: "练习板",
          standard16: "标准 16 色",
          fib16: "斐波那契 16 色",
          livePreview: "实时预览",
          standard: "标准",
          fibonacci: "斐波那契",
          timerLegend: "计时图例",
          namePlaceholder: "输入色板名称",
          custom: "自定义",
          current: "当前"
        };
    if (!copy.currentName) copy.currentName = lang === "en" ? "Current Palette" : "当前色板";
    var direct = [
      [".palette-title", copy.title],
      [".palette-subtitle", copy.subtitle],
      [".palette-sidebar .panel-head h2", copy.listTitle],
      ["#palette-create-btn", copy.create],
      ["#palette-rename-btn", copy.rename],
      ["#palette-delete-btn", copy.remove],
      ["#palette-export-btn", copy.exportLabel],
      ["#palette-import-btn", copy.importLabel]
    ];
    for (var i = 0; i < direct.length; i += 1) {
      var item = direct[i];
      var node = global.document.querySelector(item[0]);
      if (node) node.textContent = item[1];
    }
    var currentName = global.document.getElementById("palette-current-name");
    if (currentName && currentName.getAttribute("data-palette-name-bound") !== "1") {
      currentName.textContent = copy.currentName;
    }
    var nav = global.document.querySelectorAll(".palette-nav .palette-nav-btn");
    for (var n = 0; n < nav.length; n += 1) {
      var link = nav[n];
      var href = String(link.getAttribute("href") || "").toLowerCase();
      if (href.indexOf("index.html") >= 0) {
        link.textContent = copy.navHome;
      } else if (href.indexOf("account.html") >= 0) {
        link.textContent = copy.navAccount;
      } else if (href.indexOf("practice_board.html") >= 0) {
        link.textContent = copy.navPractice;
      }
    }
    var heads = global.document.querySelectorAll(".color-panel-head");
    if (heads[0]) heads[0].textContent = copy.standard16;
    if (heads[1]) heads[1].textContent = copy.fib16;
    if (heads[2]) heads[2].textContent = copy.livePreview;
    var previewTitles = global.document.querySelectorAll(".preview-group h3");
    if (previewTitles[0]) previewTitles[0].textContent = copy.standard;
    if (previewTitles[1]) previewTitles[1].textContent = copy.fibonacci;
    if (previewTitles[2]) previewTitles[2].textContent = copy.timerLegend;
    var input = global.document.getElementById("palette-name-input");
    if (input) input.setAttribute("placeholder", copy.namePlaceholder);
    var list = global.document.getElementById("palette-list");
    if (list) {
      var custom = list.querySelectorAll(".palette-chip.custom");
      for (var c = 0; c < custom.length; c += 1) custom[c].textContent = copy.custom;
      var chips = list.querySelectorAll(".palette-chip.current");
      for (var k = 0; k < chips.length; k += 1) chips[k].textContent = copy.current;
    }
  }

  function applyPageSpecificText(lang) {
    var page = String((global.location && global.location.pathname) || "").split("/").pop() || "index.html";
    page = page.toLowerCase();
    if (page === "index.html") {
      var indexCopyZh = "项目由Gemini和Codex基于几个项目整合改版，开源在<a href=\"https://github.com/jieChris/2048-next\" target=\"_blank\">GitHub</a>。原作者 <a href=\"http://gabrielecirulli.com\" target=\"_blank\">Gabriele Cirulli.</a> 基于 <a href=\"https://itunes.apple.com/us/app/1024!/id823499224\" target=\"_blank\">Veewo Studio 的 1024</a> 且概念受 <a href=\"http://asherv.com/threes/\" target=\"_blank\">Asher Vollmer 的 Threes</a> 启发。撤销 Mod 由 <a href=\"http://quaxio.com/\">Alok Menghrajani</a> 制作，<a href=\"https://github.com/gabrielecirulli/2048\">源代码</a>。项目改自<a href=\"https://github.com/gabrielecirulli/2048\">2048</a>。计时器参考<a href=\"https://github.com/neiunderscore/2048-timer?tab=readme-ov-file\">2048-timer</a>。";
      var indexCopyEn = "Project fork adapted with Gemini and Codex, open sourced on <a href=\"https://github.com/jieChris/2048-next\" target=\"_blank\">GitHub</a>. Original game by <a href=\"http://gabrielecirulli.com\" target=\"_blank\">Gabriele Cirulli</a>, based on <a href=\"https://itunes.apple.com/us/app/1024!/id823499224\" target=\"_blank\">1024 by Veewo Studio</a> and inspired by <a href=\"http://asherv.com/threes/\" target=\"_blank\">Threes by Asher Vollmer</a>. Undo mod by <a href=\"http://quaxio.com/\">Alok Menghrajani</a>, source at <a href=\"https://github.com/gabrielecirulli/2048\">GitHub</a>. Timer reference: <a href=\"https://github.com/neiunderscore/2048-timer?tab=readme-ov-file\">2048-timer</a>.";
      var leaderboardZh = "推荐具有排行榜功能的<a href=\"https://www.2048verse.com\" target=\"_blank\" rel=\"noopener noreferrer\">2048verse</a>";
      var leaderboardEn = "Recommended leaderboard site: <a href=\"https://www.2048verse.com\" target=\"_blank\" rel=\"noopener noreferrer\">2048verse</a>";
      var intro = global.document.querySelector(".game-intro");
      if (intro) {
        setTextIfChanged(intro, lang === "en"
          ? "Create the 2048 tile! This page has no undo."
          : "合并数字，合成 2048 方块！ 本页为无撤回版。");
      }
      var exp = global.document.querySelector(".game-explanation");
      if (exp) {
        setTextIfChanged(exp, lang === "en"
          ? "How to play: use Arrow keys, WASD, or KHJL to move tiles. Undo is disabled on this page. Press R to restart. When two equal tiles touch, they merge into one."
          : "玩法说明： 使用 方向键、WASD、KHJL 移动方块。本页不支持撤回，按 R 键重开游戏。当两个相同数字的方块接触时，它们会 合并成一个！");
      }
      var copy = global.document.querySelectorAll(".mobile-hide-project-copy");
      if (copy[0]) {
        setHtmlIfChangedByLang(copy[0], lang, indexCopyZh, indexCopyEn);
      }
      if (copy[1]) setTextIfChanged(copy[1], lang === "en" ? "Join the 2048 community group: 94064339" : "欢迎加入中国第一2048交流群：94064339");
      if (copy[2]) {
        setHtmlIfChangedByLang(copy[2], lang, leaderboardZh, leaderboardEn);
      }
    }
    if (page === "undo_2048.html") {
      var undoIntro = global.document.querySelector(".game-intro");
      if (undoIntro) {
        setTextIfChanged(undoIntro, lang === "en"
          ? "Merge numbers to create the 2048 tile! Press Z to undo."
          : "合并数字，合成 2048 方块！ 按 Z 可撤销。");
      }
      var undoExp = global.document.querySelector(".game-explanation");
      if (undoExp) {
        setTextIfChanged(undoExp, lang === "en"
          ? "How to play: use Arrow keys, WASD, or KHJL to move tiles. Press Z to undo and R to restart. When two equal tiles touch, they merge into one."
          : "玩法说明： 使用 方向键、WASD、KHJL 移动方块，按 Z 键撤回上一步，按 R 键重开游戏。当两个相同数字的方块接触时，它们会 合并成一个！");
      }
    }
  }

  function isIgnorableMutationTarget(target) {
    var node = target && target.nodeType === 3 ? target.parentElement : target;
    if (!node || typeof node.closest !== "function") return false;
    return !!node.closest(
      ".tile-container, .grid-container, .score-container, .best-container, #timer, .timer-container, .timer-box, .timer-list, .timer-row, .timer-entry"
    );
  }

  function shouldIgnoreMutations(mutations) {
    if (!mutations || !mutations.length) return false;
    for (var i = 0; i < mutations.length; i += 1) {
      if (!isIgnorableMutationTarget(mutations[i] && mutations[i].target)) return false;
    }
    return true;
  }

  function translateAttrs(lang) {
    var attrs = ["title", "placeholder", "aria-label"];
    var nodes = global.document.querySelectorAll("[title],[placeholder],[aria-label]");
    for (var i = 0; i < nodes.length; i += 1) {
      for (var j = 0; j < attrs.length; j += 1) {
        var name = attrs[j];
        var raw = nodes[i].getAttribute(name);
        if (!raw) continue;
        var next = translateText(raw, lang);
        if (next !== raw) nodes[i].setAttribute(name, next);
      }
    }
  }

  function translateInputValues(lang) {
    var nodes = global.document.querySelectorAll("input[type='button'],input[type='submit'],input[type='reset']");
    for (var i = 0; i < nodes.length; i += 1) {
      var raw = nodes[i].value;
      if (!raw) continue;
      var next = translateText(raw, lang);
      if (next !== raw) nodes[i].value = next;
    }
  }

  function translateTextNodes(lang) {
    if (!global.NodeFilter || !global.document.body) return;
    var walker = global.document.createTreeWalker(global.document.body, global.NodeFilter.SHOW_TEXT, null);
    var node = walker.nextNode();
    while (node) {
      if (
        node.parentElement &&
        !node.parentElement.closest(".tile-container") &&
        ["script", "style", "textarea", "pre", "code"].indexOf(String(node.parentElement.tagName || "").toLowerCase()) < 0
      ) {
        var next = translateText(node.nodeValue, lang);
        if (next !== node.nodeValue) node.nodeValue = next;
      }
      node = walker.nextNode();
    }
  }

  function resolveLanguageFromSelect(select) {
    if (!select) return readLanguage();
    var rawValue = String(select.value || "").trim();
    var byValue = normalizeLang(rawValue);
    if (rawValue && (rawValue.toLowerCase().indexOf("en") === 0 || rawValue.toLowerCase().indexOf("zh") === 0)) {
      return byValue;
    }
    var idx = Number(select.selectedIndex);
    var selected = idx >= 0 && select.options && select.options[idx] ? select.options[idx] : null;
    var optionValue = selected ? String(selected.value || "").trim() : "";
    if (optionValue) {
      var optionNorm = normalizeLang(optionValue);
      if (optionValue.toLowerCase().indexOf("en") === 0 || optionValue.toLowerCase().indexOf("zh") === 0) return optionNorm;
    }
    var text = selected ? String(selected.textContent || "").trim().toLowerCase() : rawValue.toLowerCase();
    if (text.indexOf("english") >= 0 || text.indexOf("英文") >= 0) return "en";
    if (text.indexOf("chinese") >= 0 || text.indexOf("中文") >= 0 || text.indexOf("汉语") >= 0) return "zh";
    return byValue;
  }

  function resolveLanguageFromToggle(toggle) {
    if (!toggle) return readLanguage();
    return toggle.checked ? "en" : "zh";
  }

  function ensureLanguageRow(lang) {
    var modal = global.document.querySelector("#settings-modal .settings-modal-content");
    if (!modal) return;
    var row = global.document.getElementById("ui-language-settings-row");
    var label = global.document.getElementById("ui-language-label");
    var toggle = global.document.getElementById("ui-language-toggle");
    var thumb = global.document.getElementById("ui-language-toggle-thumb");
    if (!row) {
      row = global.document.createElement("div");
      row.id = "ui-language-settings-row";
      row.className = "settings-row settings-toggle-row language-settings-row";
      row.innerHTML =
        '<div class="settings-toggle-main language-toggle-main">' +
        '  <div class="settings-toggle-copy">' +
        '    <div id="ui-language-label" class="settings-toggle-title"></div>' +
        '    <div id="ui-language-desc" class="settings-toggle-desc"></div>' +
        '  </div>' +
        '  <label class="settings-switch language-settings-switch">' +
        '    <input id="ui-language-toggle" type="checkbox" role="switch">' +
        '    <span class="settings-switch-slider language-switch-slider"></span>' +
        '    <span id="ui-language-toggle-thumb" class="language-switch-thumb">\u4e2d</span>' +
        '  </label>' +
        '</div>';
      var actions = modal.querySelector(".replay-modal-actions");
      if (actions && actions.parentNode && typeof actions.parentNode.insertBefore === "function") {
        actions.parentNode.insertBefore(row, actions);
      } else {
        modal.appendChild(row);
      }
      label = global.document.getElementById("ui-language-label");
      toggle = global.document.getElementById("ui-language-toggle");
      thumb = global.document.getElementById("ui-language-toggle-thumb");
    }
    if (!label || !toggle || !thumb) return;
    var desc = global.document.getElementById("ui-language-desc");
    label.textContent = lang === "en" ? "Language" : "\u754c\u9762\u8bed\u8a00";
    if (desc) desc.textContent = lang === "en" ? "Switch page language." : "\u9875\u9762\u4e2d\u82f1\u6587\u5207\u6362";
    toggle.setAttribute("aria-label", lang === "en" ? "Language" : "\u754c\u9762\u8bed\u8a00");
    var isLocked = isLanguageSelectLocked();
    if (!toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      var beginToggleInteraction = function () {
        lockLanguageSelect(1800);
      };
      var commitToggleLanguage = function () {
        lockLanguageSelect(320);
        var nextLang = resolveLanguageFromToggle(toggle);
        if (nextLang === currentLang) return;
        setLanguage(nextLang, true);
      };
      var onToggleChange = function () {
        beginToggleInteraction();
        if (typeof global.setTimeout === "function") {
          global.setTimeout(commitToggleLanguage, 0);
          return;
        }
        commitToggleLanguage();
      };
      toggle.addEventListener("pointerdown", beginToggleInteraction);
      toggle.addEventListener("touchstart", beginToggleInteraction);
      toggle.addEventListener("mousedown", beginToggleInteraction);
      toggle.addEventListener("focus", beginToggleInteraction);
      toggle.addEventListener("change", onToggleChange);
      toggle.addEventListener("input", onToggleChange);
    }
    if (!isLocked) {
      toggle.checked = lang === "en";
      thumb.textContent = lang === "en" ? "En" : "\u4e2d";
    }
  }

  function patchDialogs() {
    if (dialogPatched) return;
    dialogPatched = true;
    originalAlert = typeof global.alert === "function" ? global.alert.bind(global) : null;
    originalConfirm = typeof global.confirm === "function" ? global.confirm.bind(global) : null;
    originalPrompt = typeof global.prompt === "function" ? global.prompt.bind(global) : null;
    global.alert = function (message) {
      var text = translateText(message, currentLang || readLanguage());
      return originalAlert ? originalAlert(text) : undefined;
    };
    global.confirm = function (message) {
      var text = translateText(message, currentLang || readLanguage());
      return originalConfirm ? originalConfirm(text) : true;
    };
    global.prompt = function (message, value) {
      var text = translateText(message, currentLang || readLanguage());
      return originalPrompt ? originalPrompt(text, value) : (value || "");
    };
  }

  function applyTitle(lang) {
    var path = String((global.location && global.location.pathname) || "");
    var name = (path.split("/").pop() || "index.html").toLowerCase();
    var map = PAGE_TITLE_MAP[name];
    if (map) global.document.title = lang === "en" ? map.en : map.zh;
  }

  function applyLanguage(lang) {
    if (applying) return;
    applying = true;
    try {
      var safe = normalizeLang(lang);
      currentLang = safe;
      global.document.documentElement.setAttribute("lang", safe === "en" ? "en" : "zh-CN");
      global.document.documentElement.setAttribute("data-ui-lang", safe);
      ensureLanguageRow(safe);
      applyTitle(safe);
      applyFixed(safe);
      applyThemeOptions(safe);
      applyModeButtons(safe);
      applyPalettePageText(safe);
      applyPageSpecificText(safe);
      translateAttrs(safe);
      translateInputValues(safe);
      translateTextNodes(safe);
      patchDialogs();
    } finally {
      applying = false;
    }
  }

  function scheduleApply() {
    if (isLanguageSelectLocked()) return;
    if (refreshTimer) global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(function () {
      refreshTimer = 0;
      applyLanguage(currentLang || readLanguage());
    }, 30);
  }

  function setLanguage(lang, persist) {
    var safe = normalizeLang(lang);
    if (persist !== false) saveLanguage(safe);
    applyLanguage(safe);
    try {
      global.dispatchEvent(new global.CustomEvent("uilanguagechange", { detail: { lang: safe } }));
    } catch (_e4) {}
    if (typeof global.setTimeout === "function") {
      global.setTimeout(function () {
        applyLanguage(safe);
      }, 120);
      global.setTimeout(function () {
        applyLanguage(safe);
      }, 360);
    }
  }

  function init() {
    buildMaps();
    setLanguage(readLanguage(), false);
    if (!observer && global.MutationObserver && global.document.body) {
      observer = new global.MutationObserver(function (mutations) {
        if (applying) return;
        if (isLanguageSelectLocked()) return;
        if (shouldIgnoreMutations(mutations)) return;
        scheduleApply();
      });
      observer.observe(global.document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["title", "placeholder", "aria-label"]
      });
    }
  }

  global.UII18N = {
    getLanguage: function () { return currentLang || readLanguage(); },
    setLanguage: function (lang) { setLanguage(lang, true); },
    refresh: function () { scheduleApply(); },
    translateText: function (text) { return translateText(text, currentLang || readLanguage()); }
  };

  if (global.document.readyState === "loading") global.document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : undefined);
