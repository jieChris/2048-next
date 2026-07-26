export type PolicyLocale = "zh-CN" | "en";
export type PolicyKind = "privacy" | "terms";

export interface PolicySection {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
}

export interface PolicyDocument {
  readonly title: string;
  readonly shortTitle: string;
  readonly intro: string;
  readonly sections: readonly PolicySection[];
}

export const POLICY_BUNDLE_VERSION = "2026-08-01.1" as const;
export const POLICY_CONSENT_VERSION = "2026-08-01" as const;
export const POLICY_EFFECTIVE_DATE = "2026-08-01" as const;
export const POLICY_APPROVAL_BLOCKERS = [] as const;

const PRIVACY_ZH: PolicyDocument = {
  title: "2048 NEXT 隐私政策",
  shortTitle: "隐私政策",
  intro: "本政策说明 2048 NEXT 网页版与 Android App 在本地离线体验、账号联网功能、游戏记录、排行榜、成就和稳定性诊断中如何处理信息。本版本已经运营者批准，自 2026 年 8 月 1 日起生效。",
  sections: [
    {
      title: "一、适用范围与基本原则",
      paragraphs: [
        "本政策适用于 2048 NEXT 网页版与 Android App。2048-ranked 是独立产品，不属于本政策所述的 2048 NEXT 页面范围；两者仅可能共用同一账号后端。",
        "我们坚持最小必要、目的明确和本地优先。游客标准 4×4、未结束对局、本机游客历史、外观、语言、音效、触觉和背景音乐设置可以只在设备本地运行。未同意联网前，App 不发起业务网络请求，也不上传诊断。",
      ],
    },
    {
      title: "二、设备本地处理的信息",
      paragraphs: [
        "以下信息保存在浏览器或 App 私有空间，用于离线运行和恢复，不会因登录而自动上传游客历史：",
      ],
      items: [
        "未结束对局的棋盘、模式、分数、步数、计时、撤回状态、随机种子和回放进度；未结束对局不跨设备同步。",
        "游客已结束记录及回放、本机账号记录缓存、云历史与成就的有限离线快照。",
        "外观、语言、短音效、触觉、背景音乐、自动诊断开关，以及隐私选择的版本和时间。",
        "严重错误的有界本地诊断记录。仅在同意联网且自动诊断开启时，符合白名单的事件才可上传；离线期间产生的事件以后也不会追传。",
        "账号 Token、用户标识和排位挑战凭据保存在 Android 安全存储中，不写入普通 localStorage、游戏数据库、日志、诊断或分享文件。",
      ],
    },
    {
      title: "三、使用联网功能时处理的信息",
      paragraphs: [
        "当你主动同意联网并使用账号或在线功能时，我们可能处理以下信息：",
      ],
      items: [
        "账号信息：邮箱、昵称、不可逆密码哈希、账号状态、注册时间，以及删除申请时间和截止时间。服务器不保存明文密码。",
        "邮箱验证信息：注册或重置密码验证码的哈希、用途、有效期、尝试次数和请求 IP。验证码默认有效 10 分钟并仅可使用一次。",
        "游戏与同步信息：模式、分数、用时、步数、最大方块、盘面摘要、结束原因、回放、排位会话、记录来源、排行榜名次和成就。服务器会验证回放和排位凭据，不直接信任客户端成绩。",
        "网络与安全信息：IP 地址、请求时间、请求 ID、限流与安全审计所需的最小技术信息。我们不以此建立广告画像。",
        "稳定性诊断：事件类别、严重级别、发生时间、错误类型、脱敏堆栈、App 版本、构建号、Android 版本和 WebView 版本。诊断不包含邮箱、昵称、Token、用户 ID、棋盘、回放、移动序列、广告 ID或设备唯一标识。",
      ],
    },
    {
      title: "四、处理目的",
      paragraphs: [
        "我们仅为提供账号、邮箱验证、云历史、回放、排位校验、排行榜、成就、账号删除、安全防护、故障定位和必要运维而处理上述信息。不会出售个人信息，不接入广告归因、页面点击分析或游戏行为分析 SDK。",
      ],
    },
    {
      title: "五、Android 权限与设备能力",
      paragraphs: [
        "首版 Android App 仅申请 INTERNET 网络权限。触觉反馈通过 Android 系统 View 触觉能力执行并遵守系统设置，不申请振动权限。App 不申请通知、外部存储、位置、通讯录、相机、麦克风或后台常驻权限。回放和诊断导出使用 App 缓存与系统分享面板，完成后删除临时文件。",
      ],
    },
    {
      title: "六、外部服务提供方",
      paragraphs: [
        "为完成必要服务，部分信息会由受约束的服务提供方处理：",
      ],
      items: [
        "Resend：用于发送注册和密码重置邮件，会接收收件邮箱、验证码、用途和有效期。",
        "Cloudflare：网站可能使用其 DNS、CDN、WAF 等网络安全与加速能力；网页版注册或密码重置页面可能使用 Turnstile 人机验证并处理必要的网络与浏览器信号。Android App 的公开账号流程不嵌入 Turnstile。",
        "服务器托管与备份：账号、游戏数据库和回放由 2048-game-api 的受控 PostgreSQL 与服务器私有存储处理。生产主服务器由 Color Cross 提供，位于美国芝加哥；后端服务器备份保存在华为云中国大陆上海区域。",
        "个人信息出境：当你选择“同意并继续”并使用联网功能时，第三节所列、为相应功能所必需的信息会传输至美国芝加哥的生产主服务器处理。该选择同时表示你已阅读本政策，并单独同意上述个人信息出境处理。你可以拒绝并选择仅离线体验；拒绝不会影响游客标准 4×4 和其他本地功能。",
      ],
    },
    {
      title: "七、保存期限与删除",
      items: [
        "本地数据保留至你在 App 内删除、退出账号时触发账号本地清理、清除应用数据或卸载 App。游客数据与账号数据相互隔离。",
        "账号资料、云记录、回放、排行榜和成就原则上保留至你删除相关记录、申请删除账号或服务不再需要这些数据。",
        "云记录删除后进入 3 天恢复期，期间可恢复；到期后从权威记录和相关派生数据中清理。",
        "账号删除申请有 72 小时冷静期。期间使用邮箱和密码登录会取消删除；到期后即使清理任务尚未执行也不能登录或恢复，随后彻底删除账号及游戏数据。",
        "匿名客户端严重错误诊断默认保留不超过 30 天。",
        "安全或法律义务要求的最小审计信息仅在必要期限内保留，不用于恢复已删除的玩家数据。",
      ],
      paragraphs: [],
    },
    {
      title: "八、你的权利与控制方式",
      items: [
        "可以选择仅离线体验，并在设置中关闭自动诊断、短音效、触觉或背景音乐。",
        "可以查看账号资料、云历史、排行榜和成就，并删除或在期限内恢复云记录。",
        "可以从 App 或公开账号删除网页申请删除账号；公开网页无需安装 App。",
        "可以导出本地诊断或已结算回放。导出内容不包含账号凭据。",
        "可以通过正式政策列明的联系渠道请求访问、更正、删除或解释个人信息处理。",
      ],
      paragraphs: [],
    },
    {
      title: "九、未成年人",
      paragraphs: [
        "2048 NEXT 不以未满 14 周岁的儿童为主要服务对象。未满 14 周岁的用户应在监护人同意和指导下使用联网账号功能；如监护人发现未经同意处理了儿童信息，可通过正式联系渠道请求处理。",
      ],
    },
    {
      title: "十、安全、变更与联系我们",
      paragraphs: [
        "我们采用 HTTPS、密码哈希、Android Keystore、Token 版本撤销、权限最小化、回放验证、访问控制、速率限制和数据隔离等措施。任何系统均无法保证绝对安全；发生影响你权益的安全事件时，我们会依法采取补救与通知措施。",
        "只有处理目的、信息范围、共享对象或权利规则发生实质变化时，App 才会在下一次联网前重新请求确认。普通排版或说明更新不会反复打断用户。",
        "2048 NEXT 由自然人王世杰运营，政策与协议内容责任人为王世杰，联系邮箱为 1203214493@qq.com。你可以通过该邮箱请求访问、更正、删除或解释个人信息处理。",
      ],
    },
  ],
};

