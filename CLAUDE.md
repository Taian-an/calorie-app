# calorie-app

Expo / React Native app (iOS, Android, web) for Calorie Tracks — the main product. The back end lives in `Taian-an/calorie-server`; deploy the web build with `./deploy.sh --with-web` from the parent `SP/` folder.

## Working rules

- Only one Claude conversation edits this repo at a time.
- Before changing anything, run `git status`. If there are changes you didn't make, stop and ask before touching or committing them.
- Commit each finished piece of work right away; don't leave uncommitted changes for the next conversation.
- After adding a package with native code, run `LANG=en_US.UTF-8 pod install` in `ios/` (a missing pod once made the iOS build crash on launch).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on Taian-an/calorie-app (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
