---
trigger: always_on
---

# Subagent Execution & Model/Effort Routing Policy

> Project-Specific Routing Policy for `LaunchPad` (`agy -p` subagent workflow)  
> Scope: Local to this workspace only. Do not apply globally or to other projects.

---

## 1. Supported Model & Reasoning Effort Combinations

The AGY CLI model registry recognizes the following 11 exact combinations for Gemini:

| Model ID | Display Name | Supported Effort |
|---|---|---|
| `gemini-3.6-flash-low` | `Gemini 3.6 Flash (Low)` | `low` |
| `gemini-3.6-flash-medium` | `Gemini 3.6 Flash (Medium)` | `medium` |
| `gemini-3.6-flash-high` | `Gemini 3.6 Flash (High)` | `high` |
| `gemini-3.7-flash-low` | `Gemini 3.7 Flash (Low)` | `low` |
| `gemini-3.7-flash-medium` | `Gemini 3.7 Flash (Medium)` | `medium` |
| `gemini-3.7-flash-high` | `Gemini 3.7 Flash (High)` | `high` |
| `gemini-3.8-flash-low` | `Gemini 3.8 Flash (Low)` | `low` |
| `gemini-3.8-flash-medium` | `Gemini 3.8 Flash (Medium)` | `medium` |
| `gemini-3.8-flash-high` | `Gemini 3.8 Flash (High)` | `high` |
| `gemini-3.1-pro-low` | `Gemini 3.1 Pro (Low)` | `low` |
| `gemini-3.1-pro-high` | `Gemini 3.1 Pro (High)` | `high` |

> [!IMPORTANT]
> - `Gemini 3.1 Pro` supports **`low`** and **`high`** ONLY (there is no `medium` effort for Pro in the CLI registry).
> - Never use bare unmapped aliases like `--model flash` or `--model pro`.
> - Either pass the exact combined ID (e.g. `--model gemini-3.6-flash-low`) or split flags (e.g. `--model gemini-3.6-flash --effort low`).

---

## 2. Project Task-Routing Matrix

| Model & Effort | Preferred LaunchPad Use Cases |
|---|---|
| **Flash 3.6 — Low** | Simple formatting, documentation updates, mechanical comment additions, boilerplate, straightforward config changes. |
| **Flash 3.6 — Medium** | Small isolated implementations, simple utility functions, basic unit tests, straightforward bug fixes. |
| **Flash 3.6 — High** | Bounded but tricky single-file implementation problems, edge-case handling, and debugging within a well-understood component. |
| **Flash 3.7 — Low** | Routine coding tasks requiring slightly more contextual judgment than purely mechanical edits. |
| **Flash 3.7 — Medium** | Standard feature implementation, UI component development, integration of familiar APIs, and focused test development. |
| **Flash 3.7 — High** | Multi-file feature work, difficult component-level debugging, and moderately complex integration problems. |
| **Flash 3.8 — Low** | Default economical worker for routine implementation, small features, known-pattern bug fixes, and well-specified tasks. |
| **Flash 3.8 — Medium** | Cross-file changes, moderately complex features, interacting components, and implementation requiring meaningful reasoning. |
| **Flash 3.8 — High** | Complex debugging, nontrivial refactoring, subtle state-management issues, and difficult integration work requiring sustained reasoning. |
| **Gemini 3.1 Pro — Low** | Architecture and implementation-plan reviews, nuanced requirement analysis, identifying hidden assumptions, and focused code reviews. |
| **Gemini 3.1 Pro — High** | High-risk architecture decisions, difficult root-cause analysis, complex system-level bugs, security-sensitive reasoning, and major refactoring with substantial consequences. |

---

## 3. Decision Rules & Dispatch Lifecycle

### Rule A: Classify Before Dispatch
Before launching any subagent via `agy -p`, evaluate the task across 5 dimensions:
1. **Complexity**: Routine | Moderate | Complex | Critical
2. **Scope**: Single file | Multiple files | System-wide
3. **Ambiguity**: Fully specified | Requires interpretation
4. **Risk**: Reversible cosmetic | Breaking data / architectural impact
5. **Verification**: Mechanical build check | Multi-scenario edge investigation

*Default action*: Select the least expensive model and effort combination that is reasonably suited to the classified task.

### Rule B: Evidence-Based Escalation
Start with the lowest sufficient tier. Escalate model tier, effort level, or both when:
- The worker fails to produce a working solution on the initial attempt.
- The initial hypothesis is disproven by test or build outputs.
- Unexpected cross-file interactions or hidden state coupling emerge.
- *Anti-Pattern*: Do NOT repeatedly retry the same failing task with the identical model and effort. Change tier or revise the prompt strategy.

### Rule C: De-escalation for Mechanical Work
When a larger task decomposes into independent subtasks (e.g. creating documentation, mechanical test fixtures, mock data), dispatch those subtasks to lower-cost workers (**Flash 3.6 Low** or **Flash 3.7 Low**) rather than running the entire batch on high-effort models.

### Rule D: Selective Planning vs. Execution Split
For genuinely complex features:
1. Dispatch **Gemini 3.1 Pro (Low)** to review edge cases or validate the technical approach.
2. Dispatch **Flash 3.7 Medium** or **Flash 3.8 Low** to execute the verified, concrete plan.

---

## 4. Dispatch Commands & Verification

### Exact Dispatch Patterns

```bash
# 1. Mechanical Documentation / Formatting (Flash 3.6 Low)
agy -p "<prompt>" --model gemini-3.6-flash-low

# 2. Standard Feature / Component (Flash 3.7 Medium)
agy -p "<prompt>" --model gemini-3.7-flash-medium

# 3. Default Economical Feature Implementation (Flash 3.8 Low)
agy -p "<prompt>" --model gemini-3.8-flash-low

# 4. Complex Debugging & State Interactions (Flash 3.8 High)
agy -p "<prompt>" --model gemini-3.8-flash-high

# 5. High-Stakes Architecture / Nuanced Review (Gemini 3.1 Pro Low)
agy -p "<prompt>" --model gemini-3.1-pro-low
```

### Verification & Monitoring
- Dispatch tasks using `run_command` in background with reasonable `WaitMsBeforeAsync` (e.g. 5000-8000ms).
- Check execution status and logs via `manage_task` or read `.system_generated/tasks/task-<id>.log`.
- Always verify the generated diff (`git diff`) and test status (`npm run build`) upon worker completion.