const PRIVACY_EN: PolicyDocument = {
  title: "2048 NEXT Privacy Policy",
  shortTitle: "Privacy Policy",
  intro: "This policy explains how the 2048 NEXT website and Android App handle information for offline play, account features, game records, leaderboards, achievements, and stability diagnostics. The operator has approved this version, effective August 1, 2026.",
  sections: [
    {
      title: "1. Scope and principles",
      paragraphs: [
        "This policy covers the 2048 NEXT website and Android App. 2048-ranked is a separate product and is not part of the 2048 NEXT interface covered here, although both products may use the same account backend.",
        "We use data minimization, specific purposes, and local-first operation. Guest Standard 4×4, unfinished games, local guest history, appearance, language, sound, haptics, and music can remain entirely on the device. Before online consent, the App makes no business network request and uploads no diagnostic.",
      ],
    },
    {
      title: "2. Information processed on the device",
      paragraphs: ["The following information is stored in the browser or private App storage for offline operation and recovery. Guest history is not automatically uploaded after sign-in:"],
      items: [
        "Unfinished board state, mode, score, moves, elapsed time, undo state, random seed, and replay progress. Unfinished games are not synchronized across devices.",
        "Completed guest records and replays, limited account record caches, and limited offline snapshots of cloud history and achievements.",
        "Appearance, language, short sound, haptic, background music, automatic diagnostic settings, and the version and time of the privacy choice.",
        "A bounded local ring of serious-error diagnostics. Only whitelisted events created while online consent and automatic diagnostics are both enabled may upload. Offline-created events are never uploaded later.",
        "Account tokens, user references, and ranked challenge credentials are stored in Android secure storage, not ordinary localStorage, the game database, logs, diagnostics, or shared files.",
      ],
    },
    {
      title: "3. Information processed for online features",
      paragraphs: ["When you consent to online access and use account or network features, we may process:"],
      items: [
        "Account data: email, nickname, irreversible password hash, account state, registration time, and account-deletion request and deadline. Plaintext passwords are not stored.",
        "Email verification data: a hash of the registration or password-reset code, purpose, expiry, attempt count, and request IP. Codes are valid for 10 minutes by default and can be used once.",
        "Game and synchronization data: mode, score, duration, steps, maximum tile, board summary, end reason, replay, ranked session, record source, leaderboard rank, and achievements. The server verifies replays and ranked credentials rather than trusting client scores.",
        "Network and security data: IP address, request time, request ID, and minimum details required for rate limiting and security auditing. These are not used for advertising profiles.",
        "Stability diagnostics: event category, severity, time, error type, redacted stack, App version, build number, Android version, and WebView version. Diagnostics exclude email, nickname, tokens, user ID, boards, replays, move sequences, advertising IDs, and unique device identifiers.",
      ],
    },
    {
      title: "4. Purposes",
      paragraphs: ["We process this information only to provide accounts, email verification, cloud history, replays, ranked verification, leaderboards, achievements, account deletion, security, troubleshooting, and necessary operations. We do not sell personal information or integrate advertising attribution, page-click analytics, or gameplay analytics SDKs."],
    },
    {
      title: "5. Android permissions and device capabilities",
      paragraphs: ["The first Android release requests only the INTERNET permission. Haptics use Android View feedback and respect the system setting without requesting vibration permission. The App does not request notification, external storage, location, contacts, camera, microphone, or persistent background permissions. Replay and diagnostic exports use private cache files and the system share sheet, then remove temporary files."],
    },
    {
      title: "6. Service providers",
      paragraphs: ["Some information is handled by constrained providers needed to deliver the service:"],
      items: [
        "Resend sends registration and password-reset email and receives the destination email, code, purpose, and expiry.",
        "Cloudflare may provide website DNS, CDN, WAF, and related network security or acceleration. Web registration or password-reset pages may use Turnstile and process necessary network and browser signals. The Android public account flow does not embed Turnstile.",
        "Server hosting and backups: account and game databases and replays are processed by controlled PostgreSQL and private server storage used by 2048-game-api. The production primary server is provided by Color Cross in Chicago, United States. Backend server backups are stored in the Huawei Cloud Shanghai region in mainland China.",
        "Cross-border personal-information processing: when you choose Agree and continue and use online features, the information listed in Section 3 that is necessary for the requested feature is transferred to and processed by the production primary server in Chicago, United States. This choice confirms that you have read this policy and separately consent to that cross-border processing. You may decline and continue offline; declining does not affect Guest Standard 4×4 or other local features.",
      ],
    },
    {
      title: "7. Retention and deletion",
      paragraphs: [],
      items: [
        "Local data remains until you delete it in the App, sign out and trigger account-local cleanup, clear App data, or uninstall. Guest and account data are isolated.",
        "Account profile, cloud records, replays, leaderboard data, and achievements are generally retained until you delete the relevant record, request account deletion, or the service no longer needs the data.",
        "A deleted cloud record has a 3-day restoration period, after which it is removed from authoritative and derived data.",
        "An account-deletion request has a 72-hour cooling-off period. Email-and-password sign-in during that period cancels deletion. After the deadline, sign-in and restoration are blocked even if the cleanup job has not run, and the account and game data are then permanently removed.",
        "Anonymous serious-error diagnostics are retained for no more than 30 days by default.",
        "Minimum security or legal audit information is kept only as necessary and is not used to reconstruct deleted player data.",
      ],
    },
    {
      title: "8. Your choices and rights",
      paragraphs: [],
      items: [
        "Choose offline-only play and disable automatic diagnostics, sound, haptics, or background music in settings.",
        "View account details, cloud history, leaderboards, and achievements, and delete or restore cloud records within the allowed period.",
        "Request account deletion from the App or the public deletion page without installing the App.",
        "Export local diagnostics or completed-game replays. Exports contain no account credentials.",
        "Use the contact channel in the approved policy to request access, correction, deletion, or an explanation of personal-information processing.",
      ],
    },
    {
      title: "9. Children",
      paragraphs: ["2048 NEXT is not primarily directed to children under 14. Users under 14 should use online account features only with guardian consent and guidance. A guardian who believes a child's information was processed without consent may use the approved contact channel to request action."],
    },
    {
      title: "10. Security, changes, and contact",
      paragraphs: [
        "We use HTTPS, password hashing, Android Keystore, token-version revocation, least privilege, replay verification, access control, rate limiting, and data isolation. No system can guarantee absolute security; if an incident affects your rights, we will take remedial and notification steps required by law.",
        "The App asks again before the next online action only when purposes, data scope, sharing, or user rights materially change. Formatting or explanatory edits do not repeatedly interrupt users.",
        "2048 NEXT is operated by the individual 王世杰, who is also responsible for the policy and terms content. Contact: 1203214493@qq.com. You may use this address to request access, correction, deletion, or an explanation of personal-information processing.",
      ],
    },
  ],
};

