# LaunchPAD

LaunchPAD is a personal focus dashboard. Use it to choose your next task, see how much time is left in your day, and reflect on what you finished. It can also be the landing page for a site blocker such as Time Snatch.

## Get started

1. Open **New task** and add a title. Add a time estimate, deadline, priority, or checklist when useful.
2. Use **Primary Focus** to work on one task, or open **Tasks** to review your list. The dashboard shows the time available and upcoming commitments.
3. When you mark a task done, use the clock to report the actual time you spent. You can copy the duration from your own time tracker.
4. Open **Daily review** to reflect on completed work. LaunchPAD records reflections and progress in your workspace.

The scratchpad holds quick notes. Ema, the companion, can be paused from Settings. Use **Ctrl+K** or **Cmd+K** to search tasks.

## Castle accountability

The Castle is optional. When activated, it uses virtual dollars earned through reflected work. The **Accountability** window shows goals, commitments, exemptions, and available missions. Check commitment eligibility and the potential deduction before committing. Open **Store** to buy materials and select an owned piece to see where it fits.

## Workspaces and backups

Start with a local workspace. Your data is saved in the browser on the current device. Use **Settings → Data Backup & Storage Health** to export a JSON backup, and keep an export before clearing browser data or changing devices. Follow the recovery notice if another tab saves first.

Cloud workspaces are optional. Existing accounts can sign in to the shared project, and you can also connect a project you manage. See [cloud setup and sync behavior](supabase/README.md).

## Development and release

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The GitHub Pages workflow runs the test suite, builds the application, and publishes `dist/` on pushes to the configured release branch. For another static host, build with `npm run build` and serve `dist/` over HTTPS. Use the published dashboard URL as the redirect target in a site blocker.

Before publishing a release candidate, test task completion and reflection, concurrent local and offline edits, backup and restore, and Castle purchase and placement with isolated data. Check the desktop and mobile layouts and keyboard navigation. Keep shared-project account creation disabled unless email confirmation has been verified in production.
