import type { Translator } from "../i18n";

function brandBoard(): string {
  return `
    <div class="brand-board" aria-hidden="true">
      <span>2</span><span>0</span><span>4</span><span>8</span>
    </div>
  `;
}

function bottomNavigation(t: Translator): string {
  return `
    <nav class="bottom-nav" data-app-bottom-nav aria-label="${t("app.name")}" hidden>
      <button type="button" data-nav="home" aria-current="page">
        <span class="bottom-nav__index" aria-hidden="true">01</span>
        <span>${t("nav.home")}</span>
      </button>
      <button type="button" data-nav="modes">
        <span class="bottom-nav__index" aria-hidden="true">02</span>
        <span>${t("nav.modes")}</span>
      </button>
      <button type="button" data-nav="records">
        <span class="bottom-nav__index" aria-hidden="true">03</span>
        <span>${t("nav.records")}</span>
      </button>
      <button type="button" data-nav="me">
        <span class="bottom-nav__index" aria-hidden="true">04</span>
        <span>${t("nav.me")}</span>
      </button>
    </nav>
  `;
}

export function renderAppTemplate(t: Translator): string {
  return `
    <div class="app-shell app-shell--precision" data-app-shell data-app-template="precision-v1" data-network-mode="undecided">
      <div class="app-stage" data-app-stage>
        <section class="app-view privacy-view" data-app-view="privacy" aria-labelledby="privacy-title">
          <div class="privacy-view__rail" aria-hidden="true"><span>LOCAL</span><span>V1</span></div>
          <div class="brand-lockup">
            ${brandBoard()}
            <div>
              <p class="eyebrow">${t("privacy.eyebrow")}</p>
              <h1 id="privacy-title">${t("privacy.title")}</h1>
            </div>
          </div>
          <p class="preview-badge" role="note">${t("privacy.previewBadge")}</p>
          <p class="privacy-copy">${t("privacy.body")}</p>
          <aside class="privacy-notice instrument-card">
            <strong>${t("privacy.noticeTitle")}</strong>
            <p>${t("privacy.noticeBody")}</p>
          </aside>
          <div class="privacy-actions">
            <button class="action-button action-button--primary" type="button" data-consent="online">
              ${t("privacy.onlineAction")}
            </button>
            <button class="action-button action-button--secondary" type="button" data-consent="offline">
              ${t("privacy.offlineAction")}
            </button>
            <button class="text-button" type="button" data-action="show-privacy-notes">
              ${t("privacy.policyAction")}
            </button>
          </div>
        </section>

        <section class="app-view app-view--top home-view" data-app-view="home" data-top-level="true" aria-labelledby="home-title" hidden>
          <main class="home-main">
            <header class="app-bar home-header">
              <div>
                <p class="eyebrow">${t("home.eyebrow")}</p>
                <h1 id="home-title">${t("home.title")}</h1>
              </div>
              <span class="network-chip" data-connectivity>${t("home.offlineState")}</span>
            </header>

            <section class="hero-console" aria-labelledby="quick-start-title">
              <div class="hero-console__number" aria-hidden="true">01</div>
              <p class="section-kicker">${t("home.modeSection")}</p>
              <h2 id="quick-start-title" data-home-mode-title>${t("home.standardTitle")}</h2>
              <p class="hero-console__meta" data-home-mode-meta>${t("home.standardMeta")}</p>
              <p class="save-readout" data-home-save-copy hidden></p>
              <button class="action-button action-button--primary" type="button" data-action="enter-standard" data-home-primary>
                ${t("home.startAction")}
              </button>
            </section>

            <section class="home-section" aria-labelledby="home-recent-title">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">${t("home.archiveKicker")}</p>
                  <h2 id="home-recent-title">${t("home.recentTitle")}</h2>
                </div>
                <button class="text-button" type="button" data-nav="records">${t("nav.records")}</button>
              </div>
              <div class="record-list" data-home-recent-records></div>
              <div class="empty-state compact-empty" data-home-recent-empty>
                <span class="empty-state__mark" aria-hidden="true">◇</span>
                <strong>${t("home.recentEmptyTitle")}</strong>
                <p>${t("home.recentEmptyBody")}</p>
              </div>
            </section>
          </main>
        </section>

        <section class="app-view app-view--top modes-view" data-app-view="modes" data-top-level="true" aria-labelledby="modes-title" hidden>
          <header class="app-bar">
            <div>
              <p class="eyebrow">${t("modes.eyebrow")}</p>
              <h1 id="modes-title">${t("modes.title")}</h1>
            </div>
            <span class="identity-chip" data-mode-identity>${t("records.guestOwner")}</span>
          </header>
          <p class="view-intro">${t("modes.body")}</p>
          <div class="mode-list">
            <button class="mode-card mode-card--available" type="button" data-mode-card data-mode="standard_4x4_pow2_no_undo" data-requires-auth="false">
              <span class="mode-card__index" aria-hidden="true">01</span>
              <span class="mode-card__copy">
                <strong>${t("modes.standardTitle")}</strong>
                <small>${t("modes.standardMeta")}</small>
              </span>
              <span class="mode-card__state" data-mode-state>${t("modes.standardState")}</span>
            </button>
            <button class="mode-card" type="button" data-mode-card data-mode="classic_4x4_pow2_undo" data-requires-auth="true" aria-describedby="classic-mode-lock">
              <span class="mode-card__index" aria-hidden="true">02</span>
              <span class="mode-card__copy">
                <strong>${t("modes.classicTitle")}</strong>
                <small>${t("modes.classicMeta")}</small>
              </span>
              <span class="mode-card__state mode-card__state--locked" id="classic-mode-lock" data-mode-state>${t("modes.lockedState")}</span>
            </button>
            <button class="mode-card" type="button" data-mode-card data-mode="board_3x3_pow2_no_undo" data-requires-auth="true" aria-describedby="compact-mode-lock">
              <span class="mode-card__index" aria-hidden="true">03</span>
              <span class="mode-card__copy">
                <strong>${t("modes.compactTitle")}</strong>
                <small>${t("modes.compactMeta")}</small>
              </span>
              <span class="mode-card__state mode-card__state--locked" id="compact-mode-lock" data-mode-state>${t("modes.lockedState")}</span>
            </button>
          </div>
        </section>

        <section class="app-view app-view--top records-view" data-app-view="records" data-top-level="true" aria-labelledby="records-title" hidden>
          <header class="app-bar">
            <div>
              <p class="eyebrow">${t("records.eyebrow")}</p>
              <h1 id="records-title">${t("records.title")}</h1>
            </div>
            <button class="icon-button" type="button" data-action="open-leaderboard" aria-label="${t("records.leaderboardAction")}">
              <span aria-hidden="true">#</span>
            </button>
          </header>
          <div class="filter-deck" aria-label="${t("records.title")}">
            <label>
              <span>${t("records.ownerLabel")}</span>
              <select data-record-owner>
                <option value="guest">${t("records.guestOwner")}</option>
                <option value="account-active" hidden disabled>${t("records.accountOwner")}</option>
                <option value="account-deleted" hidden disabled>${t("records.deletedOwner")}</option>
              </select>
            </label>
            <label>
              <span>${t("records.sortLabel")}</span>
              <select data-record-sort>
                <option value="time">${t("records.sortTime")}</option>
                <option value="score">${t("records.sortScore")}</option>
                <option value="boardSum">${t("records.sortBoardSum")}</option>
              </select>
            </label>
          </div>
          <p class="cloud-history-status" data-cloud-history-status hidden></p>
          <div class="record-list" data-record-list></div>
          <div class="empty-state" data-record-empty>
            <span class="empty-state__mark" aria-hidden="true">□</span>
            <strong>${t("records.emptyTitle")}</strong>
            <p>${t("records.emptyBody")}</p>
          </div>
        </section>

        <section class="app-view app-view--top me-view" data-app-view="me" data-top-level="true" aria-labelledby="me-title" hidden>
          <header class="app-bar">
            <div>
              <p class="eyebrow">${t("me.eyebrow")}</p>
              <h1 id="me-title">${t("me.title")}</h1>
            </div>
            <span class="identity-chip" data-account-badge>${t("me.guestBadge")}</span>
          </header>
          <section class="account-plate instrument-card">
            <span class="account-plate__avatar" aria-hidden="true">2</span>
            <div>
              <h2 data-account-title>${t("me.guestTitle")}</h2>
              <p data-account-body>${t("me.guestBody")}</p>
            </div>
            <button class="action-button action-button--secondary" type="button" data-action="open-auth-gate">${t("me.loginAction")}</button>
            <button class="danger-button" type="button" data-action="request-account-logout" hidden>${t("me.logoutAction")}</button>
            <button class="danger-button" type="button" data-action="request-account-deletion" hidden>${t("me.deleteAccountAction")}</button>
          </section>
          <section class="deletion-receipt instrument-card" data-account-deletion-receipt hidden>
            <p class="eyebrow">${t("deletionReceipt.eyebrow")}</p>
            <h2>${t("deletionReceipt.title")}</h2>
            <p data-account-deletion-receipt-copy></p>
          </section>
          <div class="settings-list">
            <button class="setting-link" type="button" data-action="open-achievements-gate">
              <span class="setting-link__code" aria-hidden="true">A1</span>
              <span><strong>${t("me.achievementsTitle")}</strong><small>${t("me.achievementsBody")}</small></span>
              <span aria-hidden="true">→</span>
            </button>
            <label class="setting-link setting-select">
              <span class="setting-link__code" aria-hidden="true">S1</span>
              <span><strong>${t("me.appearanceTitle")}</strong><small>${t("me.appearanceBody")}</small></span>
              <select data-theme-preference aria-label="${t("me.appearanceTitle")}">
                <option value="system">${t("me.themeSystem")}</option>
                <option value="light">${t("me.themeLight")}</option>
                <option value="dark">${t("me.themeDark")}</option>
              </select>
            </label>
            <label class="setting-link setting-select">
              <span class="setting-link__code" aria-hidden="true">S2</span>
              <span><strong>${t("me.languageTitle")}</strong><small>${t("me.languageBody")}</small></span>
              <select data-locale-preference aria-label="${t("me.languageTitle")}">
                <option value="system">${t("me.languageSystem")}</option>
                <option value="zh-CN">${t("me.languageChinese")}</option>
                <option value="en">${t("me.languageEnglish")}</option>
              </select>
            </label>
            <label class="setting-link setting-toggle">
              <span class="setting-link__code" aria-hidden="true">S3</span>
              <span><strong>${t("me.soundTitle")}</strong><small>${t("me.soundBody")}</small></span>
              <input type="checkbox" data-sound-effects-enabled>
            </label>
            <label class="setting-link setting-toggle">
              <span class="setting-link__code" aria-hidden="true">S4</span>
              <span><strong>${t("me.hapticsTitle")}</strong><small>${t("me.hapticsBody")}</small></span>
              <input type="checkbox" data-haptics-enabled>
            </label>
            <label class="setting-link setting-toggle">
              <span class="setting-link__code" aria-hidden="true">S5</span>
              <span><strong>${t("me.bgmTitle")}</strong><small>${t("me.bgmBody")}</small></span>
              <input type="checkbox" data-bgm-enabled>
            </label>
            <label class="setting-link setting-toggle">
              <span class="setting-link__code" aria-hidden="true">D1</span>
              <span><strong>${t("diagnostics.title")}</strong><small>${t("diagnostics.body")}</small></span>
              <input type="checkbox" data-diagnostics-enabled>
            </label>
            <button class="setting-link" type="button" data-action="export-diagnostics">
              <span class="setting-link__code" aria-hidden="true">D2</span>
              <span><strong>${t("diagnostics.exportTitle")}</strong><small>${t("diagnostics.exportBody")}</small></span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section class="app-view task-view achievements-view" data-app-view="achievements" aria-labelledby="achievements-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="close-achievements" aria-label="${t("achievements.back")}">←</button>
            <div>
              <p class="eyebrow">${t("achievements.eyebrow")}</p>
              <h1 id="achievements-title">${t("achievements.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="achievements-intro">${t("achievements.body")}</p>
          <p class="achievements-status" data-achievements-status>${t("achievements.loading")}</p>
          <section class="achievement-group" aria-labelledby="achievements-earned-title">
            <div class="section-heading">
              <h2 id="achievements-earned-title">${t("achievements.earnedTitle")}</h2>
              <output data-achievements-earned-count>0</output>
            </div>
            <div class="achievement-list" data-achievements-earned></div>
            <div class="empty-state compact-empty" data-achievements-earned-empty>
              <span class="empty-state__mark" aria-hidden="true">✓</span>
              <strong>${t("achievements.earnedEmpty")}</strong>
            </div>
          </section>
          <section class="achievement-group" aria-labelledby="achievements-available-title">
            <div class="section-heading">
              <h2 id="achievements-available-title">${t("achievements.availableTitle")}</h2>
              <output data-achievements-available-count>0</output>
            </div>
            <div class="achievement-list" data-achievements-available></div>
            <div class="empty-state compact-empty" data-achievements-available-empty>
              <span class="empty-state__mark" aria-hidden="true">○</span>
              <strong>${t("achievements.availableEmpty")}</strong>
            </div>
          </section>
        </section>

        <section class="app-view task-view game-view" data-app-view="game" aria-labelledby="game-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="leave-game" aria-label="${t("game.backLabel")}">←</button>
            <div>
              <p class="eyebrow" data-game-status>${t("game.status")}</p>
              <h1 id="game-title">${t("game.title")}</h1>
            </div>
            <button class="icon-button" type="button" data-action="open-leaderboard" aria-label="${t("game.leaderboardLabel")}"><span aria-hidden="true">#</span></button>
          </header>
          <div class="game-readouts" aria-label="${t("game.title")}">
            <div class="readout"><span>${t("game.score")}</span><strong data-game-score>0</strong></div>
            <div class="readout"><span>${t("game.best")}</span><strong data-game-best>0</strong></div>
            <div class="readout"><span>${t("game.time")}</span><strong data-game-time>00:00</strong></div>
          </div>
          <div class="game-board-frame">
            <span class="frame-corner frame-corner--a" aria-hidden="true"></span>
            <span class="frame-corner frame-corner--b" aria-hidden="true"></span>
            <div data-game-board-root aria-label="${t("game.boardLabel")}"></div>
          </div>
          <p class="milestone-toast" data-game-milestone role="status" hidden>${t("game.milestone")}</p>
          <div class="game-actions">
            <button class="action-button action-button--secondary" type="button" data-action="restart-game">${t("game.restart")}</button>
            <button class="text-button" type="button" data-action="open-leaderboard">${t("game.leaderboardAction")}</button>
          </div>
        </section>

        <section class="app-view task-view result-view" data-app-view="result" aria-labelledby="result-title" hidden>
          <header class="app-bar">
            <div>
              <p class="eyebrow">${t("result.eyebrow")}</p>
              <h1 id="result-title">${t("result.title")}</h1>
            </div>
            <span class="local-state" data-result-upload-status>${t("result.savedLocal")}</span>
          </header>
          <section class="result-score instrument-card">
            <span>${t("result.finalScore")}</span>
            <strong data-result-score>0</strong>
          </section>
          <div class="result-grid">
            <div class="readout"><span>${t("result.bestTile")}</span><strong data-result-best-tile>0</strong></div>
            <div class="readout"><span>${t("result.time")}</span><strong data-result-time>00:00</strong></div>
            <div class="readout"><span>${t("result.steps")}</span><strong data-result-steps>0</strong></div>
          </div>
          <p class="local-note" data-result-upload-note>${t("detail.localRecord")}</p>
          <div class="result-actions">
            <button class="action-button action-button--primary" type="button" data-action="result-again">${t("result.again")}</button>
            <button class="action-button action-button--secondary" type="button" data-action="result-replay">${t("result.replay")}</button>
            <button class="action-button action-button--secondary" type="button" data-action="share-replay" data-result-share-replay>${t("replay.share")}</button>
            <button class="action-button action-button--secondary" type="button" data-action="retry-record-upload" hidden>${t("result.retryUpload")}</button>
            <button class="text-button" type="button" data-action="result-home">${t("result.home")}</button>
          </div>
        </section>

        <section class="app-view task-view detail-view" data-app-view="detail" aria-labelledby="detail-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="close-detail" aria-label="${t("detail.backLabel")}">←</button>
            <div>
              <p class="eyebrow">${t("detail.eyebrow")}</p>
              <h1 id="detail-title">${t("detail.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <section class="result-score result-score--compact instrument-card">
            <span>${t("detail.localRecord")}</span>
            <strong data-detail-score>0</strong>
          </section>
          <div class="result-grid result-grid--two">
            <div class="readout"><span>${t("detail.bestTile")}</span><strong data-detail-best-tile>0</strong></div>
            <div class="readout"><span>${t("detail.boardSum")}</span><strong data-detail-board-sum>0</strong></div>
            <div class="readout"><span>${t("detail.time")}</span><strong data-detail-time>00:00</strong></div>
            <div class="readout"><span>${t("detail.steps")}</span><strong data-detail-steps>0</strong></div>
          </div>
          <div class="detail-actions">
            <button class="action-button action-button--primary" type="button" data-action="open-replay">${t("detail.replay")}</button>
            <button class="action-button action-button--secondary" type="button" data-action="share-replay" data-detail-share-replay>${t("replay.share")}</button>
            <button class="danger-button" type="button" data-action="delete-record">${t("detail.delete")}</button>
          </div>
        </section>

        <section class="app-view task-view replay-view" data-app-view="replay" aria-labelledby="replay-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="close-replay" aria-label="${t("replay.backLabel")}">←</button>
            <div>
              <p class="eyebrow">${t("replay.eyebrow")}</p>
              <h1 id="replay-title">${t("replay.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <div class="game-board-frame replay-board-frame">
            <span class="frame-corner frame-corner--a" aria-hidden="true"></span>
            <span class="frame-corner frame-corner--b" aria-hidden="true"></span>
            <div data-replay-board-root aria-label="${t("replay.boardLabel")}"></div>
          </div>
          <div class="replay-meter">
            <label for="replay-progress">${t("replay.progressLabel")}</label>
            <input id="replay-progress" type="range" min="0" max="0" value="0" data-replay-progress>
            <output data-replay-progress-copy>0 / 0 · 00:00 / 00:00</output>
          </div>
          <div class="replay-controls">
            <button class="action-button action-button--secondary" type="button" data-action="replay-previous">${t("replay.previous")}</button>
            <button class="action-button action-button--primary" type="button" data-action="replay-play" aria-pressed="false">${t("replay.play")}</button>
            <button class="action-button action-button--secondary" type="button" data-action="replay-next">${t("replay.next")}</button>
          </div>
          <button class="text-button replay-share" type="button" data-action="share-replay">${t("replay.share")}</button>
        </section>

        <section class="app-view task-view auth-view" data-app-view="auth-login" aria-labelledby="auth-login-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="cancel-auth" aria-label="${t("auth.cancel")}">←</button>
            <div>
              <p class="eyebrow">${t("auth.eyebrow")}</p>
              <h1 id="auth-login-title">${t("auth.login.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="auth-context" data-auth-context>${t("auth.contextAccount")}</p>
          <form class="auth-form instrument-card" data-auth-form novalidate>
            <label class="auth-field">
              <span>${t("auth.login.email")}</span>
              <input name="email" type="email" autocomplete="email" maxlength="320" required>
            </label>
            <label class="auth-field">
              <span>${t("auth.login.password")}</span>
              <input name="password" type="password" autocomplete="current-password" maxlength="256" required>
            </label>
            <p class="auth-error" data-auth-error role="alert" hidden></p>
            <button class="action-button action-button--primary" type="submit" data-auth-submit>${t("auth.login.submit")}</button>
          </form>
          <div class="auth-secondary-actions">
            <button class="text-button" type="button" data-action="auth-open-register">${t("auth.login.register")}</button>
            <button class="text-button" type="button" data-action="auth-open-reset">${t("auth.login.forgot")}</button>
          </div>
          <button class="text-button auth-cancel" type="button" data-action="cancel-auth">${t("auth.cancel")}</button>
        </section>

        <section class="app-view task-view auth-view" data-app-view="auth-register" aria-labelledby="auth-register-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="auth-back" aria-label="${t("auth.back")}">←</button>
            <div>
              <p class="eyebrow">${t("auth.eyebrow")}</p>
              <h1 id="auth-register-title">${t("auth.register.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="auth-context">${t("auth.register.body")}</p>
          <form class="auth-form instrument-card" data-auth-form novalidate>
            <label class="auth-field">
              <span>${t("auth.register.email")}</span>
              <input name="email" type="email" autocomplete="email" maxlength="320" required>
            </label>
            <label class="auth-field">
              <span>${t("auth.register.nickname")}</span>
              <input name="nickname" type="text" autocomplete="nickname" maxlength="64" required>
            </label>
            <label class="auth-field">
              <span>${t("auth.register.password")}</span>
              <input name="password" type="password" autocomplete="new-password" maxlength="256" required>
            </label>
            <p class="auth-error" data-auth-error role="alert" hidden></p>
            <button class="action-button action-button--primary" type="submit" data-auth-submit>${t("auth.register.submit")}</button>
          </form>
          <button class="text-button auth-cancel" type="button" data-action="cancel-auth">${t("auth.cancel")}</button>
        </section>

        <section class="app-view task-view auth-view" data-app-view="auth-register-verify" aria-labelledby="auth-register-verify-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="auth-back" aria-label="${t("auth.back")}">←</button>
            <div>
              <p class="eyebrow">${t("auth.eyebrow")}</p>
              <h1 id="auth-register-verify-title">${t("auth.register.verifyTitle")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="auth-context">${t("auth.register.verifyBody")} <strong data-auth-register-email></strong></p>
          <form class="auth-form instrument-card" data-auth-form novalidate>
            <label class="auth-field">
              <span>${t("auth.register.code")}</span>
              <input name="code" type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="32" required>
            </label>
            <p class="auth-error" data-auth-error role="alert" hidden></p>
            <button class="action-button action-button--primary" type="submit" data-auth-submit>${t("auth.register.verifySubmit")}</button>
          </form>
          <button class="text-button auth-cancel" type="button" data-action="cancel-auth">${t("auth.cancel")}</button>
        </section>

        <section class="app-view task-view auth-view" data-app-view="auth-reset" aria-labelledby="auth-reset-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="auth-back" aria-label="${t("auth.back")}">←</button>
            <div>
              <p class="eyebrow">${t("auth.eyebrow")}</p>
              <h1 id="auth-reset-title">${t("auth.reset.title")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="auth-context">${t("auth.reset.body")}</p>
          <form class="auth-form instrument-card" data-auth-form novalidate>
            <label class="auth-field">
              <span>${t("auth.reset.email")}</span>
              <input name="email" type="email" autocomplete="email" maxlength="320" required>
            </label>
            <p class="auth-error" data-auth-error role="alert" hidden></p>
            <button class="action-button action-button--primary" type="submit" data-auth-submit>${t("auth.reset.submit")}</button>
          </form>
          <button class="text-button auth-cancel" type="button" data-action="cancel-auth">${t("auth.cancel")}</button>
        </section>

        <section class="app-view task-view auth-view" data-app-view="auth-reset-verify" aria-labelledby="auth-reset-verify-title" hidden>
          <header class="task-bar">
            <button class="icon-button" type="button" data-action="auth-back" aria-label="${t("auth.back")}">←</button>
            <div>
              <p class="eyebrow">${t("auth.eyebrow")}</p>
              <h1 id="auth-reset-verify-title">${t("auth.reset.verifyTitle")}</h1>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <p class="auth-context">${t("auth.reset.verifyBody")} <strong data-auth-reset-email></strong></p>
          <form class="auth-form instrument-card" data-auth-form novalidate>
            <label class="auth-field">
              <span>${t("auth.reset.code")}</span>
              <input name="code" type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="32" required>
            </label>
            <label class="auth-field">
              <span>${t("auth.reset.newPassword")}</span>
              <input name="newPassword" type="password" autocomplete="new-password" maxlength="256" required>
            </label>
            <p class="auth-error" data-auth-error role="alert" hidden></p>
            <button class="action-button action-button--primary" type="submit" data-auth-submit>${t("auth.reset.verifySubmit")}</button>
          </form>
          <button class="text-button auth-cancel" type="button" data-action="cancel-auth">${t("auth.cancel")}</button>
        </section>
      </div>

      ${bottomNavigation(t)}

      <div class="app-status" data-app-status role="status" aria-live="polite" aria-atomic="true" hidden>
        <span data-app-status-copy></span>
        <button type="button" data-action="dismiss-status" aria-label="${t("status.dismiss")}">×</button>
      </div>

      <dialog class="leaderboard-dialog" data-leaderboard-dialog aria-labelledby="leaderboard-title">
        <section class="leaderboard-sheet">
          <header class="task-bar leaderboard-bar">
            <button class="icon-button" type="button" data-action="close-leaderboard" aria-label="${t("leaderboard.close")}">←</button>
            <div>
              <p class="eyebrow">${t("leaderboard.eyebrow")}</p>
              <h2 id="leaderboard-title">${t("leaderboard.title")}</h2>
            </div>
            <span class="task-bar__spacer" aria-hidden="true"></span>
          </header>
          <div class="leaderboard-filters">
            <label><span>${t("leaderboard.mode")}</span><select data-leaderboard-filter data-leaderboard-mode>
              <option value="standard_4x4_pow2_no_undo">${t("modes.standardTitle")}</option>
              <option value="classic_4x4_pow2_undo">${t("modes.classicTitle")}</option>
              <option value="board_3x3_pow2_no_undo">${t("modes.compactTitle")}</option>
            </select></label>
            <label><span>${t("leaderboard.metric")}</span><select data-leaderboard-filter data-leaderboard-metric>
              <option value="score">${t("leaderboard.score")}</option>
              <option value="speed">${t("leaderboard.speed")}</option>
            </select></label>
            <label><span>${t("leaderboard.period")}</span><select data-leaderboard-filter data-leaderboard-period>
              <option value="all">${t("leaderboard.all")}</option>
              <option value="day">${t("leaderboard.day")}</option>
              <option value="week">${t("leaderboard.week")}</option>
              <option value="month">${t("leaderboard.month")}</option>
            </select></label>
            <label><span>${t("leaderboard.target")}</span><select data-leaderboard-filter data-leaderboard-target>
              <option value="2048">2048</option><option value="4096">4096</option><option value="8192">8192</option><option value="16384">16384</option><option value="32768">32768</option>
            </select></label>
          </div>
          <p class="leaderboard-status" data-leaderboard-status>${t("leaderboard.loading")}</p>
          <div class="leaderboard-list" data-leaderboard-list></div>
          <div class="empty-state" data-leaderboard-empty hidden>
            <span class="empty-state__mark" aria-hidden="true">#</span>
            <strong>${t("leaderboard.empty")}</strong>
          </div>
        </section>
      </dialog>

      <dialog class="app-dialog" data-offline-gate aria-labelledby="offline-gate-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("gate.eyebrow")}</p>
          <h2 id="offline-gate-title">${t("gate.title")}</h2>
          <p>${t("gate.body")}</p>
          <div class="dialog-actions">
            <button class="action-button action-button--primary" type="button" data-action="close-offline-gate">${t("gate.stayOffline")}</button>
            <button class="text-button" type="button" data-action="show-privacy-notes">${t("gate.reviewPrivacy")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog" data-auth-gate aria-labelledby="auth-gate-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("authGate.eyebrow")}</p>
          <h2 id="auth-gate-title">${t("authGate.title")}</h2>
          <p>${t("authGate.body")}</p>
          <div class="dialog-actions">
            <button class="action-button action-button--primary" type="button" data-action="close-auth-gate">${t("authGate.action")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog app-dialog--compact" data-restart-dialog aria-labelledby="restart-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("game.title")}</p>
          <h2 id="restart-title">${t("restart.title")}</h2>
          <p>${t("restart.body")}</p>
          <div class="dialog-actions dialog-actions--split">
            <button class="action-button action-button--secondary" type="button" data-action="cancel-restart">${t("restart.cancel")}</button>
            <button class="action-button action-button--primary" type="button" data-action="confirm-restart">${t("restart.confirm")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog app-dialog--compact" data-pending-terminal-dialog aria-labelledby="pending-terminal-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("pendingTerminal.eyebrow")}</p>
          <h2 id="pending-terminal-title">${t("pendingTerminal.title")}</h2>
          <p>${t("pendingTerminal.body")}</p>
          <div class="dialog-actions dialog-actions--split">
            <button class="action-button action-button--secondary" type="button" data-action="pending-terminal-undo">${t("pendingTerminal.undo")}</button>
            <button class="action-button action-button--primary" type="button" data-action="pending-terminal-confirm">${t("pendingTerminal.confirm")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog app-dialog--compact" data-delete-dialog aria-labelledby="delete-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("delete.eyebrow")}</p>
          <h2 id="delete-title" data-delete-title>${t("delete.title")}</h2>
          <p data-delete-body>${t("delete.body")}</p>
          <div class="dialog-actions dialog-actions--split">
            <button class="action-button action-button--secondary" type="button" data-action="cancel-delete">${t("delete.cancel")}</button>
            <button class="danger-button" type="button" data-action="confirm-delete">${t("delete.confirm")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog app-dialog--compact" data-account-logout-dialog aria-labelledby="account-logout-title">
        <div class="dialog-plate">
          <p class="eyebrow">${t("logout.eyebrow")}</p>
          <h2 id="account-logout-title">${t("logout.title")}</h2>
          <p>${t("logout.body")}</p>
          <p data-account-logout-summary></p>
          <p data-account-logout-timeout hidden>${t("logout.timeout")}</p>
          <div class="dialog-actions dialog-actions--split">
            <button class="action-button action-button--secondary" type="button" data-action="cancel-account-logout">${t("logout.cancel")}</button>
            <button class="danger-button" type="button" data-action="confirm-account-logout">${t("logout.confirm")}</button>
          </div>
        </div>
      </dialog>

      <dialog class="app-dialog app-dialog--compact" data-account-deletion-dialog aria-labelledby="account-deletion-title">
        <form class="dialog-plate" data-account-deletion-form>
          <p class="eyebrow">${t("accountDeletion.eyebrow")}</p>
          <h2 id="account-deletion-title">${t("accountDeletion.title")}</h2>
          <p>${t("accountDeletion.body")}</p>
          <label class="auth-field">
            <span>${t("accountDeletion.password")}</span>
            <input name="password" type="password" autocomplete="current-password" maxlength="256" required>
          </label>
          <p class="auth-issue" data-account-deletion-issue role="alert" hidden></p>
          <div class="dialog-actions dialog-actions--split">
            <button class="action-button action-button--secondary" type="button" data-action="cancel-account-deletion">${t("accountDeletion.cancel")}</button>
            <button class="danger-button" type="submit">${t("accountDeletion.confirm")}</button>
          </div>
        </form>
      </dialog>

    </div>
  `;
}