const TERMS_ZH: PolicyDocument = {
  title: "2048 NEXT 用户协议",
  shortTitle: "用户协议",
  intro: "本协议适用于 2048 NEXT 网页版与 Android App。本版本已经运营者批准，自 2026 年 8 月 1 日起生效。",
  sections: [
    {
      title: "一、服务内容",
      paragraphs: [
        "2048 NEXT 提供本地 2048 游戏、账号、云历史、回放、排位验证、排行榜、成就、设置和账号删除等功能。网页版、Android App 和未来小程序可以拥有不同页面，但使用同一权威账号和游戏后端。",
        "游客可使用已开放的本地玩法；部分模式、云数据、排行榜和成就需要登录并同意联网。未结束对局只在产生它的设备恢复，不承诺跨设备续玩。",
      ],
    },
    {
      title: "二、账号注册与安全",
      items: [
        "注册时应提供可用邮箱、符合规则的昵称和密码，并妥善保管账号凭据。",
        "不得冒用他人身份、转让账号、共享用于作弊的凭据或绕过访问控制。",
        "发现账号异常应及时修改密码或通过正式联系渠道反馈。因用户主动泄露凭据造成的损失，由用户在法律允许范围内承担相应责任。",
      ],
      paragraphs: [],
    },
    {
      title: "三、游戏记录、排位与排行榜",
      paragraphs: [
        "排位成绩由服务端排位会话、回放验证和权威时间锚点确认。客户端显示不等于权威入榜，网络失败、验证失败或缺少可信锚点的记录可以只作为普通云历史或被拒绝入榜。",
        "2048 NEXT 排行榜采用唯一连续名次。分数或竞速成绩相同时，以服务端确认的首次取得时间更早者优先，再以稳定用户 ID 形成确定顺序。",
      ],
    },
    {
      title: "四、禁止行为",
      items: [
        "篡改客户端、伪造回放或排位令牌、自动化刷分、利用漏洞、绕过限流、干扰服务或尝试未授权访问。",
        "上传违法、侵权、欺诈、恶意或明显干扰其他用户的昵称、内容或请求。",
        "逆向获取密钥、攻击服务器、传播恶意代码，或利用服务从事商业转售、赌博及其他违法活动。",
      ],
      paragraphs: ["我们可以拒绝无效成绩、限制异常请求、撤销作弊成绩或暂停相关账号；涉及账号处置时会保留必要的可审计依据。"],
    },
    {
      title: "五、用户数据与导出",
      paragraphs: [
        "隐私政策说明个人信息处理。游客本地记录不会因登录自动并入账号。已结算回放可导出分享；导出文件不包含 Token、邮箱或其他账号凭据。",
        "用户应自行妥善保存主动导出的文件。未结束存档、离线缓存和本机设置可能因清除应用数据、卸载、设备故障或明确退出清理而丢失。",
      ],
    },
    {
      title: "六、记录删除与账号删除",
      items: [
        "云记录删除后有 3 天恢复期；游客本地记录确认删除后立即永久删除。",
        "账号删除申请进入 72 小时冷静期。期限内邮箱和密码登录会取消删除；到期后账号及游戏数据彻底删除且无法恢复。",
        "账号最终删除后可以用同一邮箱重新注册，但会生成全新用户 ID，不恢复、关联或继承旧数据。",
      ],
      paragraphs: [],
    },
    {
      title: "七、服务变更与可用性",
      paragraphs: [
        "我们会尽力维持服务稳定，但网络、设备、维护、安全事件、不可抗力或第三方服务异常可能导致部分功能中断。离线本地功能与在线功能的可用边界以实际版本说明为准。",
        "为修复安全问题、维护数据一致性或遵守法律要求，我们可以调整、暂停或终止部分功能，并在合理可行范围内提供说明。",
      ],
    },
    {
      title: "八、知识产权",
      paragraphs: [
        "2048 NEXT 的程序、界面、品牌、文字、图形和其他受保护内容归相应权利人所有。除法律允许或另有开源许可外，不得复制、改作、传播或用于未授权商业用途。用户保留其依法享有的内容权利，并授权服务为展示昵称、验证回放和提供排行榜所必需的范围处理相关内容。",
      ],
    },
    {
      title: "九、责任边界",
      paragraphs: [
        "在法律允许范围内，服务按实际可用状态提供，不保证永不中断或完全无错误。我们不会排除因故意或重大过失、侵犯人身权益或法律不得排除的责任。对可预见且与服务直接相关的损失，责任范围依适用法律确定。",
      ],
    },
    {
      title: "十、协议变更、适用法律与联系",
      paragraphs: [
        "协议发生实质变化时，会以版本化文本和合理方式提示；继续使用受变更影响的联网功能前会按适用规则请求确认。",
        "本协议适用中华人民共和国法律。争议应先友好协商；协商不成的，提交有管辖权的人民法院处理。",
        "2048 NEXT 由自然人王世杰运营，政策与协议内容责任人为王世杰，联系邮箱为 1203214493@qq.com。",
      ],
    },
  ],
};

