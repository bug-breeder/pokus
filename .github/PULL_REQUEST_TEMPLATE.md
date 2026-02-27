## What

<!-- What does this PR do? One or two sentences. -->

## Why

<!-- Why is this change needed? Link any related issues. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Tooling / config
- [ ] Assets / content

## Testing

- [ ] `npm run verify` passes (lint + format + zeus build)
- [ ] Tested on device or simulator via `zeus dev`
- [ ] Tested in dev mode (Settings → toggle dev mode)
- [ ] Tested in normal mode

## ZeppOS checklist

- [ ] New pages registered in `app.json` under `module.page.pages`
- [ ] New app-services registered in `app.json` under `module.app-service.services`
- [ ] New permissions added to `app.json` `permissions` array
- [ ] New images exist under `assets/raw/` and paths match widget `src` strings
- [ ] Page-level state is reset on `onInit` (module-level `let` vars persist across revisits)
- [ ] `offGesture()` / `offKey()` called in `onDestroy` if registered
- [ ] Inter-page data passed via `params: JSON.stringify({...})`, not globalData
- [ ] Storage access goes through `getKey()` in `utils/storage.js` (dev mode prefix)

## Screenshots / demo

<!-- For UI changes, attach simulator screenshots or a short screen recording. -->
