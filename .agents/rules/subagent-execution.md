# Subagent Execution Conventions

When dispatching subagents via the `agy` CLI in this workspace:
- Do NOT pass short aliases like `--model flash` or `--model pro`.
- Always use the exact installed model string recognized by the CLI.
- For lightweight/cheapest sufficient tasks, use:
  ```bash
  agy -p "<task>" --model "Gemini 3.8 Flash (Low)"
  ```
- When running asynchronous tasks, track status via `manage_task` or wait using `schedule` notifications without tight busy-wait loops.