const TERMS_EN: PolicyDocument = {
  title: "2048 NEXT Terms of Service",
  shortTitle: "Terms of Service",
  intro: "These terms apply to the 2048 NEXT website and Android App. The operator has approved this version, effective August 1, 2026.",
  sections: [
    {
      title: "1. Service",
      paragraphs: [
        "2048 NEXT provides local 2048 gameplay, accounts, cloud history, replays, ranked verification, leaderboards, achievements, settings, and account deletion. The website, Android App, and a future mini program may have different interfaces while using the same authoritative account and game backend.",
        "Guests may use the available local mode. Some modes, cloud data, leaderboards, and achievements require sign-in and online consent. Unfinished games resume only on the device that created them and are not promised as cross-device saves.",
      ],
    },
    {
      title: "2. Account registration and security",
      paragraphs: [],
      items: [
        "Provide a working email, a compliant nickname, and a password, and protect the account credentials.",
        "Do not impersonate another person, transfer an account, share credentials for cheating, or bypass access controls.",
        "If you notice suspicious activity, change the password or use the approved contact channel. To the extent allowed by law, users are responsible for loss caused by voluntarily disclosing credentials.",
      ],
    },
    {
      title: "3. Game records, ranked play, and leaderboards",
      paragraphs: [
        "Ranked results are confirmed by server-ranked sessions, replay verification, and authoritative time anchors. A client display does not guarantee leaderboard acceptance. Network failure, verification failure, or missing trusted anchors may leave a result as normal cloud history or reject it from the leaderboard.",
        "2048 NEXT leaderboards use unique consecutive ranks. Equal score or speed results are ordered by the earlier server-confirmed first achievement time and then by stable user ID for deterministic order.",
      ],
    },
    {
      title: "4. Prohibited conduct",
      paragraphs: ["We may reject invalid results, restrict abusive requests, remove cheating results, or suspend related accounts while retaining the minimum evidence needed for audit."],
      items: [
        "Tampering with the client, forging replays or ranked tokens, automated score farming, exploiting vulnerabilities, bypassing rate limits, disrupting service, or attempting unauthorized access.",
        "Submitting unlawful, infringing, fraudulent, malicious, or clearly disruptive nicknames, content, or requests.",
        "Extracting keys, attacking servers, distributing malware, or using the service for unauthorized resale, gambling, or unlawful activity.",
      ],
    },
    {
      title: "5. User data and exports",
      paragraphs: [
        "The Privacy Policy explains personal-information processing. Guest local records are not automatically merged into an account after sign-in. Completed replays may be exported; exported files contain no tokens, email, or other account credentials.",
        "Users should protect files they export. Unfinished saves, offline caches, and local settings may be lost after clearing App data, uninstalling, device failure, or an explicit sign-out cleanup.",
      ],
    },
    {
      title: "6. Record and account deletion",
      paragraphs: [],
      items: [
        "Cloud records have a 3-day restoration period after deletion. A confirmed guest-record deletion is immediate and permanent.",
        "An account-deletion request starts a 72-hour cooling-off period. Email-and-password sign-in before the deadline cancels deletion. After the deadline, the account and game data are permanently removed and cannot be recovered.",
        "After final deletion, the same email may register again, but a new user ID is created and no old data is restored, linked, or inherited.",
      ],
    },
    {
      title: "7. Changes and availability",
      paragraphs: [
        "We work to keep the service stable, but networks, devices, maintenance, security incidents, force majeure, or provider failures may interrupt some features. The actual release defines the boundary between local offline and online functions.",
        "We may adjust, suspend, or discontinue features to fix security issues, preserve data integrity, or comply with law and will provide reasonable notice where practicable.",
      ],
    },
    {
      title: "8. Intellectual property",
      paragraphs: ["The software, interface, brand, text, graphics, and other protected 2048 NEXT content belong to their respective rights holders. Except as allowed by law or an applicable open-source license, they may not be copied, adapted, distributed, or used commercially without authorization. Users retain lawful rights in their content and authorize processing only as needed to display nicknames, verify replays, and provide leaderboards."],
    },
    {
      title: "9. Liability boundaries",
      paragraphs: ["To the extent allowed by law, the service is provided as available and is not guaranteed to be uninterrupted or error-free. Nothing excludes liability for intent or gross negligence, personal rights violations, or liability that law does not allow us to exclude. Liability for foreseeable direct loss is determined under applicable law."],
    },
    {
      title: "10. Changes, law, and contact",
      paragraphs: [
        "Material changes are presented through versioned text and reasonable notice, and consent is requested where required before continued use of affected online features.",
        "These terms are governed by the laws of the People's Republic of China. Disputes should first be resolved through good-faith discussion and otherwise submitted to a court with lawful jurisdiction.",
        "2048 NEXT is operated by the individual 王世杰, who is also responsible for the policy and terms content. Contact: 1203214493@qq.com.",
      ],
    },
  ],
};

const DOCUMENTS: Record<PolicyLocale, Record<PolicyKind, PolicyDocument>> = {
  "zh-CN": { privacy: PRIVACY_ZH, terms: TERMS_ZH },
  en: { privacy: PRIVACY_EN, terms: TERMS_EN },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

export function getPolicyDocument(
  kind: PolicyKind,
  locale: PolicyLocale,
): PolicyDocument {
  return DOCUMENTS[locale][kind];
}

export function renderPolicyDocumentHtml(
  kind: PolicyKind,
  locale: PolicyLocale,
): string {
  const document = getPolicyDocument(kind, locale);
  return document.sections.map((section) => `
    <section class="policy-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      ${section.items?.length
        ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : ""}
    </section>
  `).join("");
}
