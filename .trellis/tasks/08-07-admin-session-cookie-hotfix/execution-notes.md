# Execution Notes

## Root Cause

`/admin.html` was admitted by the server-side `next_admin_session_v1` cookie, while the administrator API client rejected requests locally when `2048_auth_token_v1` was absent. The page therefore redirected to `/404.html` without calling `/api/admin/me`.

## Verification

- RED: administrator UI test made zero fetch calls without the local token.
- GREEN: the same case calls `/api/admin/me` and grants access from the server response.

## Route Deviation

- This production regression required an emergency hotfix in an isolated worktree rather than continuing the prior third-party-import work.
- The listed Trellis `before-dev` skill file was unavailable, so repository `.trellis/spec` files were read directly.
- Browser interaction is restricted to the Codex built-in browser; no external Chrome, Playwright browser, or Computer Use fallback is permitted.
