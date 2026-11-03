# Fitness Quest

Voice-coached workouts for a 4-day spine rehab split. Pick a day, press Start, and a coach talks you through every
exercise, set, rest and side switch, with a timer and a picture of each move. Built for an iPhone Duo held open in
landscape; works on any phone, tablet or laptop. No login, no tracking.

**Live:** https://jimjiang07.github.io/FitnessQuest/

## Install it on your phone

- **iPhone / iPad:** open the live URL in Safari, tap Share, then **Add to Home Screen**. It opens full screen like an app.
- **Android / desktop Chrome:** use **Install app** in the browser menu.

**Works offline.** The first visit saves the whole app, every exercise picture and the coach's voice clips (about
9 MB) on the device, so a workout runs in a gym with no signal. A new version downloads in the background when you're
online and takes effect the next time you open the app, never in the middle of a workout.

## Change the workout

The whole plan is one YAML file: `data/plans/spine-rehab.yaml`. Edit it, run `npm run check-plan`, push.
Format and an AI conversion prompt: `docs/plan-format.md`.

## Develop

```bash
npm install
npm run dev
npm test
```

Vue 3, Vite, TypeScript, Pinia, Vue Router. Deployed to GitHub Pages on every push to `main`.
How the build is split into parallel work streams: `docs/plans/implementation-plan.md`.
The offline cache is a hand-written service worker (`public/sw.js`); `build/precache-plugin.ts` writes the list of
built files and a content hash into it at build time, so any change ships a fresh cache.

## Credits

Exercise photos: free-exercise-db (public domain), PTPioneer (CC BY 2.0), Christy Collins (CC BY-SA 3.0).
Full list: `public/exercises/CREDITS.md`, also shown on the app's About screen. Coach voice: Microsoft neural voice
via edge-tts.
