---
name: pigeongov
description: Government workflow intelligence — tax calculation, benefits eligibility, immigration tracking, life event planning, cost estimation, benefits cliff analysis, and cross-agency dependency mapping. Use when the user asks about government forms, taxes, immigration, benefits, or life events that trigger government interactions.
triggers:
  - tax
  - taxes
  - IRS
  - 1040
  - immigration
  - USCIS
  - green card
  - visa
  - benefits
  - SNAP
  - Medicaid
  - Medicare
  - Social Security
  - passport
  - name change
  - voter registration
  - unemployment
  - FAFSA
  - student loans
  - small claims
  - expungement
  - will
  - government forms
  - filing
  - life event
  - got married
  - lost my job
  - had a baby
  - retiring
  - moving states
  - benefits cliff
  - what do I qualify for
  - how much will it cost
  - case status
  - processing time
---

# PigeonGov — Government Intelligence for AI Agents

34 workflows across 13 government domains. Local-first, privacy-first. The only tool that models cross-agency dependencies.

## Setup

```bash
npm install -g pigeongov
# Or use without installing:
npx pigeongov --help
```

## Core Intelligence Commands (always use --json)

```bash
# Life events — "what do I need to do?"
pigeongov life-event job-loss --json
pigeongov life-event marriage --json
pigeongov life-event new-baby --json

# Cross-agency dependencies — "what else does this trigger?"
pigeongov dependencies immigration/naturalization --json

# Benefits cliff — "will a raise cost me benefits?"
pigeongov cliff --income 32000 --household 4 --json

# Eligibility screening — "what do I qualify for?"
pigeongov screen --input screener-data.json --json

# Cost estimates — "how much will this cost?"
pigeongov cost immigration/naturalization --json

# USCIS case tracking (only command that makes network calls)
pigeongov track WAC2590123456 --json

# Processing times (offline)
pigeongov track --offline --form I-485 DUMMY0000000 --json
```

## Workflow Commands

```bash
# List all 34 workflows
pigeongov list --json

# Fill a workflow with data
pigeongov fill tax/1040 --data input.json --json

# Get starter data template
pigeongov start tax/1040 --json

# Validate a bundle
pigeongov validate bundle.json --json

# Review a bundle
pigeongov review bundle.json --json

# Extract data from PDFs
pigeongov extract w2.pdf --json
```

## Reference Commands

```bash
# Government deadlines
pigeongov deadlines --json

# Filing fees
pigeongov fees --json

# Glossary lookup
pigeongov glossary "AGI" --json
```

## MCP Server

```bash
# Add to Claude Code
claude mcp add pigeongov -- npx pigeongov serve

# Add to Codex
codex mcp add pigeongov -- npx pigeongov serve
```

## Screener Input Format

For `pigeongov screen --input <file>`, the JSON needs:
```json
{
  "householdSize": 4,
  "annualHouseholdIncome": 28000,
  "state": "CA",
  "citizenshipStatus": "us_citizen",
  "ages": [35, 33, 5, 2],
  "hasDisability": false,
  "employmentStatus": "employed",
  "isVeteran": false,
  "hasHealthInsurance": true,
  "monthlyRent": 1200
}
```

## When to Use

- User asks about ANY government form, process, or filing
- User mentions a life event (marriage, job loss, baby, retirement, moving, divorce, disability)
- User needs to know what benefits they qualify for
- User asks about tax filing, deductions, credits, or tax situations
- User asks about immigration forms, case status, processing times, or costs
- User wants to know how a raise affects their benefits (cliff analysis)
- User needs cost estimates (DIY vs attorney) for government processes
- User asks about deadlines, fees, or government terminology

## Privacy

Everything runs locally except `pigeongov track` (USCIS API call). No telemetry, no cloud, no PII logged. The tool never submits anything to any government agency.
