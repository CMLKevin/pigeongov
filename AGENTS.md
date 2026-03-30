# AGENTS.md — pigeongov

## What This Is

`PigeonGov` is a local-first government workflow platform for the United States. 34 workflows across 13 domains — tax, immigration, healthcare, benefits, education, veterans, identity, legal, estate, retirement, unemployment, business, and permits. The engine is exposed through both a CLI (with `--json` structured output) and an MCP server so agents can call the same workflows programmatically.

This repository targets the 2025 tax year for returns filed in 2026. Tax constants reflect the IRS filing values in force for 2025 returns.

## Architecture

```text
CLI       -> human interaction, file I/O, terminal display
MCP       -> agent interface, structured tool results (20 tools)
Engine    -> pure tax math, validation, and mapping
Advisory  -> life events, eligibility screener, decision support
Schemas   -> versioned form definitions by tax year
Workflows -> domain-specific workflow definitions and bundle builders
```

Rules:
- The engine never does I/O.
- The CLI and MCP layers handle all I/O.
- Every output that can be reviewed by a human or agent includes `flaggedFields`.
- No user data is logged.

## MCP Tools (20)

### Workflow tools
| Tool | Description |
|------|-------------|
| `list-workflows` | List all workflows with optional domain filter |
| `describe-workflow` | Get full workflow description with sections, fields, starter data, and schema |
| `start-workflow` | Get starter data JSON for a workflow |
| `fill-workflow` | Fill a workflow with data and return the complete bundle |
| `validate-workflow` | Validate a filled workflow bundle |
| `review-workflow` | Get a structured review summary with flagged fields |
| `build-packet` | Build a complete packet from a filled bundle |
| `explain-flag` | Explain a specific flagged field with suggested next steps |

### Form tools (legacy)
| Tool | Description |
|------|-------------|
| `list-forms` | List available form schemas by tax year |
| `describe-form` | Describe a specific form schema |
| `fill-form` | Fill a form with data |
| `validate-form` | Validate a form |
| `review-form` | Review a form |
| `extract-document` | Extract structured data from a source PDF |
| `calculate-tax` | Run the deterministic tax calculator |

### Advisory tools
| Tool | Description |
|------|-------------|
| `plan-life-event` | Get prioritized workflow plan for a life event |
| `screen-eligibility` | Run eligibility screening for a benefits workflow |
| `deadlines` | Get filing deadlines and key dates for a workflow |
| `fees` | Get filing fees, processing times, and cost breakdowns |
| `glossary` | Look up government terminology with official definitions |

## CLI Commands for Agents

All commands support `--json` for structured output.

```bash
# Core workflow operations
pigeongov workflows list --json
pigeongov workflows describe tax/1040 --json
pigeongov fill tax/1040 --json --data ./input.json
pigeongov validate ./bundle.json --json
pigeongov review ./bundle.json --json
pigeongov start tax/1040 --json

# Advisory commands
pigeongov life-event job-loss --json
pigeongov screen benefits/snap --json --data ./household.json
pigeongov deadlines tax/1040 --json
pigeongov fees immigration/naturalization --json
pigeongov glossary "adjusted gross income" --json

# Utility commands
pigeongov doctor --json
pigeongov drafts list --json
pigeongov testdata tax/1040 --json
pigeongov merge bundle1.json bundle2.json --json
```

## Structured Output Contract

Every `--json` response follows this shape:

```json
{
  "success": true,
  "workflowId": "tax/1040",
  "data": { ... },
  "validation": {
    "valid": false,
    "flaggedFields": [
      {
        "field": "wages",
        "severity": "warning",
        "message": "Wages are zero but filing status is not dependent."
      }
    ]
  },
  "review": {
    "headline": "...",
    "sections": [ ... ]
  }
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success. Bundle is valid. |
| 1 | Validation errors. Bundle has flagged fields with `severity: "error"`. |
| 2 | Input error. Missing or malformed input data. |
| 3 | System error. Unexpected failure. |

## Pipeline Composition

Agents can compose workflows into multi-step pipelines:

```bash
# 1. Get starter data
pigeongov start tax/1040 --json > starter.json

