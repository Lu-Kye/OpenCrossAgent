# Requirement Understanding

Transform vague ideas into clear, actionable specifications with measurable acceptance criteria.

## When to Use

- Starting a new feature or project before writing code
- Refining a rough idea into a design through collaborative questioning
- Creating acceptance criteria for implementation tasks
- Before delegating work to agents

## Process

### 1. Context Discovery

- Check project state (files, docs, recent commits, existing skills)
- Ask questions **one at a time** — prefer multiple choice over open-ended
- Focus on understanding: purpose, constraints, success criteria
- Only move forward when the "why" is clear

### 2. Problem Definition

Probe beyond surface-level requests to uncover the root problem:

| Step | Question |
|------|----------|
| 1 | What is the surface-level request? |
| 2 | What is the user actually trying to accomplish? |
| 3 | What is the business value? |
| 4 | Who benefits and how? |
| 5 | What features may be needed now or later? |
| 6 | What constraints exist? |

**Distinguish needs (problems to solve) from wants (proposed solutions).** Challenge assumptions.

### 3. Concept Extraction

Identify the core elements:

- **Actors**: Who interacts with this feature?
- **Actions/Behaviors**: What does the system do?
- **Data Entities**: What data is involved?
- **Constraints**: What limitations exist?
- **Implicit Assumptions**: What is assumed but not stated?

### 4. Approach Exploration

Generate 6 possible approaches with trade-offs:
- 3 high-probability (>0.80) — mainstream solutions
- 3 diverse (<0.10) — explore different regions of solution space

Present options conversationally with your recommendation and reasoning. Lead with the recommended option.

### 5. Requirements Analysis

Define functional and non-functional requirements with precision:

**Functional Requirements** — specific and testable:
- BAD: "Upload should be fast"
- GOOD: "Upload of a 10MB file completes within 30 seconds on standard broadband"

**Non-Functional Requirements** — with measurable targets:
- Performance, Security, Scalability, Usability, Compatibility

**User Scenarios**:
- Primary flow (happy path)
- Alternative flows
- Error scenarios

### 6. Acceptance Criteria

Every criterion must be:

| Quality | Rule |
|---------|------|
| Measurable | Include specific metrics (time, percentage, count) |
| Technology-agnostic | Never mention frameworks, languages, databases |
| User-focused | Describe outcomes from user/business perspective |
| Verifiable | Testable without knowing implementation details |

Use Given/When/Then format for complex criteria:

```markdown
- [ ] **[Criterion]**: [Description]
  - Given: [Precondition]
  - When: [Action]
  - Then: [Observable outcome]
```

### 7. Scope Definition

Explicitly define boundaries to prevent scope creep:

- **In Scope**: Bullet list of what's included
- **Out of Scope**: Bullet list of what's explicitly excluded
- **Boundary Cases**: Edge cases to consider

Maximum 3 clarification markers — use reasonable defaults for the rest.

### 8. Incremental Validation

Present the design in sections of 200-300 words. After each section, check whether it looks right. Be ready to go back and clarify.

## Output Template

```markdown
# Description

[What is being built/changed/fixed]
[Why this is needed — business value]
[Who will use/benefit from this]
[Key constraints]

## Scope
- **Included**: [...]
- **Excluded**: [...]

## User Scenarios
1. **Primary Flow**: [...]
2. **Alternative Flow**: [...]
3. **Error Handling**: [...]

## Acceptance Criteria
### Functional Requirements
- [ ] **[Criterion]**: Given/When/Then

### Non-Functional Requirements
- [ ] **Performance**: [Specific metric]
- [ ] **Security**: [Specific requirement]

### Definition of Done
- [ ] All acceptance criteria pass
- [ ] Tests written and passing
- [ ] Documentation updated
```

## Key Principles

- **One question at a time** — don't overwhelm with multiple questions
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Explore alternatives** — always propose approaches before settling
- **Focus on WHAT and WHY** — never HOW (no implementation details)
- **Vague requirements cause implementation failures** — be specific or be wrong
- **Untestable criteria waste developer time** — every criterion must be verifiable
