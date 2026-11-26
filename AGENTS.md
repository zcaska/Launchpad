# Project context entry point

Before substantial work, read `.project-context/AGENTS.md` and the scoped project state it points to.


## Browser use

For browser-based inspection, testing, or interaction, use only the Orca browser when available; otherwise use the ChatGPT browser if available. Do not substitute another browser, browser automation tool, or headless browser. If neither is available, report the limitation and use non-browser verification where appropriate. Ordinary HTTP/API requests are not browser use.

## Planning and delegation

Before implementation or other substantial work, break the plan into specialized tasks with dependencies and verification criteria. Delegate suitable tasks to available subagents, parallelizing independent work where safe. Select the cheapest available model and reasoning effort reasonably capable of each task, considering complexity, risk, and verification; escalate if results or evidence require it. Follow `.agents/rules/subagent-execution.md` for AGY-specific routing when applicable.

When the running agent can delegate to suitable Antigravity or OpenCode models, use those options under their applicable routing rules. When neither is available for delegation, use these Codex models where available:

- **GPT-6 Luna** (`gpt-6-luna`) for implementation and easier tasks.
- **GPT-6.1 Sol** (`gpt-6.1-sol`) for planning, verification, and complex tasks.
- **GPT-6.1 Terra** (`gpt-6.1-terra`) for reviewing changes and coordinating subagents.

Choose the reasoning effort required by each task. Escalate when the task's risk, complexity, or evidence warrants it, and avoid using GPT-6.2 Sol or Astra by default. Model availability and higher-priority instructions take precedence; do not assume a provider or model is available without checking the current delegation tool.

If subagents or model selection are unavailable, or delegation would be unsuitable for a trivial or inseparable task, proceed directly and note any relevant limitation. The coordinating agent remains responsible for integrating and verifying results.

## Castle accountability

For the virtual-dollar accountability and castle feature, read `features/castle-accountability/SPEC.md` before design, implementation, or review.
