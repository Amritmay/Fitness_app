# Ascend — calisthenics skill trees

A free, offline-capable web app (PWA) for calisthenics skill progression. No build step, no dependencies. It's plain HTML, CSS and JavaScript.

## Features

- **Skill wheel**: every tree is a spoke and every step is a dot. Mastered steps are green, your current step is a glowing blue dot, and locked steps are grey.
- **9 skill trees + Foundation**: Pull-up, Muscle-up, Front Lever, Handstand, Planche, L-Sit, Dragon Flag, Human Flag, Pistol Squat. Each step has a mastery target and form cues.
- **Unlocks**: logging a session that hits the target for every set masters the step and unlocks the next one. Some trees need steps from other trees first (e.g. Muscle-up needs 3×8 pull-ups and dips).
- **Profile & starting point**: onboarding records your stats, benchmark tests and where you are in each tree. You can edit them later on the Profile tab.
- **Daily plan**: generated from your focus skills, session length and weekly target. It balances push/pull/core/legs, avoids training the same skill two days in a row, and suggests rest days. Plans and custom daily goals are saved per day.
- **XP & levels**, weekly streaks, day-complete bonus.
- **Plateau detection**: if your best set hasn't improved in 14 days, you get a volume block and other suggestions.
- **Rest timer** (floating, survives navigation), **hold stopwatch** with lead-in countdown and target beep.
- **Progress**: activity heatmap, weekly XP, per-exercise charts, benchmark charts, milestones, full history.
- **Backup**: export/import JSON from the Profile tab.

## Run it on your Mac

```bash
cd ~/Desktop/Fitness_app && python3 -m http.server 8000
```

Then open http://localhost:8000.

## Put it on your iPhone (free)

The service worker and "works offline" need HTTPS, so host the folder on a free static host:

- **Netlify Drop**: go to https://app.netlify.com/drop and drag the `Fitness_app` folder in. You get an `https://…netlify.app` link.
- **GitHub Pages**: push this folder to a GitHub repo, then Settings → Pages → deploy from `main`.

Open the link in **Safari → Share → Add to Home Screen**. Your data lives on the phone, so use **Export backup** now and then.

## Devices & browsers

- **iPhone / iPad (iOS & iPadOS 26+, incl. 27)**: Safari → Share → Add to Home Screen (leave "Open as Web App" on). The page uses the default status bar (tinted by `theme-color`) instead of `black-translucent`, which blurs the top of the page on iOS 26+. If you installed an older version, remove the icon and add it again so iOS picks up the change. Phones and portrait iPads get a bottom tab bar; screens 900 px and wider get a sidebar.
- **Desktop** (Chrome, Edge, Safari, Firefox): sidebar layout, workouts open in a centred dialog. Shortcuts: `1`–`4` switch tabs, `Esc` closes dialogs, and `Space`/`Enter` stops the hold stopwatch. Install with the address-bar install icon (Chrome/Edge) or File → Add to Dock (Safari).
- **Backups on iPhone**: Export opens the Share sheet; choose **Save to Files**.
- Timer beeps on iPhone stay silent while the ring/silent switch is set to silent, and iOS can't play the end-of-rest beep while the app is in the background. Timers keep counting, though, so they're correct when you come back.
- Every install (phone, laptop, each browser) keeps its own data. Use Export/Import to move data between them.

## Customise

| What | Where |
| --- | --- |
| Skills, steps, targets, form cues, tree requirements | `js/data.js` |
| XP values, levels, plateau rules, plan generator | `js/engine.js` |
| Colours / theme (dark only) | tokens at the top of `css/app.css` |
| Skill wheel / track drawing | `js/wheel.js` |
| Workout-complete / level-up screens | `js/celebrate.js` |
| Screens | `js/views/*.js` |
| App name / icon | `index.html`, `manifest.webmanifest`, `icons/` |

If you add new files, list them in `sw.js` and bump `CACHE` so they work offline.
