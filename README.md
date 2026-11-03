# Fitness Quest

Voice-coached workouts for a 4-day spine rehab split. Pick a day, press Start, and a coach talks you through every
exercise, set, rest and side switch, with a timer and a picture of each move. Built for an iPhone Duo held open in
landscape; works on any phone, tablet or laptop. No login, no tracking.

**Live:** https://jimjiang07.github.io/FitnessQuest/

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

## Credits

Exercise photos: free-exercise-db (public domain), PTPioneer (CC BY 2.0), Christy Collins (CC BY-SA 3.0).
Full list: `public/exercises/CREDITS.md`.
