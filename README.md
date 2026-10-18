# Ascend — calisthenics skill trees

A free, offline-capable web app (PWA) for calisthenics skill progression. No build step, no dependencies. It's plain HTML, CSS and JavaScript.

## Features

- **Skill wheel**: the edge is split into the major muscle groups (Back, Core, Legs, Shoulders & Arms), each sized by how many skills it holds. Every skill is a straight chain from the centre (its own foundation exercises) outward, placed in its main muscle group and ordered toward neighbouring groups it also uses. Steps are evenly spaced, so short, easier chains finish near the middle and long, hard ones reach the edge. The skill's name sits at the tip of its branch: grey while in progress, neon blue once mastered. Straight branches between nearby skills are the jump routes, and placement is computed from the muscle data, so new skills position themselves.
- **20 skill chains**: Pull-up, Muscle-up, Front Lever, Human Flag (back); Dragon Flag, L-Sit, Elbow Lever (core); Pistol Squat, Dragon Squat, Cossack Squat, Bodyweight Squat, Bulgarian Split Squat, Wall Sit Calf Raises, Standing Calf Raises, Nordic Curl (legs); Handstand, Headstand, Frog Stand, Tuck Planche, Planche (shoulders & arms). Each starts with its own foundation exercises, and every step has a mastery target and form cues. All chains are open from day one.
- **Unlocks**: logging a session that hits the target for every set masters the step and unlocks the next one.
- **Shared exercises**: an exercise that sits in several skills (planche lean, pull-ups, hollow body hold, frog stand, tuck planche…) is ticked off everywhere when you master it in one — every copy with the same or an easier target is marked **Shared**. Undo the original and the copies go too. XP is only counted once.
- **Profile & starting point**: onboarding records your stats, benchmark tests and where you are in each tree. You can edit them later on the Profile tab.
- **Weekly schedule & daily plan**: the app picks your training days and spreads rest between them (5 days → Mon Tue Thu Fri Sat). Each day follows a movement-based split: full body for 2–3 days a week; Pull + Core alternating with Push + Legs for 4–6; plus an active-recovery day for 7. A muscle pattern trained hard one day (e.g. vertical pull, straight-arm push) is never trained hard the next, and today's plan avoids tiring the main muscles tomorrow's session needs. Focus skills come up 2–3× a week and neglected chains rotate in. Within a session, jump tests and balance work come first and foundation work last. The Today screen shows the week; tap a day to preview it. Plans and custom daily goals are saved per day.
- **Support work**: focus skills also get one exercise you've already mastered — from earlier in the chain or a linked chain, picked for the muscles your current step needs most — for 2 sets after the main exercises. Its target rises about 10% each time you hit it (e.g. bodyweight squats 3×20 → 2×22 → 2×24…) up to 1.5× the mastery target, then holds there. Each skill rotates between up to 3 such exercises, so each comes back about weekly; recovery rules still apply, an exercise is never done twice in one day, and it never affects unlocking. The skill page lists them with their next target.
- **Cross-tree jumps (biomechanics)**: every step is tagged with the movement patterns it demands (vertical pull, straight-arm pull, press, compression…). Your strength profile, built from mastered steps, practice and benchmark tests, can open a **jump test** in another tree. Pass it and up to 3 earlier steps are credited as *transfer*. Technique, straight-arm (tendon) and mobility steps are never skipped. Each step also lists the trees it **also builds**, and daily plans favour two-for-one exercises.
- **Time estimates** (on each skill's page): how long the next step and the full skill are likely to take at a steady pace, as a range. The current step uses the trend of your logged sets (the weakest of the sets mastery needs); later steps use a typical time from how big a jump in difficulty each one is, scaled by your own pace on steps you've already mastered. It assumes the skill comes up on every training day for its movement group (a "Make focus skill" button makes sure it does), shows "Building strength" instead of a date while your sets hold steady, and never assumes rushing. **Calibration:** the app replays every step you've mastered through training (what would the estimate have said after 0, 1, 2… sessions, and how long did it really take?) and learns a personal correction from the misses. Until 3 such steps are in, estimates are marked "Rough · calibrating"; after that they're "Calibrated", with ranges sized by how accurate your past estimates were. Existing history counts, so calibration can be ready right away.
- **XP & levels**, weekly streaks, day-complete bonus.
- **Plateau detection**: if your best set hasn't improved in 14 days, you get a volume block and other suggestions.
- **Voice notes**: tap the mic in a workout's Note field and speak — the text is added after anything already typed. It uses the browser's built-in speech recognition (Safari, Chrome, Edge; the audio is processed by Apple or Google). Where that isn't available the mic is hidden and your keyboard's own dictation key works instead.
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
| XP values, levels, plateau rules, weekly schedule & split, plan generator, jump logic | `js/engine.js` |
| Movement patterns, step demands, gates, jump branches, muscle groups | `js/biomech.js` |
| Colours / theme (dark only) | tokens at the top of `css/app.css` |
| Skill wheel / track drawing | `js/wheel.js` |
| Workout-complete / level-up screens | `js/celebrate.js` |
| Screens | `js/views/*.js` |
| App name / icon | `index.html`, `manifest.webmanifest`, `icons/` |

If you add new files, list them in `sw.js` and bump `CACHE` so they work offline.
