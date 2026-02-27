Review the pull request: $ARGUMENTS

Follow these steps in order:

## 1. Identify the PR

If $ARGUMENTS is a PR number, run: `gh pr view $ARGUMENTS --patch`
If $ARGUMENTS is empty, run: `gh pr view --patch` (uses current branch's open PR)
Also run `gh pr view $ARGUMENTS` (without --patch) to get the title, description, and any comments.

## 2. Run automated checks

Run `npm run verify` and report the result (lint + format + zeus build).
If it fails, that is a blocker — report exactly which stage failed and why.

## 3. Review the diff

Systematically evaluate every changed file. For each file, check:

### Correctness
- Logic errors, off-by-one mistakes, wrong conditionals
- State that isn't reset properly between page visits (ZeppOS pages persist `let` module-level vars across `onDestroy`/`onInit` — check for explicit resets)
- Timer/interval leaks — is `clearInterval` called in both `onHide` and `onDestroy`?
- Gesture/key handlers — is `offGesture()` / `offKey()` called in `onDestroy`?

### ZeppOS patterns
- Navigation: data should flow via `params: JSON.stringify({...})`, not globalData
- Timer accuracy: use `Date.now() - startTime`, not accumulated tick counts
- Widget null checks before calling `setProperty`
- `catch (e)` with unused `e` — should be `catch { }` (optional catch binding)
- Background services: single-shot `onInit`, alarm-chained for recurrence
- Storage: all data keys go through `getKey()` from `utils/storage.js` to respect dev mode prefix

### Code quality
- Unused imports or variables
- Magic numbers that should be constants in `utils/constants.js`
- Duplicated logic that belongs in a shared util
- New vibration patterns should be added to `utils/vibration.js`, not inline

### Assets
- Any new images referenced in widgets must exist under `assets/raw/`
- Sprite paths follow the pattern `raw/pokemon/{id}.png` and `raw/types/{typeId}.png`

### app.json
- New pages must be registered under `targets.amazfit-balance.module.page.pages`
- New services must be registered under `targets.amazfit-balance.module.app-service.services`
- New permissions required by new APIs must be added to `permissions`

## 4. Output format

Structure your review as:

**Verdict:** APPROVE / REQUEST CHANGES / COMMENT

**Automated checks:** pass / fail (with details if fail)

**Issues** (if any):
- 🔴 Blocker: [description + file:line]
- 🟡 Warning: [description + file:line]
- 🔵 Suggestion: [description + file:line]

**Summary:** 2–4 sentence overview of what the PR does and your overall assessment.
