# LaunchPAD cloud workspaces

Open **Settings, Backup & Help** and find **Supabase cloud workspaces**. Select **LaunchPAD**, create an account if needed, confirm your email, and sign in. Use the same project and account on each device. Select **Copy my local workspace** during sign-in to seed a new cloud workspace with this device’s existing tasks and progress. An existing cloud workspace opens with its saved data. For the built-in project, use your Supabase organization email when creating an account. Supabase’s default email sender only delivers to organization team addresses unless custom SMTP is configured.

## Add another project

1. Apply [the LaunchPAD workspace migration](./migrations/20261109110454_create_launchpad_workspaces.sql) and [the real-time migration](./migrations/20261109112456_enable_launchpad_realtime.sql) in the other project’s SQL Editor or migration pipeline. The built-in LaunchPAD project already has these changes.
2. Enable email and password sign-in in that project. If email confirmation is enabled, configure the Auth Site URL and allowed redirects for your LaunchPAD address.
3. In LaunchPAD’s cloud workspace settings, choose **Add another project**. Enter its name, hosted Supabase project URL, and publishable key. Add the same profile on each device where you want to use it.
4. Sign in with an account from that project. Each project and account has its own workspace. The **Switch to local workspace** button returns to device-only data.

## Sync behavior

LaunchPAD syncs tasks, checklists, scratchpad, preferences, and growth progress. OpenRouter is available in the local workspace. Its credentials stay on the device. Running timers also stay on the device, and logged time syncs with the task.

An opened workspace keeps an offline copy in this browser and retries on reconnection. Other devices’ changes are checked while the app is visible and when it regains focus. If both copies have unsynced edits, LaunchPAD pauses sync and asks which to keep. Export the device copy through **Data Backup & Storage Health** if you want to preserve both versions.

The Supabase publishable key identifies the project. Supabase Auth and row-level security restrict each workspace row to its owner.
