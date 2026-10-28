# Cohort 3.0 Tracker (React)

A learning tracker for the Job Ready AI Powered Cohort 3.0 syllabus: 9 episodes, 159 chapters, spaced revision,
daily routine alarms, focus timer, mentors (Hindi/Hinglish/English YouTube), LeetCode-style practice log, XP and badges.
Everything is stored in your browser (optionally AES-GCM encrypted). No backend.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: model, links, crypto and UI flows
npm run build    # static site in dist/ (hash routing, so any static host works)
```

## Structure

```
src/
  data/curriculum.js     episodes, chapters, mentors, practice platforms
  lib/
    model.js             state shape, normalize(), pure selectors, badges
    crypto.js            PBKDF2 (250k) -> AES-GCM vault
    storage.js           localStorage wrapper with memory fallback
    links.js             YouTube/practice link builders + URL allow-listing
    audio.js             alarm beep + generated ambient noise
  state/
    FxProvider           toasts + confetti
    TrackerProvider      state (immer), vault/lock, autosave, idle lock, badges
    AlertsProvider       routine alarms (also while locked)
    TimerProvider        Pomodoro timer (survives auto-lock)
  components/            Shell, Gate (setup/lock), Palette (Ctrl+K), Icon, Bits
  pages/                 Dashboard, Learn, Mentors, Practice, Routine, Focus, Revise, Stats, Settings
tests/
```

## Moving over from the single-file version

The saved data format is unchanged. In the old page open Settings > Backup, copy a backup, then paste it in
Settings > Backup here and press "Restore from pasted backup" (encrypted backups need their passcode).

## Notes

- Data lives in `localStorage` keys `lt_*`. Different origins do not share it, so use a backup to move between hosts.
- Alarms ring only while a tab is open. There is no passcode recovery by design.
- YouTube links are search URLs (always valid) plus pins you add yourself; practice links point at each platform's main page.
