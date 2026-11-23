# LaunchPAD cloud workspaces

Open **Settings** and find **Supabase cloud workspaces**. Select **LaunchPAD** to sign in to an existing shared account. Use the same project and account on each device. Select **Copy my local workspace** during sign-in to seed a new cloud workspace with this device’s tasks, castle state, and growth progress. An existing cloud workspace opens with its saved data.

## Enable public registration for the shared project

Account creation in the shared project is hidden by default. Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), set the production Auth Site URL and allowed redirects, and verify that a non-team email can register, confirm, and sign in. The built-in Supabase mail provider is restricted to team addresses. After verifying delivery, set the GitHub Actions repository variable `LAUNCHPAD_CLOUD_SIGNUP` to `true`, or set `VITE_LAUNCHPAD_CLOUD_SIGNUP=true` at build time on other hosts. This flag controls the LaunchPAD UI. Use the Supabase Auth settings to control registration at the service.

## Add another project

1. Apply [the LaunchPAD workspace migration](./migrations/20261109110454_create_launchpad_workspaces.sql) and [the real-time migration](./migrations/20261109112456_enable_launchpad_realtime.sql) in the other project’s SQL Editor or migration pipeline. The built-in LaunchPAD project already has these changes.
2. Enable email and password sign-in in that project. If email confirmation is enabled, configure the Auth Site URL and allowed redirects for your LaunchPAD address.
3. In LaunchPAD’s cloud workspace settings, choose **Add another project**. Enter its name, hosted Supabase project URL, and publishable key. Add the same profile on each device where you want to use it.
4. Sign in with an account from that project. Each project and account has its own workspace. The **Switch to local workspace** button returns to device-only data.

## Sync behavior

LaunchPAD syncs tasks, checklists, castle accountability (state, purchases, and ledger), and growth records. Each browser keeps appearance (light/dark mode), device preferences, scratchpad notes, and OpenRouter credentials in its account-specific cache. Older cloud workspaces retain their previously saved history for first-time recovery on a device. Running timers also stay on the device, and logged time syncs with the task.

An opened workspace keeps an offline copy in this browser and retries on reconnection. Other devices’ changes are checked while the app is visible and when it regains focus. If both copies have unsynced edits, LaunchPAD pauses sync and asks which to keep. Export the device copy through **Data Backup & Storage Health** if you want to preserve both versions.

The Supabase publishable key identifies the project. Supabase Auth and row-level security restrict each workspace row to its owner.
