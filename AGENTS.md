# AGENTS.md — Cursor Agent Development Guidelines

## Core Workflow

Before editing any code, **always** use CodeGraph to understand the codebase:

1. **Identify affected files** — Find all routes, components, API endpoints, and database models related to the feature.
2. **Understand existing architecture** — Do not rewrite code outside the affected area.
3. **Implement the smallest correct change** — Focus on the root cause, not symptoms.
4. **Report after every task** — Include root cause, files changed, and test results.

## CodeGraph Usage

Use `codegraph_context` for understanding a feature area, then `codegraph_explore` for specific symbol details.

```
Query: "How does task create/save work?"
Query: "Kanban board rendering flow"
Query: "Role-based permission checks"
```

**Never** grep blindly when CodeGraph can give accurate cross-file context in 1-2 calls.

## File Organization

- `apps/admin-ui/` — Next.js App Router frontend (this is where all UI work happens)
- `apps/backend-ui/` — **DO NOT MODIFY** — backend/Medusa phase 1 code
- `apps/admin-ui/lib/workspace/db/` — PostgreSQL database operations
- `apps/admin-ui/app/api/` — Next.js API route handlers
- `apps/admin-ui/components/` — React UI components

## Branch Strategy

- Work on feature branches. Commit message format: `[module] brief description`
- `main` branch is protected.

## After Every Task

Report:
1. **Root cause** — What was broken and why
2. **Files changed** — Exact file paths with change summary
3. **Test result** — Manual test steps and pass/fail status
4. **Remaining risks** — What could break or needs follow-up


# Mandatory Documentation Update

After every successful task:

1. Update affected documentation
2. Update bug tracking
3. Update changelog
4. Update implementation plan progress
5. Generate completion report

Never finish a task without updating docs.