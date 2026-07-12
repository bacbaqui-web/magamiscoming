# BACBAQUI AGENTS.md

## Purpose

This project is developed primarily with OpenAI Codex.
Always read this file before making significant changes.

---

## Communication Rules

- Communicate in Korean.
- Explain technical issues in simple language.
- Be concise but clear.
- When a bug is found, explain the cause before proposing major changes.

---

## Development Philosophy

Prioritize:

1. Working features
2. Stability
3. Simplicity
4. Maintainability

Avoid unnecessary complexity.

---

## Code Quality

- Use ESLint.
- Use Prettier.
- Keep functions small and readable.
- Avoid duplicate code.
- Remove dead code when safe.
- Prefer clear code over clever code.

---

## Before Completing Any Task

Always:

1. Check for syntax errors.
2. Check ESLint warnings and errors.
3. Format code with Prettier.
4. Verify modified functionality still works.
5. Review changed files.
6. Report exactly what changed.

---

## Frontend Rules

This project is usually:

- HTML
- CSS
- JavaScript
- GitHub Pages

Requirements:

- Mobile-friendly UI
- Do not break existing layouts
- Preserve existing features unless explicitly instructed
- Keep UI clean and practical
- Avoid unnecessary animations

---

## Git Rules

When asked to deploy:

1. Review changed files.
2. Create a meaningful commit message.
3. Commit changes.
4. Push changes.

After push:

- Report commit message.
- Report branch name.
- Report whether push succeeded.

---

## Safety Rules

Ask for confirmation before:

- deleting large sections of code
- changing authentication systems
- changing storage systems
- changing deployment methods
- changing project architecture
- removing existing features

---

## User Preferences

Project owner preferences:

- Practical solutions over theoretical solutions
- Fast implementation over over-engineering
- Minimal dependencies
- Clear bug explanations
- Korean communication
- GitHub Pages friendly solutions

---

## VS Code Environment

Assume the following tools may be available:

- OpenAI Codex
- ESLint
- Prettier
- GitLens
- Error Lens
- Path Intellisense
- Import Cost
- Codex Finish Notifier

Use them when helpful.

---

## Task Completion Report

At the end of every task provide:

### Summary

- What changed
- Why it changed

### Files

- List modified files

### Validation

- Syntax checked
- ESLint checked
- Formatting checked

### Git

- Commit completed? (Yes/No)
- Push completed? (Yes/No)

### Risks

- Remaining issues
- Recommended next steps

In addition to the chat response, create a Markdown report that can be shown directly to GPT.

- Save the latest report as `current_task.md` in the project root.
- Overwrite `current_task.md` at the end of every task so it always describes the latest task.
- Write the entire report in Korean.
- Include the original request, implementation details, changed files, validation results, Git status, risks, and recommended next plan.
- Clearly distinguish completed work from unverified or remaining work.
- Include `current_task.md` in the final changed-files list.

---

## Special Instruction

Before making major changes, first inspect the project structure and existing codebase.

Do not assume.

Verify first.
