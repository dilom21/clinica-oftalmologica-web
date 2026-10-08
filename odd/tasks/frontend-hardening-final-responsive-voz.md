# Final Responsive + Voice Hardening

## Objective
Harden the Angular frontend's responsive administrative layout, shared voice-session lifecycle, CU15/CU16 dictation isolation, Reportes voice modal accessibility, and regression coverage without changing business contracts.

## Authorized scope
- Repository: `C:\SI2_Proyecto\clinica-oftalmologica-web` only.
- Route: delegated direct implementation with one writer.
- Skill: `frontend-ui-design`.
- Prohibited: backend, Supabase, HTTP contracts/payloads, DeepSeek behavior, new libraries, autosave, auto-preview/export, commit, push, merge.
- Preserve unrelated pre-existing working-tree changes.

## Checklist
- [x] Standardize sidebar and hamburger behavior at 820px while retaining touch support.
- [x] Make VoiceRecognitionService session-safe, idempotent, and cancellable, including fallback isolation.
- [x] Isolate and finalize CU15/CU16/Reportes voice subscriptions on every terminal outcome.
- [x] Reset CU15/CU16 dictation state correctly and preserve append/retry semantics.
- [x] Fix Reportes voice/email Escape handling, modal focus, and z-index hierarchy.
- [x] Harden responsive layouts for requested viewports without page-level horizontal overflow.
- [x] Change only `html[lang]` from `en` to `es`.
- [x] Add focused regression tests for service, CU15, CU16, Reportes, and modal behavior.
- [x] Run requested tests, build, and typecheck; attempt visual audit where tooling is available.

## Acceptance checks
- At widths <=820px the sidebar is off-canvas and its hamburger is available; above 820px the desktop sidebar is shown and the hamburger is hidden, including touch devices.
- Old SpeechRecognition callbacks cannot mutate current recognition, state, result, error, or a later attempt.
- Every voice attempt terminates its own consumers on success, error, stop, abort, permission denied, and no-speech outcomes.
- CU15/CU16 retry in another field never contaminates the previous field; append behavior remains intact; CU16 does not auto-register or invoke IA.
- Reportes Escape closes the active dialog and stops recognition; email Escape remains functional; modal focus enters and returns reasonably.
- Requested viewport layouts remain usable with internal table scrolling only where needed.

## Progress
- [x] Local inspection completed before source changes; current working tree contains unrelated prior modifications and untracked artifacts that must be preserved.
- [x] Implementation completed in the authorized frontend scope; unrelated working-tree changes were preserved.
- [x] Verification completed: 11 test files / 73 tests passed after the hardening changes.
- [x] TypeScript application check passed with `npx.cmd --no-install tsc -p tsconfig.app.json --noEmit`.
- [x] Production build completed; Angular emitted existing/component style budget warnings, but no build errors.
- [x] `git diff --check` passed; only LF/CRLF normalization warnings were reported.

## Route evidence
- Implementation route: delegated direct, because the authorized change spans multiple non-trivial service, component, template, style, and test files.
- Verification commands: `npx.cmd --no-install ng test --watch=false`, `npm run build`, `npx.cmd --no-install tsc -p tsconfig.app.json --noEmit`.
- Observed implementation evidence: shared 820px drawer rules in `src/styles.css` and `sidebar.css`; all 13 `<app-sidebar>` templates audited; legacy CU12, CU05, CU04, and Inicio sidebar rules aligned to `max-width: 820px`; session identity/terminal events in `voice-recognition.service.ts`; isolated attempt subscriptions in CU15, CU16, and Reportes; modal Escape/focus handling and z-index 50 in Reportes.
- Browser audit attempted against the local dev server, but route navigation redirected to `/login`; no authorized test credentials were available, so requested authenticated Reportes viewport checks remain unverified. Build warnings remain for oversized component styles, including pre-existing large page styles.
