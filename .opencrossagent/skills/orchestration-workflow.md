# Orchestration Workflow

Multi-agent orchestration workflow for cross-agent systems. Defines how to plan, parallelize, and execute tasks across multiple agents with quality gates.

## Overview

```
Task (draft)
    |
    v
Phase 1: Parallel Analysis          Phase 2: Implementation
    |                                    |
    +-> Research (researcher)            +-> For each step:
    +-> Codebase Analysis (researcher)  |   +-> Developer agent
    +-> Business Analysis (architect)   |   +-> Reviewer agent (quality gate)
    |                                    |   +-> Pass? Next step : Retry
    v                                    v
Phase 1.5: Architecture Synthesis    Phase 3: Definition of Done
    |                                    |
    +-> Architect -> Decompose          +-> Verify all DoD items
    +-> Team Lead -> Parallelize        +-> Fix failures
    |                                    |
    v                                    v
Task (todo, ready for implementation)  Task (done)
```

## Phase 1: Planning

### 1a. Parallel Analysis

Launch three analysis streams **in parallel**:

| Stream | Agent | Purpose |
|--------|-------|---------|
| Research | `researcher` | Gather resources, libraries, prior art. Create reusable skill. |
| Codebase Impact | `researcher` | Identify affected files, interfaces, integration points |
| Business Analysis | `architect` | Refine description, create acceptance criteria |

Each stream writes findings to a scratchpad file. Orchestrator **must not read implementation files** — delegate everything.

### 1b. Architecture Synthesis

**Agent**: `architect`

Synthesize research + codebase analysis + business requirements into:
- Solution strategy with key decisions
- Component design with file paths and responsibilities
- Expected changes (files to create/modify/delete)
- Architecture pattern selection (layered/hexagonal/clean/event-driven/etc.)

**Must be decisive** — never present multiple options without choosing one. A developer must be able to implement using ONLY this blueprint.

### 1c. Decomposition

**Agent**: `architect` (acting as tech-lead)

Break architecture into implementation steps using Least-to-Most decomposition:

1. List subproblems from simplest to most complex
2. Each step delivers testable value
3. Steps ordered by dependency — no forward dependencies
4. Each step has: Goal, Expected Output, Success Criteria, Subtasks
5. Trivial actions (install/delete/copy) **must be folded** into consuming steps

**Step sizing**: Too Small/Trivial = defect. Small = <4h. Medium = <1 day. Large = 1-2 days. Break if >Large.

### 1d. Parallelization

**Agent**: `team-lead`

Reorganize steps for maximum parallel execution within bounded width:

- **Target ~3 parallel steps**, min 1, max 5 (hard cap — orchestrator context grows non-linearly)
- Steps with same dependencies **MUST** run in parallel
- Merge tightly coupled steps (single consumer, atomic operations, same-file edits)
- Assign agents based on **OUTPUT type**, not input analysis

**Agent selection by output**:

| Output Type | Agent |
|-------------|-------|
| Documentation | `tech-writer` or `opus` |
| Source code | `developer` |
| Architecture/design | `architect` |
| Code review | `reviewer` |

**Model selection**: `opus` (default), `sonnet` (high-volume repetitive), `haiku` (trivial mechanical).

## Phase 2: Implementation

### Execution Rules

1. **Read ONLY the task file** — never read implementation artifacts directly
2. For each step, launch a `developer` agent with focused prompt
3. After implementation, launch `reviewer` agent(s) based on verification level
4. Apply threshold gate: PASS → next step, FAIL → retry with feedback
5. Maximum 3 iterations per step, then proceed with warning

### Verification Levels

| Level | When | Reviewers | Threshold |
|-------|------|-----------|-----------|
| None | Trivial operations (mkdir, config) | 0 | N/A |
| Single Judge | Non-critical artifacts | 1 | >= 4.0/5.0 |
| Panel of 2 | Critical artifacts | 2 (parallel, median voting) | >= 4.0/5.0 |
| Per-Item | Multiple similar items | 1 per item (parallel) | >= 4.0/5.0 per item |

### Retry Flow

```
Developer agent → Reviewer agent → PASS? → Next step
                               → FAIL? → Developer retry with feedback → Reviewer retry
                                          → Max iterations? → Proceed with warning
```

### Panel Voting (Panel of 2)

- Median of `combined_score` from 2 reviewers
- High variance (difference > 2.0): flag and ask user
- Merge issue lists, de-duplicate by description+evidence

## Phase 3: Definition of Done

After all steps complete:

1. Launch verification agent to check all DoD items
2. Mark each item: PASS / FAIL / BLOCKED
3. Fix failing items via developer agent
4. Re-verify after fixes
5. Move task to done folder when all items PASS

## Task Lifecycle

```
draft/ → todo/ → in-progress/ → done/
```

- `draft/`: Created but not yet refined
- `todo/`: Planning complete, ready for implementation
- `in-progress/`: Currently being implemented
- `done/`: All steps and DoD verified

## Key Principles

- **Orchestrator delegates, doesn't implement** — never read artifact files, use agent reports
- **Foreground agents only** — background agents cause permission issues
- **Scratchpad-first** — all agents write thinking to scratchpad before updating task file
- **Self-critique mandatory** — every agent must self-verify before reporting completion
- **Score 5.0 = hallucination** — reject and re-run any judge returning perfect score
- **Context protection** — orchestrator must not read files other than the task file
