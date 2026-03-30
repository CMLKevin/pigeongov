# AGENTS.md — pigeongov

## What This Is

`PigeonGov` is a local-first CLI for filling, validating, and reviewing U.S. government forms. The same engine is also exposed through an MCP server so agents can call the same workflows programmatically.

This repository targets the 2025 tax year for returns filed in 2026. The current 2025 tax constants should reflect the IRS filing values in force for 2025 returns, including later 2025 law changes where applicable.

## Architecture

```text
CLI  -> human interaction, file I/O, terminal display
MCP  -> agent interface, structured tool results
Engine -> pure tax math, validation, and mapping
Schemas -> versioned form definitions by tax year
```

Rules:
- The engine never does I/O.
- The CLI and MCP layers handle all I/O.
- Every output that can be reviewed by a human or agent should include `flaggedFields`.
- No user tax data should be logged.

## Current Scope

- Form 1040
- Schedule 1
- Schedule C
- W-2 intake
- 1099-NEC intake
- 1099-INT intake

## Coding Conventions

- Use strict TypeScript.
- Use Zod for schema boundaries.
- Keep tax math deterministic and pure.
- Prefer local file operations over network activity.
- Mask SSNs in terminal prompts.
- Display currency with `$` and commas.

## 2025 Tax-Year Notes

- Use the current IRS 2025 filing values, not older inflation-only estimates where later 2025 law changed the number.
- Standard deduction, brackets, child tax credit, and self-employment tax rules should match the current IRS 2025 filing guidance.
- If a value is ambiguous, prefer the current IRS filing page or form instructions over an older bulletin.

## Adding a New Tax Year

1. Create a new directory under `src/schemas/<year>/`.
2. Add the form definitions for that year.
3. Register the year in the schema index.
4. Keep engine math pure so the same calculator can be validated independently.
5. Add test fixtures for the new year before changing behavior.

## Adding a New Form

1. Define the form schema in the year directory.
2. Add validation rules for cross-field consistency.
3. Add any needed PDF mapping.
4. Update CLI and MCP discovery lists.
5. Add tests that prove the new form behaves correctly.

## CLI Expectations

- `pigeongov fill <form-id>` should guide the user through a small walkthrough, not dump one giant form.
- `pigeongov validate <file>` should validate a previously saved JSON return.
- `pigeongov review <file>` should print a readable review summary.
- `pigeongov extract <pdf>` should extract structured data from a source PDF.
- `pigeongov serve` should start the MCP interface for local agent use.

## Privacy Expectations

- No telemetry.
- No cloud uploads.
- No hidden network calls with user data.
- No PII in logs or error output.

## Documentation Expectations

- Keep README, PRIVACY, and AGENTS aligned with the actual product behavior.
- Document any new forms, workflows, or tax-year changes when they land.
- Prefer concise, practical explanations over marketing language.
