# Project context entry point

Before substantial work, read `.project-context/AGENTS.md` and the scoped project state it points to.

## Mandatory browser rule

Use ONLY Orca's built-in embedded browser for all previews, UI checks, and browser tests. External browsers (including headless Chrome/Chromium, Brave, Edge, Firefox), Playwright/Puppeteer launches, and external-browser MCP tools are prohibited. Never change, bypass, or retry around Cold Turkey. Inspect browser-test scripts before execution. If Orca cannot perform a check, report it blocked and continue other work. Read `.agents/rules/browser-testing.md` before any browser action. This overrides older browser-testing guidance and applies to every worker.