# 2. Fill with data
pigeongov fill tax/1040 --json --data starter.json > bundle.json

# 3. Validate
pigeongov validate bundle.json --json

# 4. Review
pigeongov review bundle.json --json

# 5. Life event planning
pigeongov life-event marriage --json

# 6. Eligibility screening
pigeongov screen benefits/snap --json --data household.json
```

MCP tools follow the same pipeline -- `start-workflow` -> `fill-workflow` -> `validate-workflow` -> `review-workflow` -> `build-packet`.

## Current Scope — 34 Workflows

### Tax (1)
- `tax/1040` — Federal individual return (1040, Schedule 1, B, C, D, Form 8949)

### Immigration (5)
- `immigration/family-visa-intake` — Family visa packet
- `immigration/naturalization` — N-400 eligibility
- `immigration/green-card-renewal` — I-90 filing
- `immigration/daca-renewal` — DACA renewal
- `immigration/work-authorization` — I-765 EAD

### Healthcare (2)
- `healthcare/aca-enrollment` — ACA marketplace
- `healthcare/medicare-enrollment` — Medicare with IRMAA

### Benefits (6)
- `benefits/snap` — SNAP eligibility
- `benefits/section8` — Section 8 voucher
- `benefits/wic` — WIC program
- `benefits/liheap` — LIHEAP energy
- `benefits/medicaid` — Medicaid eligibility
- `benefits/ssdi-application` — SSDI intake

### Education (3)
- `education/fafsa` — FAFSA readiness
- `education/student-loan-repayment` — IDR comparison
- `education/529-planner` — 529 projections

### Veterans (3)
- `veterans/disability-claim` — VA disability
- `veterans/gi-bill` — GI Bill estimation
- `veterans/va-healthcare` — VA healthcare

### Identity (4)
- `identity/passport` — Passport application
- `identity/name-change` — Name change
- `identity/voter-registration` — Voter registration
- `identity/real-id` — REAL ID readiness

### Legal (3)
- `legal/small-claims` — Small claims filing
- `legal/expungement` — Expungement eligibility
- `legal/child-support-modification` — Child support modification

### Estate (3)
- `estate/basic-will` — Will planner
- `estate/power-of-attorney` — POA planner
- `estate/advance-directive` — Advance directive

### Retirement (1)
- `retirement/ssa-estimator` — Social Security estimator

### Unemployment (1)
- `unemployment/claim-intake` — Unemployment claim

### Business (1)
- `business/license-starter` — Business license *(preview)*

### Permits (1)
- `permits/local-permit-planner` — Local permits *(preview)*

## State Tax Coverage

**Full calculators:** CA, NY, IL, PA, NC, MI, GA, VA, NJ, OH

**No income tax:** AK, FL, NV, NH, SD, TN, TX, WA, WY

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

## Adding a New Workflow

1. Create a workflow definition in `src/workflows/domains/`.
2. Define Zod input schema, starter data, sections, evidence logic, and validation/review rules.
3. Register the domain in `src/workflows/registry.ts`.
4. The shared bundle contract means CLI, TUI, site, and MCP inherit automatically.
5. Add tests for registry behavior, CLI output, and MCP tool integration.

## Adding a New Tax Year

1. Create a new directory under `src/schemas/<year>/`.
2. Add the form definitions for that year.
3. Register the year in the schema index.
4. Keep engine math pure so the same calculator can be validated independently.
5. Add test fixtures for the new year before changing behavior.

## Privacy Expectations

- No telemetry.
- No cloud uploads.
- No hidden network calls with user data.
- No PII in logs or error output.

## Documentation Expectations

- Keep README, PRIVACY, and AGENTS aligned with the actual product behavior.
- Document any new forms, workflows, or tax-year changes when they land.
- Prefer concise, practical explanations over marketing language.
