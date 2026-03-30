# PigeonGov Full Platform Expansion — Design Spec

**Date:** 2026-03-30
**Status:** Draft
**Scope:** ~150 features across 7 categories, transforming PigeonGov from a 6-workflow form filler into a comprehensive government workflow advisory platform.

---

## Table of Contents

1. [Guiding Principles](#1-guiding-principles)
2. [Phase 1: Infrastructure Foundation](#2-phase-1-infrastructure-foundation)
3. [Phase 2: Tax Engine Depth](#3-phase-2-tax-engine-depth)
4. [Phase 3: New Workflow Domains](#4-phase-3-new-workflow-domains)
5. [Phase 4: Intelligence & Advisory](#5-phase-4-intelligence-advisory)
6. [Phase 5: Developer Platform](#6-phase-5-developer-platform)
7. [Phase 6: UX & Interface](#7-phase-6-ux-interface)
8. [Phase 7: Analytics & Community](#8-phase-7-analytics-community)
9. [Architecture Decisions](#9-architecture-decisions)
10. [Data Models](#10-data-models)
11. [File Structure](#11-file-structure)
12. [Testing Strategy](#12-testing-strategy)
13. [Implementation Order Rationale](#13-implementation-order-rationale)

---

## 1. Guiding Principles

These are inviolable constraints that apply to every feature:

- **Local-first, always.** No cloud uploads, no telemetry, no PII in logs. Every feature must work offline. Network calls are opt-in, user-initiated, and clearly labeled.
- **Deterministic engines.** Calculations produce identical output for identical input. No randomness, no ML inference in the critical path. Auditable by design.
- **Multi-surface parity.** Every workflow accessible via CLI, TUI, web planner, and MCP. New features must define their interface contract for all four surfaces.
- **Human review, never auto-submit.** PigeonGov prepares, validates, and flags. It never submits anything to any government system. The human always has final review.
- **Progressive complexity.** Simple cases should be simple. Advanced features (AMT, crypto, audit risk) appear only when relevant data triggers them.
- **Zod at all boundaries.** Every input, output, and inter-module contract validated with Zod schemas. No `any` types crossing module boundaries.

---

## 2. Phase 1: Infrastructure Foundation

These are cross-cutting capabilities that every subsequent feature depends on. Build first.

### 2.1 Save & Resume

**Problem:** Nobody fills a tax return or immigration packet in one sitting. Currently, if you quit mid-workflow, you start over.

**Design:**
- On each section completion, auto-save to `~/.pigeongov/drafts/<workflow-id>-<timestamp>.json`
- Draft format: `{ workflowId, version, sections: { [sectionId]: { answers, completedAt } }, resumePoint }`
- On `pigeongov fill tax/1040`, check for existing drafts. If found: "Resume from Section 3 (Income)? [Y/n]"
- Drafts are Zod-validated on load — if the workflow schema changed, run a migration or warn
- `pigeongov drafts` lists all in-progress work
- `pigeongov drafts clean` removes drafts older than 90 days (configurable)
- MCP tool: `resume-workflow` accepts a draft ID

**Files:**
- `src/drafts/store.ts` — read/write/list/clean drafts
- `src/drafts/migrate.ts` — schema version migration
- `src/drafts/types.ts` — draft schema (Zod)

### 2.2 Encrypted Document Vault

**Problem:** People need to store sensitive documents (SSN cards, tax returns, immigration packets) locally with some protection beyond filesystem permissions.

**Design:**
- `~/.pigeongov/vault/` — AES-256-GCM encrypted files
- Master password → PBKDF2 → encryption key. Key cached in memory for session duration
- `pigeongov vault add w2-2025.pdf --tag tax,2025` — encrypts and stores
- `pigeongov vault list [--tag tax]` — lists stored documents (metadata is encrypted too)
- `pigeongov vault get <id> --out ./decrypted.pdf` — decrypt to temp file, auto-delete after 5 min
- `pigeongov vault link <id> <workflow-id>` — associate a vault document with a workflow
- On macOS: option to use Keychain for master password storage
- Vault index: `vault-index.enc` — encrypted JSON mapping IDs to metadata (tags, filename, size, addedAt, linkedWorkflows)
- No cloud backup. No recovery if password lost. This is a feature, not a bug.

**Files:**
- `src/vault/crypto.ts` — encrypt/decrypt with Node.js `crypto` module
- `src/vault/store.ts` — vault CRUD operations
- `src/vault/types.ts` — vault entry schema
- `src/cli/commands/vault.ts` — CLI subcommands

### 2.3 Expanded PDF Intelligence

**Problem:** Currently detects W-2, 1099-NEC, 1099-INT. Real tax preparation involves many more document types, and many documents are scanned photos.

**Design:**
- **New document detectors:** 1098, 1095-A, 1099-DIV, 1099-B, 1099-R, K-1, pay stubs, state W-2 equivalents
- Each detector: `{ detect(text): boolean, extract(text): Record<string, unknown>, confidence: number }`
- **OCR layer:** Tesseract.js (WASM) for scanned/photographed documents
  - `pigeongov extract scan.jpg` → deskew → OCR → detect type → extract fields
  - Confidence scoring: OCR'd fields get lower confidence than native PDF text
  - Flag all OCR'd values for human review
- **Batch processing:** `pigeongov extract ./tax-docs/` → process all PDFs/images, output summary table
- **PDF merge:** `pigeongov packet merge --cover "Family Visa Application" file1.pdf file2.pdf ...`
  - Generates cover page with table of contents
  - Page numbers across merged document
  - Evidence checklist as appendix

**Files:**
- `src/pdf/detectors/` — one file per document type
- `src/pdf/ocr.ts` — Tesseract.js wrapper
- `src/pdf/batch.ts` — batch processing orchestrator
- `src/pdf/merge.ts` — PDF merge with cover page generation
- `src/pdf/deskew.ts` — image preprocessing

### 2.4 Cross-Workflow Data Sharing

**Problem:** A household's identity, address, income, and dependents are entered separately for each workflow. Tax income should match healthcare income should match unemployment wages.

**Design:**
- **Household profile:** `~/.pigeongov/profile.json` — shared identity data
  - `{ people: [{ id, firstName, lastName, ssn, dob, relationship }], address, income: { sources: [...] } }`
  - Zod schema, encrypted at rest (uses vault crypto)
- When starting any workflow, offer to pre-fill from profile
- When a workflow produces income data (tax return), offer to update profile
- Cross-workflow validation: "Your ACA enrollment shows household income of $52,000 but your 1040 shows AGI of $67,000 — which is correct?"
- Profile is never auto-shared. Each workflow asks: "Use household profile? [Y/n]"

**Files:**
- `src/profile/store.ts` — profile CRUD
- `src/profile/types.ts` — household profile schema
- `src/profile/prefill.ts` — map profile data to workflow input schemas

### 2.5 Deadline Tracker

**Problem:** Government deadlines are scattered across agencies, vary by state, and have real consequences when missed.

**Design:**
- Each workflow definition gets an optional `deadlines` field:
  ```ts
  deadlines?: Array<{
    label: string;           // "Tax filing deadline"
    date: string | ((state: string) => string);  // "2026-04-15" or function
    type: "hard" | "soft";   // hard = penalty, soft = recommendation
    consequence: string;     // "Late filing penalty of 5% per month"
    extensionAvailable: boolean;
  }>
  ```
- `pigeongov deadlines` — shows all upcoming deadlines across all workflows, sorted by date
- `pigeongov deadlines --export ics` — generate ICS calendar file
- Deadline-aware workflow routing: "ACA open enrollment closes in 12 days — start now?"
- MCP tool: `list-deadlines` with optional domain/date-range filters

**Files:**
- `src/deadlines/tracker.ts` — deadline aggregation and sorting
- `src/deadlines/ics.ts` — ICS calendar export
- Deadline data lives in each workflow definition in the registry

### 2.6 Fee Calculator

**Problem:** Filing fees vary by form, state, and eligibility. People are surprised by costs.

**Design:**
- Each workflow definition gets an optional `fees` field:
  ```ts
  fees?: Array<{
    label: string;           // "USCIS filing fee"
    amount: number;          // in cents
    waiverEligible: boolean;
    waiverCriteria?: string; // "Income below 150% FPL"
    paymentMethods: string[];
  }>
  ```
- `pigeongov fees tax/1040` — "No filing fee (e-file). Paper filing: $0. Extension: $0."
- `pigeongov fees immigration/family-visa-intake` — "I-130: $675. I-485: $1,440. Biometrics: $85. Total: $2,200. Fee waiver may apply."
- MCP tool: `calculate-fees`

**Files:**
- Fee data in workflow definitions
- `src/fees/calculator.ts` — aggregation, waiver eligibility check

### 2.7 Internationalization Framework

**Problem:** 13% of the US population speaks Spanish at home. Immigration workflows are used by people whose first language isn't English.

**Design:**
- **i18n key system:** All user-facing strings replaced with keys: `t('tax.1040.section.income.title')`
- **Translation files:** `locales/en.json`, `locales/es.json`, `locales/zh-CN.json`
- **Locale detection:** `--locale es` flag, `PIGEONGOV_LOCALE` env var, or OS locale
- **Fallback chain:** requested locale → `en` → raw key
- **What gets translated:** prompts, section titles, evidence labels, validation messages, review summaries, CLI help text
- **What doesn't:** field names in JSON bundles (always English for interop), IRS form line numbers, legal form names
- Start with English (complete) and Spanish (priority workflows: immigration, healthcare, SNAP, unemployment)
- Chinese Simplified as third locale

**Files:**
- `src/i18n/index.ts` — `t()` function, locale loading
- `src/i18n/types.ts` — translation key type safety
- `locales/en.json`, `locales/es.json`, `locales/zh-CN.json`

### 2.8 Plain Language Glossary

**Problem:** Government forms use jargon that confuses people. "Adjusted Gross Income" means nothing to someone filing for the first time.

**Design:**
- **Glossary entries:** `{ term, abbreviation?, plainLanguage, officialDefinition, source, relatedTerms[] }`
- **Per-domain glossaries:** tax terms, immigration terms, healthcare terms, etc.
- **CLI:** `pigeongov glossary "AGI"` → plain language explanation + official definition + IRS source
- **CLI integration:** `--explain` flag on any workflow shows glossary tooltips inline
- **TUI:** help panel shows glossary for focused field
- **Web:** tooltip on hover for any jargon term
- **MCP tool:** `explain-term` — agents can look up terms for users

**Files:**
- `src/glossary/terms/tax.ts`, `src/glossary/terms/immigration.ts`, etc.
- `src/glossary/index.ts` — lookup, search, related terms
- Glossary entries are static data, not runtime-computed

---

## 3. Phase 2: Tax Engine Depth

### 3.1 New Forms & Schedules

Each new form follows the existing pattern: Zod schema in `src/schemas/2025/`, field mapper in `src/engine/`, detector in `src/pdf/detectors/`.

| Form | Purpose | Complexity | Dependencies |
|------|---------|------------|--------------|
| Schedule B | Interest/dividend detail | Low | Triggers at $1,500 threshold |
| Schedule D | Capital gains/losses | High | Needs Form 8949 |
| Form 8949 | Sales & dispositions | High | Broker CSV import |
| Schedule E | Rental/partnership income | Medium | K-1 import |
| Schedule SE (full) | SE tax detail | Low | Expands existing simplified calc |
| Form 6251 | AMT | High | Parallel tax calculation |
| Form 8962 | Premium tax credit | Medium | Links to ACA workflow |
| Form 8889 | HSA | Medium | Contribution tracking |
| Form 1040-ES | Estimated quarterly | Medium | Safe harbor logic |
| Form 1040-X | Amended return | Medium | Diff against original bundle |
| Form 4868 | Extension | Low | Estimated payment calc |

**Architecture:** Each form is a module with:
- `schema.ts` — Zod input/output shapes
- `calculator.ts` — computation logic
- `mapper.ts` — input → form line mapping
- `validator.ts` — arithmetic checks
- `pdf-template.ts` — PDF field coordinates for filling

The tax calculator orchestrator (`src/engine/tax-calculator.ts`) gains a plugin registry: forms register themselves with the orchestrator, declaring their trigger conditions and dependencies.

### 3.2 Crypto & Modern Income

**Crypto tax handling:**
- Import transactions from CSV (Coinbase, Kraken, Binance export formats)
- Cost basis methods: FIFO (default), LIFO, specific identification
- Wash sale detection for crypto (apply equities rules even though IRS hasn't mandated — conservative approach)
- Staking/lending income → ordinary income on Schedule 1
- NFT gains → Form 8949 (collectibles rate if held >1 year)
- DeFi liquidity provision → complex, flag for professional review

**Gig economy:**
- Multiple 1099-NEC aggregation on Schedule C
- Standard mileage vs. actual expense comparison
- Home office: simplified method ($5/sq ft, max 300 sq ft) vs. actual method with depreciation
- Quarterly estimated tax calculation from projected Schedule C income

**Stock compensation:**
- RSU: vesting event → W-2 income + cost basis for future sale
- ISO: exercise → potential AMT preference item, disposition → ordinary vs. capital
- ESPP: discount → ordinary income on disposition, holding period tracking
- NSO: exercise spread → W-2 income

**Files:**
- `src/engine/crypto/` — transaction parser, cost basis calculator, wash sale detector
- `src/engine/gig/` — multi-1099 aggregator, mileage calculator, home office
- `src/engine/equity/` — RSU/ISO/ESPP/NSO handlers
- `src/schemas/2025/schedule-d.ts`, `form-8949.ts`, etc.

### 3.3 Intelligence Layer

**What-if scenario engine:**
- `pigeongov whatif tax/1040 --base bundle.json`
- Interactive: "What if filing status were MFJ instead of Single?"
- Shows side-by-side: original vs. scenario, with delta highlighted
- Multiple scenarios can be compared simultaneously
- MCP tool: `tax-whatif` accepts base bundle + modifications, returns comparison

**Missed deduction detector:**
- Rule set keyed by profession, life events, income profile
- Example rules:
  - Teacher with no educator expense deduction → flag
  - Self-employed with no health insurance deduction → flag
  - Student loan interest paid (1098-E) not claimed → flag
  - Charitable donations > $250 without acknowledgment letter → flag
- Runs automatically after tax calculation, adds to review summary
- `pigeongov suggestions tax/1040 bundle.json`

**Audit risk scorer:**
- Statistical model based on published IRS audit rate data by income bracket
- Flags: Schedule C loss > 3 years running, home office on W-2 income, charitable deductions > 30% AGI, large cash business with low reported income
- Score: 1-10 with explanation of contributing factors
- Explicitly caveated: "This is not legal advice. This is a statistical estimate based on published IRS data."

**Filing status optimizer:**
- For married taxpayers: calculate actual liability under MFJ and MFS
- Show dollar difference and which credits are lost under MFS (EITC, education credits, etc.)
- Recommend optimal status with reasoning

**Tax projection:**
- Based on current year return, project next year assuming same income
- User can toggle planned changes: marriage, child, home purchase, retirement contributions
- Shows projected refund/owed and marginal rate

**Marginal decision calculator:**
- "If I earn $X more" → marginal rate, credit phase-out impact, total additional tax
- "If I contribute $Y to 401k" → tax savings, net cost of contribution
- "If I convert $Z from Traditional to Roth IRA" → conversion tax, future benefit estimate

**Files:**
- `src/engine/scenarios/` — what-if engine, comparison renderer
- `src/engine/suggestions/` — missed deduction rules, profession-keyed rule sets
- `src/engine/audit-risk/` — risk scorer, contributing factor explanations
- `src/engine/optimizer/` — filing status, contribution, marginal calculators

### 3.4 State Tax Returns

**Architecture:**
- `src/schemas/2025/state/<state-code>.ts` — state-specific schema
- `src/engine/state/<state-code>/calculator.ts` — state tax calc
- `src/engine/state/<state-code>/constants.ts` — brackets, deductions, credits
- `src/engine/state/common.ts` — shared state tax logic (AGI modifications, standard patterns)

**Priority states (by population + tax complexity):**
1. California (CA) — most complex, progressive brackets, SDI
2. New York (NY) — state + city tax, STAR credit
3. Illinois (IL) — flat tax, simple
4. Pennsylvania (PA) — flat tax, local earned income tax
5. Ohio (OH) — brackets + local RITA/CCA
6. Georgia (GA) — standard brackets
7. North Carolina (NC) — flat tax
8. Michigan (MI) — flat tax + city income tax
9. New Jersey (NJ) — progressive brackets
10. Virginia (VA) — progressive brackets

**No-income-tax states** (TX, FL, WA, NV, SD, WY, AK, NH*, TN*): confirmation message, no calculation needed. (*NH and TN recently eliminated remaining taxes.)

**Federal-to-state flow:** State return reads from federal bundle. AGI modifications are state-specific (some states start from federal AGI, others from federal taxable income, others have their own income definition).

### 3.5 Multi-Year Features

**Year-over-year comparison:**
- `pigeongov compare tax/1040 2024-bundle.json 2025-bundle.json`
- Table: income, AGI, deductions, taxable, tax, credits, refund — side by side with deltas
- Flags significant changes: "Income increased 23%, refund decreased 45%"

**Carryforward tracking:**
- Capital loss carryover (Schedule D, max $3,000/year deduction, remainder carries forward)
- Charitable contribution excess (over 60% AGI limit)
- Net operating loss (if applicable)
- Stored in profile: `~/.pigeongov/carryforwards.json`

**Previous year import:**
- `pigeongov fill tax/1040 --import 2024-bundle.json`
- Pre-fills: identity, address, dependents, recurring income sources, bank account for refund
- Flags: "Last year you had 2 dependents. Still correct? [Y/n]"

---

## 4. Phase 3: New Workflow Domains

### 4.1 Workflow Architecture

Every new workflow follows the established registry pattern:

```ts
{
  id: "domain/workflow-name",
  summary: string,
  inputSchema: ZodSchema,
  starterData: () => DefaultInput,
  sections: Section[],
  buildBundle: (input) => WorkflowBundle,
  deadlines?: Deadline[],
  fees?: Fee[],
  eligibility?: EligibilityCheck[],  // NEW
  relatedWorkflows?: string[],       // NEW — for life event engine
  glossaryDomain?: string,           // NEW — which glossary to use
}
```

### 4.2 Education & Student Aid

**`education/fafsa`**
- Dependency status determination (age, marital status, veteran status, etc.)
- Income & asset collection (student + parent if dependent)
- School selection (up to 10 schools, Federal School Code lookup)
- Expected Family Contribution (EFC) / Student Aid Index (SAI) estimation
- Evidence: tax returns, bank statements, untaxed income documentation
- Flags: unusual income changes, asset sheltering patterns, dependency override situations

**`education/student-loan-repayment`**
- Current loan inventory (servicer, balance, rate, type: federal vs. private)
- Income input for IDR plan comparison
- Plan comparison engine: SAVE, PAYE, IBR, ICR, standard 10-year
  - Monthly payment, total paid, forgiveness amount, forgiveness timeline
- PSLF tracker: qualifying employer verification, payment count, projected forgiveness date
- Decision support: refinance trade-offs (lose federal protections for lower rate)

**`education/529-planner`**
- State tax deduction mapping (which states give deductions, limits)
- Contribution limits and gift tax implications
- Beneficiary flexibility rules
- Investment timeline projection

### 4.3 Social Security & Retirement

**`retirement/ssa-estimator`**
- Earnings history input (or simplified: last 10 years of income)
- Benefit calculation at ages 62, 67 (FRA), 70
- Spousal benefit comparison
- Survivor benefit estimation
- Break-even analysis: "collecting at 62 vs. 67 breaks even at age 78"
- Windfall Elimination Provision (WEP) flag for public sector workers

**`healthcare/medicare-enrollment`**
- Eligibility determination (age 65+, disability, ESRD)
- Part A/B enrollment windows and late enrollment penalties
- Part D plan comparison framework (formulary matching is complex — flag for human review)
- Medigap vs. Medicare Advantage decision tree
- Income-Related Monthly Adjustment Amount (IRMAA) calculation

**`benefits/ssdi-application`**
- Disability onset date and work history
- Medical evidence checklist (treating physicians, hospitalizations, medications)
- Substantial Gainful Activity (SGA) threshold check
- Five-step sequential evaluation framework walkthrough
- Flag: "most initial applications are denied — prepare for appeals process"

### 4.4 Identity & Vital Records

**`identity/passport`**
- New vs. renewal routing (DS-11 vs. DS-82)
- Minor passport requirements (both parents' consent)
- Photo requirements checklist
- Processing time estimates (routine, expedited, urgent)
- Fee calculation including execution fee for new applications
- Name change documentation if applicable

**`identity/name-change`**
- State-specific court filing requirements
- Cascading update checklist: SSA → DMV → passport → bank → employer → insurance → voter registration
- Required documentation per entity
- Publication requirements (some states require newspaper notice)
- Fee compilation across all entities

**`identity/voter-registration`**
- State-specific registration requirements and deadlines
- ID requirements by state
- Online vs. mail vs. in-person routing
- Same-day registration availability
- Provisional ballot information
- Address change re-registration triggers

**`identity/real-id`**
- Document checklist by state (identity, SSN, 2x residency proof)
- Acceptable document variants
- Appointment scheduling guidance
- Deadline tracking (enforcement dates)

### 4.5 Safety Net Programs

**`benefits/snap`**
- Gross and net income tests by household size
- Categorical eligibility (receiving TANF, SSI)
- Asset test (most states exempt vehicles, some have no asset test)
- Benefit amount estimation (max allotment - 30% net income)
- State-specific application routing
- Evidence: income verification, identity, residency, citizenship/immigration status

**`benefits/section8`**
- Income limits by area (AMI percentages)
- Waitlist status tracking (most have multi-year waits)
- Voucher portability rules
- Housing Quality Standards overview
- Annual recertification checklist

**`benefits/wic`**
- Categorical eligibility (pregnant, postpartum, infant, child <5)
- Income eligibility (185% FPL)
- Nutritional risk assessment routing
- State agency finder
- Adjunctive eligibility from other programs (Medicaid, SNAP, TANF)

**`benefits/liheap`**
- Seasonal application windows by state
- Income eligibility (150% FPL or 60% state median income)
- Benefit types: heating, cooling, crisis, weatherization
- Utility company coordination requirements

**`benefits/medicaid`**
- Expansion vs. non-expansion state routing (critical distinction)
- MAGI-based income calculation
- Categorical eligibility paths (age, disability, pregnancy, children)
- Managed care plan selection guidance
- Relationship to ACA marketplace (simultaneous application possible)
- Presumptive eligibility for certain groups

### 4.6 Immigration (Expanding)

**`immigration/naturalization`**
- Physical presence calculator (must be present 30 months of last 5 years)
- Continuous residence tracker (trips >6 months break continuity)
- Good moral character assessment checklist
- Civics test study guide integration (100 questions, 10 asked, 6 to pass)
- English requirement and exemptions (age + years as LPR)
- N-400 section-by-section completion
- Fee: $760 (includes biometrics)

**`immigration/green-card-renewal`**
- I-90 filing (10-year card renewal, damaged/lost replacement)
- Conditional to permanent (I-751 for marriage-based, joint filing vs. waiver)
- Re-entry permit for extended travel
- Processing time estimates

**`immigration/daca-renewal`**
- Eligibility maintenance checklist
- Continuous presence documentation
- Advance parole considerations and risks
- Renewal timeline (submit 120-150 days before expiration)
- Evidence of ongoing eligibility

**`immigration/work-authorization`**
- EAD category routing (marriage-based, asylum, student OPT, etc.)
- Processing time by category and service center
- Gap coverage strategies (expedite requests, combo card)
- Renewal timing to avoid gaps

### 4.7 Veterans

**`veterans/disability-claim`**
- Condition identification and rating estimation
- Service connection types (direct, secondary, aggravation)
- Buddy statement templates and guidance
- C&P exam preparation checklist
- Evidence: service records, medical records, nexus letters
- Combined rating calculator (VA math: not additive)

**`veterans/gi-bill`**
- Entitlement calculation (months remaining, percentage)
- School certification verification
- Monthly Housing Allowance by ZIP code
- Book/supplies stipend
- Comparison: Post-9/11 vs. Montgomery GI Bill
- Transfer to dependents eligibility

**`veterans/va-healthcare`**
- Priority group determination (1-8 based on disability, income, service)
- Means test for groups 5-8
- Copayment information by priority group
- Travel reimbursement eligibility
- Community care (if VA wait times exceed thresholds)

### 4.8 Legal & Courts

**`legal/small-claims`**
- Dollar limit by state ($2,500 to $25,000)
- Filing fee calculation by state and amount
- Statute of limitations by claim type
- Evidence organization: receipts, contracts, photos, correspondence
- Service of process requirements
- Counterclaim preparation

**`legal/expungement`**
- Eligibility screening by state and offense type
- Waiting period calculation from completion of sentence
- Petition preparation checklist
- Required documentation: court records, proof of completion, character references
- Fee waiver eligibility

**`legal/child-support-modification`**
- Material change in circumstances documentation
- Income change calculation (threshold for modification varies by state)
- Current order analysis
- Supporting evidence: pay stubs, tax returns, medical expenses
- Parenting time credit adjustments

### 4.9 Estate & Family

**`estate/basic-will`**
- State-specific requirements (witness count, notarization, holographic wills)
- Asset inventory guidance
- Beneficiary designation review (retirement accounts, insurance — these bypass the will)
- Executor selection considerations
- Guardian designation for minor children
- Output: structured will template (not legal document — flag for attorney review)

**`estate/power-of-attorney`**
- Durable vs. springing distinction
- Healthcare POA vs. financial POA (often separate documents)
- State-specific form requirements
- Agent selection guidance
- Revocation procedures

**`estate/advance-directive`**
- Living will preferences (life support, feeding tube, pain management)
- HIPAA authorization for health information sharing
- State-specific form requirements
- Distribution plan (copies to physician, hospital, agent, family)

---

## 5. Phase 4: Intelligence & Advisory

### 5.1 Life Event Engine

**Core concept:** Government interactions cluster around life events. Instead of browsing a workflow catalog, the user says "I just had a baby" and gets a prioritized action plan.

**Life events and their workflow mappings:**

| Life Event | Triggered Workflows |
|------------|-------------------|
| New baby | Tax (dependent, CTC), Health insurance (add to plan or new plan), SSN application, birth certificate |
| Marriage | Tax (filing status), Name change, Insurance update, Beneficiary updates, Immigration (if applicable) |
| Divorce | Tax (filing status), Child support, Name change (optional), Insurance separation, Asset division |
| Job loss | Unemployment claim, ACA enrollment (special enrollment), SNAP eligibility, COBRA evaluation, 401k rollover |
| Retirement | SSA benefits, Medicare enrollment, Tax (retirement income), Pension/401k distribution planning |
| Moving states | Voter re-registration, Driver's license, Vehicle registration, State tax filing change, School enrollment |
| Death of spouse | Survivor benefits (SSA), Tax (filing status), Probate, Life insurance claim, Account transfers |
| Buying a home | Mortgage interest deduction, Property tax records, Homestead exemption, Insurance, Permits |
| Starting a business | Business license, EIN application, Tax (Schedule C), State registration, Permits, Insurance |
| Becoming disabled | SSDI application, Medicaid, FMLA documentation, ADA accommodations, Tax (disability income) |
| Aging into Medicare | Medicare enrollment, Medigap/MA comparison, Part D enrollment, Retiree insurance coordination |
| Immigration status change | Work authorization, Tax (ITIN vs SSN), Healthcare eligibility change, Driver's license eligibility |

**Design:**
- `pigeongov life-event` — interactive selection from event list
- `pigeongov life-event "job loss"` — direct event
- Output: prioritized workflow list with deadlines, estimated time to complete each, and document dependencies
- "Start with unemployment claim (deadline: 7 days from last day). While waiting for approval, begin ACA enrollment (special enrollment period: 60 days). Then assess SNAP eligibility."
- MCP tool: `plan-life-event` — agents can generate action plans

**Files:**
- `src/advisory/life-events/events.ts` — event definitions and workflow mappings
- `src/advisory/life-events/planner.ts` — prioritization logic, deadline-aware ordering
- `src/advisory/life-events/types.ts` — event schema

### 5.2 Universal Eligibility Screener

**Core concept:** Answer 10 questions, get back every program you might qualify for.

**Design:**
- Intake questions: household size, household income, state, citizenship/immigration status, age of all members, disability status, employment status, assets (simplified), current insurance status, veteran status
- Each workflow registers eligibility criteria:
  ```ts
  eligibility?: {
    check: (intake: ScreenerInput) => EligibilityResult;
    confidence: "high" | "medium" | "low";
    reason: string;
  }
  ```
- Output: tiered list
  - "Likely eligible" (high confidence): SNAP, Medicaid, LIHEAP
  - "May be eligible" (medium): Section 8, WIC
  - "Worth checking" (low): SSDI, state-specific programs
  - "Not eligible" with reason: Medicare (age), VA (not veteran)
- `pigeongov screen` — interactive screener
- `pigeongov screen --json` — machine-readable
- MCP tool: `screen-eligibility`

**Files:**
- `src/advisory/screener/intake.ts` — intake questions and schema
- `src/advisory/screener/engine.ts` — runs all registered eligibility checks
- `src/advisory/screener/types.ts` — screener input/output schemas

### 5.3 Plain Language Legal Explainer

**Design:**
- Every workflow section can have `explainer` metadata:
  ```ts
  {
    fieldId: "line11_agi",
    plainLanguage: "Your income after certain deductions...",
    officialDefinition: "Per IRC Section 62...",
    source: { name: "IRS Publication 17", url: "..." },
    example: "If you earned $60,000 and contributed $3,000 to an IRA..."
  }
  ```
- CLI: `pigeongov fill tax/1040 --explain` shows explainers inline
- TUI: side panel with explainer for focused field
- Web: tooltip/sidebar on hover/click
- MCP tool: `explain-field` — already exists, extend with richer content
- Explainers are static content, reviewed for accuracy, citable

### 5.4 Decision Support Tools

**Deduction optimizer:**
- Compare standard vs. itemized with actual numbers
- Show dollar difference and recommendation
- List itemized deductions that are close to threshold

**Contribution optimizer:**
- 401k: "Contributing $X more reduces tax by $Y (marginal rate Z%)"
- IRA: Traditional vs. Roth comparison based on current vs. projected retirement bracket
- HSA: Triple tax advantage explanation with contribution limits

**Timing advisor:**
- Income deferral opportunities
- Expense acceleration (bunch deductions into one year)
- Roth conversion ladder planning

**State comparison:**
- Side-by-side: current state vs. proposed state
- Tax impact (income, property, sales)
- Program eligibility changes
- Required administrative actions (license, registration, voter)

---

## 6. Phase 5: Developer Platform

### 6.1 Plugin System

**Design:**
- `WorkflowPlugin` interface:
  ```ts
  interface WorkflowPlugin {
    name: string;
    version: string;
    workflows: WorkflowDefinition[];
    glossaryTerms?: GlossaryEntry[];
    validators?: ValidatorPlugin[];
  }
  ```
- Plugins are npm packages: `pigeongov install @community/expungement-ca`
- Plugin manifest: `~/.pigeongov/plugins.json`
- Plugin workflows appear in `pigeongov list` with `[plugin]` badge
- Plugin sandboxing: plugins cannot access vault, profile, or other plugin data
- Plugin validation: schema must pass Zod, no network calls in buildBundle

**Files:**
- `src/plugins/loader.ts` — discover and load plugins
- `src/plugins/sandbox.ts` — capability restrictions
- `src/plugins/types.ts` — plugin interface

### 6.2 Workflow Scaffolding

- `pigeongov scaffold my-domain/my-workflow`
- Generates: schema, sections, buildBundle stub, test fixture, CLI command registration, MCP tool registration
- Interactive: asks for section names, field types, evidence items
- Output: complete workflow skeleton that passes `pigeongov doctor`

### 6.3 MCP Server Hardening

**Authentication:**
- API key via `PIGEONGOV_MCP_KEY` env var or `--key` flag
- JWT support for service-to-service auth
- Key rotation support

**Rate limiting:**
- Token bucket per tool (configurable in `xmcp.config.ts`)
- Default: 60 calls/minute per tool
- Burst: 10 calls

**Audit log:**
- Append-only JSONL: `~/.pigeongov/audit.log`
- Fields: timestamp, tool, workflowId, duration, result (success/error), no PII
- `pigeongov audit [--since 2026-03-01] [--tool fill-workflow]`
- Log rotation: 10MB max, 5 files retained

**Streaming:**
- For batch operations, stream progress events via SSE
- `{ type: "progress", current: 3, total: 10, item: "w2-employer-b.pdf" }`

### 6.4 REST & OpenAPI

- Auto-generate OpenAPI 3.1 spec from workflow Zod schemas
- `GET /api/workflows` — list
- `GET /api/workflows/:id` — describe with schema
- `POST /api/workflows/:id/fill` — execute
- `POST /api/workflows/:id/validate` — validate bundle
- `GET /api/deadlines` — upcoming deadlines
- `POST /api/screen` — eligibility screener
- `POST /api/extract` — PDF extraction
- Served alongside MCP on same port, path-routed

**Files:**
- `src/api/router.ts` — Express-free router (use Node.js http module to avoid deps)
- `src/api/openapi.ts` — schema → OpenAPI spec generator
- `src/api/handlers/` — per-endpoint handlers (thin wrappers around engine)

### 6.5 Testing Infrastructure

**Synthetic data generator:**
- `pigeongov testdata tax/1040 --count 100 --output ./fixtures/`
- Generates realistic, internally consistent test taxpayers
- Configurable: income range, filing status distribution, state distribution
- Faker.js-style but deterministic (seeded PRNG)

**Snapshot testing:**
- Golden file tests: input → engine → output, compare to snapshot
- `pnpm test:snapshots` — update with `--update`
- CI: fail if snapshot changes without explicit update

**Fuzzing:**
- Zod schema → generate random valid inputs
- Run through workflow engine, assert: no crashes, all validation flags are valid severity levels, bundle output passes schema validation
- `pnpm test:fuzz --iterations 1000`

**PDF golden files:**
- Render PDF from test input, compare page-by-page to reference
- Catches layout regressions in form filling

---

## 7. Phase 6: UX & Interface

### 7.1 CLI Enhancements

- **Shell completions:** zsh, bash, fish. Workflow IDs, command flags, file paths
- **Progress bars:** ora-style spinners for PDF processing, batch operations
- **Output verbosity:** `--quiet`, `--verbose`, `--json` consistently across all commands
- **Interactive diff:** when re-filling with existing data, show changes and confirm
- **Color themes:** respect `NO_COLOR`, support `--theme` for terminal aesthetics
- **Config file:** `~/.pigeongov/config.json` — default locale, theme, output directory, verbosity

### 7.2 TUI Upgrades

- **Split-pane:** form left, live validation right
- **Section jump:** Ctrl+G → jump to any section
- **Keyboard overlay:** `?` shows contextual shortcuts
- **Workflow switcher:** Ctrl+W → switch between in-progress workflows
- **Evidence viewer:** inline display of linked vault documents

### 7.3 Web Interface Evolution

- **Real-time calculation preview:** live refund/owed estimate as user fills
- **Side-by-side comparison:** standard vs. itemized, MFJ vs. MFS
- **Tax bracket visualization:** Chart.js waterfall chart
- **Evidence upload with OCR:** Tesseract.js WASM, client-side
- **Mobile-responsive:** works on phones (government office waiting rooms)
- **Offline PWA:** service worker, works without internet
- **Dark mode:** CSS custom properties, respects `prefers-color-scheme`
- **Guided wizard mode:** step-by-step with help panels
- **Summary dashboard:** household overview, all workflows, evidence status, deadlines

### 7.4 Output & Reporting

- **Professional PDF:** styled cover page, TOC, section headers, page numbers
- **Explainer mode:** for each calculated field, show reasoning chain
- **Bundle diff:** compare two versions, highlight changes
- **Print-friendly:** formatted for paper, suitable for mailing

---

## 8. Phase 7: Analytics & Community

### 8.1 Local Usage Stats

- `pigeongov stats` — workflows completed, documents processed, estimated time saved
- All local, no network. Just counting operations in the audit log
- Fun: "You've processed $247,000 in reported income across 3 tax returns"

### 8.2 Community Benchmarks (from public data)

- Published IRS statistics (SOI data): average refund by income bracket, audit rates by category
- "Your effective tax rate of 18.3% is typical for your income bracket (IRS SOI 2024)"
- No user data shared. All comparisons use published government statistics

### 8.3 Opt-In Aggregate Reporting

- If user opts in: anonymized workflow completion rates, common validation failures
- Helps improve workflow quality (which sections confuse people)
- Explicit consent, local flag, can be revoked anytime
- Data: section IDs and drop-off rates only, no PII, no answers

---

## 9. Architecture Decisions

### 9.1 No Database

Keeping the file-based approach. Reasons:
- Consistent with local-first philosophy
- No migration headaches
- Bundles are self-contained JSON (portable, inspectable)
- Vault encryption is simpler with file-per-document
- Profile and drafts are small (single JSON files)

### 9.2 No Framework for REST API

Using Node.js `http` module directly. Reasons:
- Avoid Express/Fastify dependency for what are thin wrappers
- MCP server already handles HTTP via xmcp
- REST endpoints are simple CRUD over existing engine functions
- OpenAPI spec is generated from Zod, not from route decorators

### 9.3 Tesseract.js for OCR (not cloud OCR)

- Runs locally, consistent with privacy stance
- WASM build works in both Node.js and browser
- Accuracy is lower than cloud OCR (Google Vision, AWS Textract) — mitigated by flagging all OCR'd values for human review
- Acceptable trade-off: privacy > accuracy, human review catches errors

### 9.4 State Tax as Separate Modules

Each state is its own directory under `src/engine/state/`. Reasons:
- States have radically different tax systems (progressive, flat, none)
- Avoids a monolithic state tax file
- Can add states incrementally without touching others
- Community contributors can focus on their state

### 9.5 Plugin Isolation

Plugins run in the same process but with restricted API surface. Not true sandboxing (no VM). Reasons:
- Performance: process isolation is slow for CLI tool
- Trust model: plugins are npm packages, same trust as any dependency
- Capability restriction: plugins can't access vault/profile via API design, not enforcement
- Future: if plugins become untrusted, move to worker_threads

---

## 10. Data Models

### 10.1 New Shared Types

```ts
// Household profile (cross-workflow)
interface HouseholdProfile {
  id: string;
  people: PersonRecord[];
  address: Address;
  income: IncomeProfile;
  updatedAt: string;
}

interface PersonRecord {
  id: string;
  firstName: string;
  lastName: string;
  ssn?: string;        // encrypted in vault
  dob: string;
  relationship: "self" | "spouse" | "child" | "parent" | "other";
}

interface IncomeProfile {
  taxYear: number;
  sources: IncomeSource[];
  totalGross: number;
}

// Life event
interface LifeEvent {
  id: string;
  label: string;
  description: string;
  workflows: LifeEventWorkflow[];
}

interface LifeEventWorkflow {
  workflowId: string;
  priority: number;        // 1 = do first
  deadline?: string;       // absolute or relative
  dependsOn?: string[];    // other workflow IDs that should complete first
  notes: string;
}

// Eligibility
interface EligibilityResult {
  workflowId: string;
  eligible: "likely" | "possible" | "unlikely" | "ineligible";
  confidence: number;      // 0-1
  reason: string;
  nextSteps: string[];
}

// Draft (save/resume)
interface WorkflowDraft {
  id: string;
  workflowId: string;
  schemaVersion: string;
  sections: Record<string, {
    answers: Record<string, unknown>;
    completedAt?: string;
  }>;
  resumePoint: string;     // section ID to resume from
  createdAt: string;
  updatedAt: string;
}

// Vault entry
interface VaultEntry {
  id: string;
  filename: string;
  mimeType: string;
  tags: string[];
  linkedWorkflows: string[];
  addedAt: string;
  sizeBytes: number;
  checksum: string;        // SHA-256 of plaintext
}

// Plugin
interface WorkflowPlugin {
  name: string;
  version: string;
  author?: string;
  license?: string;
  workflows: WorkflowDefinition[];
  glossaryTerms?: GlossaryEntry[];
  validators?: ValidatorPlugin[];
}

// Deadline
interface Deadline {
  label: string;
  date: string;
  type: "hard" | "soft";
  consequence: string;
  extensionAvailable: boolean;
  workflowId: string;
  domain: string;
}

// Fee
interface Fee {
  label: string;
  amount: number;          // cents
  waiverEligible: boolean;
  waiverCriteria?: string;
  paymentMethods: string[];
}
```

### 10.2 Extended Workflow Definition

```ts
interface WorkflowDefinition<TInput = unknown> {
  id: string;
  domain: string;
  summary: string;
  inputSchema: ZodSchema<TInput>;
  starterData: () => TInput;
  sections: Section[];
  buildBundle: (input: TInput) => WorkflowBundle;

  // New fields
  deadlines?: Deadline[];
  fees?: Fee[];
  eligibility?: {
    check: (intake: ScreenerInput) => EligibilityResult;
  };
  relatedWorkflows?: string[];
  glossaryDomain?: string;
  locale?: string[];             // supported locales
  status: "active" | "preview";  // existing but formalized
}
```

---

## 11. File Structure (New Additions)

```
src/
├── advisory/
│   ├── life-events/
│   │   ├── events.ts
│   │   ├── planner.ts
│   │   └── types.ts
│   ├── screener/
│   │   ├── intake.ts
│   │   ├── engine.ts
│   │   └── types.ts
│   └── decision-support/
│       ├── deduction-optimizer.ts
│       ├── contribution-optimizer.ts
│       ├── filing-status-optimizer.ts
│       ├── state-comparison.ts
│       └── timing-advisor.ts
├── api/
│   ├── router.ts
│   ├── openapi.ts
│   └── handlers/
├── drafts/
│   ├── store.ts
│   ├── migrate.ts
│   └── types.ts
├── engine/
│   ├── crypto/
│   │   ├── transaction-parser.ts
│   │   ├── cost-basis.ts
│   │   └── wash-sale.ts
│   ├── equity/
│   │   ├── rsu.ts
│   │   ├── iso.ts
│   │   ├── espp.ts
│   │   └── nso.ts
│   ├── gig/
│   │   ├── multi-1099.ts
│   │   ├── mileage.ts
│   │   └── home-office.ts
│   ├── scenarios/
│   │   ├── whatif.ts
│   │   └── comparison.ts
│   ├── suggestions/
│   │   ├── missed-deductions.ts
│   │   └── rules/
│   ├── audit-risk/
│   │   ├── scorer.ts
│   │   └── factors.ts
│   ├── optimizer/
│   │   ├── filing-status.ts
│   │   ├── contribution.ts
│   │   └── marginal.ts
│   └── state/
│       ├── common.ts
│       ├── ca/
│       ├── ny/
│       └── ... (10 states)
├── glossary/
│   ├── index.ts
│   └── terms/
│       ├── tax.ts
│       ├── immigration.ts
│       ├── healthcare.ts
│       └── ...
├── i18n/
│   ├── index.ts
│   └── types.ts
├── pdf/
│   ├── detectors/
│   │   ├── f1098.ts
│   │   ├── f1095a.ts
│   │   ├── f1099div.ts
│   │   └── ...
│   ├── ocr.ts
│   ├── batch.ts
│   ├── merge.ts
│   └── deskew.ts
├── plugins/
│   ├── loader.ts
│   ├── sandbox.ts
│   └── types.ts
├── profile/
│   ├── store.ts
│   ├── types.ts
│   └── prefill.ts
├── vault/
│   ├── crypto.ts
│   ├── store.ts
│   └── types.ts
├── deadlines/
│   ├── tracker.ts
│   └── ics.ts
├── fees/
│   └── calculator.ts
└── workflows/
    ├── education/
    │   ├── fafsa.ts
    │   ├── student-loan-repayment.ts
    │   └── 529-planner.ts
    ├── retirement/
    │   └── ssa-estimator.ts
    ├── identity/
    │   ├── passport.ts
    │   ├── name-change.ts
    │   ├── voter-registration.ts
    │   └── real-id.ts
    ├── benefits/
    │   ├── snap.ts
    │   ├── section8.ts
    │   ├── wic.ts
    │   ├── liheap.ts
    │   ├── medicaid.ts
    │   ├── ssdi.ts
    │   └── medicare.ts
    ├── veterans/
    │   ├── disability-claim.ts
    │   ├── gi-bill.ts
    │   └── va-healthcare.ts
    ├── legal/
    │   ├── small-claims.ts
    │   ├── expungement.ts
    │   └── child-support-modification.ts
    └── estate/
        ├── basic-will.ts
        ├── power-of-attorney.ts
        └── advance-directive.ts

locales/
├── en.json
├── es.json
└── zh-CN.json
```

---

## 12. Testing Strategy

### Unit Tests
- Every calculator, validator, and engine module: pure function → deterministic output
- Zod schema tests: valid inputs pass, invalid inputs fail with correct errors
- Glossary: all terms have required fields, no broken references

### Integration Tests
- Workflow end-to-end: input → fill → validate → review → export
- PDF extraction → workflow fill pipeline
- Cross-workflow data sharing (profile → prefill)
- Plugin loading and execution

### Snapshot Tests
- Tax calculation: known inputs → known outputs (golden files)
- PDF rendering: known inputs → known layout (visual regression)
- Bundle format: schema changes caught by snapshot diff

### Fuzz Tests
- Zod schema → random valid input → engine → no crashes
- 1000 iterations per workflow minimum

### Property Tests
- Tax: total tax ≥ 0, refund + owed never both > 0, effective rate ≤ marginal rate
- All workflows: bundle passes its own validation
- Eligibility: screener output covers all registered workflows

---

## 13. Implementation Order Rationale

**Phase 1 (Infrastructure) first** because save/resume, vault, i18n, and data sharing are prerequisites for real usage. Building 30 workflows without save/resume means nobody finishes one.

**Phase 2 (Tax Depth) second** because tax is the most developed domain and the one where users have the most money at stake. Deepening it builds credibility and revenue potential.

**Phase 3 (New Workflows) third** because the infrastructure and patterns from phases 1-2 make workflow creation faster. Each new workflow is mostly data and business rules, not new architecture.

**Phase 4 (Intelligence) fourth** because the life event engine and eligibility screener need a critical mass of workflows to be useful. Building them with only 6 workflows would be underwhelming.

**Phase 5 (Developer Platform) fifth** because plugins and REST API matter when there's enough platform to build on. Too early and you're maintaining API compatibility for nothing.

**Phase 6 (UX) sixth** because interface polish is most valuable when the underlying capabilities are rich. A beautiful UI over a thin engine disappoints.

**Phase 7 (Analytics) last** because it requires the most usage data to be meaningful and is the least critical to core function.

---

*This spec covers approximately 200 discrete features across 9 phases. Each phase is independently valuable — the platform improves meaningfully after each phase ships.*

---

## 14. Phase 8: Delightful TUI — Full Charm Stack

The current TUI uses Bubble Tea + Huh + Lipgloss but only scratches the surface. This phase transforms it into a beautiful, animated, fully-featured terminal workspace that makes government forms feel — against all odds — pleasant.

### 14.1 New Dependencies to Add

```go
// go.mod additions
require (
    github.com/charmbracelet/harmonica   // spring animations, projectile motion
    github.com/charmbracelet/glamour     // markdown rendering (for explainers, glossary)
    github.com/charmbracelet/log         // structured terminal logging
)
```

### 14.2 Layout System Overhaul

**Current state:** Simple horizontal 3-pane (rail, content, inspector) using `lipgloss.JoinHorizontal`.

**Target state:** Responsive, resizable multi-pane layout with proper height management.

**Design:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PigeonGov v0.2.0                           tax/1040 ▸ Section 3/7    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─ Workflows ──┐  ┌─ Income ──────────────────────┐  ┌─ Inspector ─┐ │
│  │              │  │                                │  │             │ │
│  │ ● tax/1040   │  │  W-2 Wages                    │  │ Progress    │ │
│  │ ○ immigr...  │  │  ┌─────────────────────────┐  │  │ ████░░ 3/7  │ │
│  │ ○ health...  │  │  │ $ 85,000.00             │  │  │             │ │
│  │ ○ unempl...  │  │  └─────────────────────────┘  │  │ Refund Est. │ │
│  │ ○ busine...  │  │                                │  │ +$3,247     │ │
│  │ ○ permit...  │  │  1099-NEC Income               │  │             │ │
│  │              │  │  ┌─────────────────────────┐  │  │ ⚠ 2 flags   │ │
│  │──────────────│  │  │ $ 12,500.00             │  │  │ ────────    │ │
│  │ Evidence     │  │  └─────────────────────────┘  │  │ Schedule C  │ │
│  │ ☑ W-2       │  │                                │  │ needed      │ │
│  │ ☑ 1099-NEC  │  │  Interest Income (1099-INT)    │  │             │ │
│  │ ☐ 1098      │  │  ┌─────────────────────────┐  │  │ [?] Help    │ │
│  │              │  │  │ $ 342.00                │  │  │ [G] Jump    │ │
│  └──────────────┘  │  └─────────────────────────┘  │  │ [W] Switch  │ │
│                    │                                │  └─────────────┘ │
│                    │  ◀ Prev   ● ● ● ○ ○ ○ ○  Next ▶  │              │
│                    └────────────────────────────────┘                   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  ↑/↓ navigate  enter confirm  ? help  esc back  ctrl+c quit           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Use `lipgloss.JoinVertical` + `JoinHorizontal` for nested layout composition
- `lipgloss.Place()` for absolute positioning of overlays (help screen, jump menu)
- `.MaxWidth()`, `.MaxHeight()` for responsive panel sizing based on `tea.WindowSizeMsg`
- `.Align()` and `.AlignVertical()` for centered content in panels
- Dynamic pane widths: rail (18 chars fixed), inspector (16 chars fixed), content (fills remaining)
- Collapse side panes on narrow terminals (<80 cols): show content only with toggle

### 14.3 Full Bubbles Component Integration

**List component** (replacing huh.NewSelect for workflow selection):
- `list.Model` with fuzzy search filtering — type to filter workflows
- Custom `ItemDelegate` rendering workflow cards with domain icon, title, status badge, and summary
- Infinite scrolling for large workflow catalogs
- Domain grouping with section headers

**Table component** (for data display):
- Tax bracket breakdown as a styled table
- Evidence checklist as an interactive table (navigate rows, toggle status)
- Fee summary table with totals
- Comparison tables (MFJ vs. MFS, standard vs. itemized)
- Custom `table.Styles` matching the PigeonGov color palette

**Viewport** (for scrollable content):
- Review summary in a scrollable viewport with mouse wheel support
- Glossary/explainer panel in viewport
- Bundle preview in viewport (formatted JSON or summary)
- `viewport.MouseWheelEnabled = true`, `viewport.MouseWheelDelta = 3`

**Text Area** (for long-form input):
- Notes/comments fields in workflows (separation reason narrative, disability description)
- `textarea.ShowLineNumbers = true` for structured narratives
- Character limit with counter display
- `textarea.MaxHeight` to prevent overflow

**File Picker** (replacing manual path input):
- For PDF import: `filepicker.AllowedTypes = []string{".pdf", ".jpg", ".png"}`
- For save location: `filepicker.DirAllowed = true, filepicker.FileAllowed = false`
- Show file sizes and permissions for context
- Custom styling: directories bold, PDFs highlighted

**Progress Bar** (for multi-step operations):
- Section completion progress in inspector panel
- PDF batch processing progress
- Bundle generation progress
- Gradient fill using PigeonGov accent colors
- `progress.WithGradient("#1f8fff", "#00ff88")` — blue to green as completion increases

**Spinner** (for async operations):
- Replace static "Generating preview..." text with animated spinners
- `spinner.Dot` for quick operations (<2s)
- `spinner.Globe` for network-like operations (processing)
- `spinner.Moon` for long operations with status text
- Custom spinner: pigeon emoji frames `🐦 🕊️ 🐦‍⬛ 🪶` (if terminal supports unicode)

**Timer / Stopwatch:**
- Stopwatch for time tracking: "You've been working on this form for 12:34"
- Timer for deadline awareness: "ACA open enrollment closes in 11d 4h 23m"

**Help component:**
- Full key binding display with `help.Model`
- Short mode in status bar, full mode on `?` press
- Contextual: different bindings shown per stage
- Custom `help.Styles` matching palette

### 14.4 Spring Animations with Harmonica

**Panel transitions:**
```go
// Smooth panel sliding when switching sections
spring := harmonica.NewSpring(harmonica.FPS(60), 6.0, 0.7) // underdamped: slight bounce
// Animate content panel X offset from current section to next
contentX, contentXVel = spring.Update(contentX, contentXVel, targetX)
```

**Inspector updates:**
```go
// Refund estimate animates to new value with spring physics
refundSpring := harmonica.NewSpring(harmonica.FPS(60), 8.0, 1.0) // critically damped: smooth, no bounce
refundDisplay, refundVel = refundSpring.Update(refundDisplay, refundVel, actualRefund)
```

**Progress bar animation:**
```go
// Progress bar fills with satisfying spring motion
progressSpring := harmonica.NewSpring(harmonica.FPS(60), 5.0, 0.8) // slightly underdamped
progressValue, progressVel = progressSpring.Update(progressValue, progressVel, targetProgress)
```

**Error shake:**
```go
// Validation error shakes the input field
shakeSpring := harmonica.NewSpring(harmonica.FPS(60), 15.0, 0.3) // very underdamped: oscillates
// Kick with initial velocity, target = 0 (center)
fieldOffset, fieldVel = shakeSpring.Update(fieldOffset, fieldVel, 0.0)
```

**Projectile particles:**
```go
// Celebration particles when workflow completes
for i := range particles {
    particles[i].projectile = harmonica.NewProjectile(
        harmonica.FPS(60),
        harmonica.Point{X: centerX, Y: centerY, Z: 0},
        harmonica.Vector{X: randVelX(), Y: randVelY(), Z: 0},
        harmonica.TerminalGravity, // Y-down for terminal coordinates
    )
}
```

**Animation tick integration with Bubble Tea:**
```go
type tickMsg time.Time

func tickCmd() tea.Cmd {
    return tea.Tick(time.Second/60, func(t time.Time) tea.Msg {
        return tickMsg(t)
    })
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg.(type) {
    case tickMsg:
        m.animateFrame()
        if m.animating {
            return m, tickCmd()
        }
    }
    return m, nil
}
```

### 14.5 Markdown Rendering with Glamour

**Glossary explainers:**
```go
import "github.com/charmbracelet/glamour"

renderer, _ := glamour.NewTermRenderer(
    glamour.WithAutoStyle(), // adapts to terminal background
    glamour.WithWordWrap(inspectorWidth),
)
rendered, _ := renderer.Render(glossaryEntry.Markdown)
```

**Usage:** Render plain-language explanations, "what does this mean?" help panels, review summaries with formatting, and workflow descriptions with links and emphasis.

### 14.6 Mouse Support

**Enable in program:**
```go
p := tea.NewProgram(model, tea.WithMouseCellMotion())
```
Or in v2:
```go
func (m model) View() tea.View {
    return tea.View{
        Body: m.renderLayout(),
        MouseMode: tea.MouseModeCellMotion,
    }
}
```

**Mouse interactions:**
- Click on workflow in rail → select it
- Click on evidence item → toggle status
- Click on section dots → jump to section
- Scroll in viewport → scroll content
- Click on inspector flag → expand detail
- Drag to resize panes (stretch goal)

### 14.7 Keyboard Enhancements

**Full key map:**
| Key | Action | Context |
|-----|--------|---------|
| `↑/↓` or `j/k` | Navigate items | List, table, form |
| `Enter` | Confirm / select | All |
| `Esc` | Back / cancel | All |
| `Tab` | Next field | Form |
| `Shift+Tab` | Previous field | Form |
| `?` | Toggle help overlay | All |
| `Ctrl+G` | Jump to section (fuzzy search) | Workflow |
| `Ctrl+W` | Switch workflow | All |
| `Ctrl+S` | Save draft | Workflow |
| `Ctrl+E` | Export bundle | Preview |
| `Ctrl+P` | Toggle preview panel | Workflow |
| `Ctrl+F` | Search / filter | List |
| `/` | Start search | List |
| `Space` | Toggle checkbox | Evidence list |
| `Ctrl+C` | Quit | All |
| `q` | Quit (when not in input) | All |

**Keyboard enhancement (v2):**
```go
view.KeyboardEnhancements = tea.WithKeyReleases // detect key release events
```

### 14.8 Focus Reporting

```go
view.ReportFocus = true
```

- When terminal loses focus: pause animations (save CPU)
- When terminal gains focus: resume animations, refresh data
- Visual indicator: dim the UI slightly when unfocused

### 14.9 Color Palette & Theming

**PigeonGov color system (Catppuccin-inspired, using `catppuccin/go` already in deps):**

```go
type Theme struct {
    Primary    lipgloss.Color // Actions, selected items
    Secondary  lipgloss.Color // Accents, highlights
    Success    lipgloss.Color // Passed validations, complete sections
    Warning    lipgloss.Color // Flags, attention needed
    Error      lipgloss.Color // Failed validations, errors
    Info       lipgloss.Color // Informational, help text
    Surface0   lipgloss.Color // Panel backgrounds
    Surface1   lipgloss.Color // Elevated panel backgrounds
    Surface2   lipgloss.Color // Borders, dividers
    Text       lipgloss.Color // Primary text
    Subtext    lipgloss.Color // Secondary text, descriptions
    Overlay    lipgloss.Color // Overlay backgrounds (help, jump menu)
}

var DarkTheme = Theme{
    Primary:   lipgloss.Color("#89b4fa"), // Blue
    Secondary: lipgloss.Color("#94e2d5"), // Teal
    Success:   lipgloss.Color("#a6e3a1"), // Green
    Warning:   lipgloss.Color("#f9e2af"), // Yellow
    Error:     lipgloss.Color("#f38ba8"), // Red
    Info:      lipgloss.Color("#89dceb"), // Sky
    Surface0:  lipgloss.Color("#1e1e2e"), // Base
    Surface1:  lipgloss.Color("#313244"), // Surface0
    Surface2:  lipgloss.Color("#45475a"), // Surface1
    Text:      lipgloss.Color("#cdd6f4"), // Text
    Subtext:   lipgloss.Color("#a6adc8"), // Subtext0
    Overlay:   lipgloss.Color("#585b70"), // Overlay0
}

var LightTheme = Theme{
    Primary:   lipgloss.Color("#1e66f5"),
    Secondary: lipgloss.Color("#179299"),
    Success:   lipgloss.Color("#40a02b"),
    Warning:   lipgloss.Color("#df8e1d"),
    Error:     lipgloss.Color("#d20f39"),
    Info:      lipgloss.Color("#04a5e5"),
    Surface0:  lipgloss.Color("#eff1f5"),
    Surface1:  lipgloss.Color("#e6e9ef"),
    Surface2:  lipgloss.Color("#ccd0da"),
    Text:      lipgloss.Color("#4c4f69"),
    Subtext:   lipgloss.Color("#6c6f85"),
    Overlay:   lipgloss.Color("#9ca0b0"),
}
```

- Auto-detect dark/light terminal background via `lipgloss.HasDarkBackground()`
- Override with `--theme dark|light` flag
- Respect `NO_COLOR` env var: fall back to bold/underline/reverse for emphasis

### 14.10 Accessibility

- **Screen reader mode:** `--accessible` flag or `PIGEONGOV_ACCESSIBLE=1`
  - Uses `huh.WithAccessible(true)` (already partially implemented)
  - Disables animations, spinners, progress bars
  - Replaces visual indicators with text equivalents
  - Linear flow instead of multi-pane layout
- **High contrast mode:** `--high-contrast`
  - Uses only 4-bit ANSI colors (user-customizable via terminal settings)
  - Bold text instead of color for emphasis
  - Explicit status labels instead of color-coded dots
- **Reduced motion:** `--reduce-motion`
  - Disables spring animations
  - Instant transitions instead of animated ones
  - Static progress indicators instead of animated spinners

### 14.11 Delightful Micro-Interactions

**Section completion celebration:**
- When a section is completed: brief green flash on the section dot in the progress indicator
- Spring-animated checkmark appears: `○ → ●` with slight bounce

**Refund counter:**
- As the user fills income/deduction fields, the inspector's refund estimate updates with a satisfying number-ticker animation (spring physics on the displayed value)

**Evidence collection:**
- When evidence is marked as provided: `☐ → ☑` with a subtle slide-in animation
- Evidence progress ring in inspector updates with gradient fill

**Validation flags:**
- New flags slide in from the right with spring motion
- Resolved flags fade out (reduce opacity over 200ms)

**Workflow completion:**
- Terminal-safe confetti: scatter of colored Unicode characters (`✦ ✧ ◆ ● ★`) launched as projectile particles, falling with `TerminalGravity`
- "Bundle saved!" message with a pigeon ASCII art flourish:
```
    ___
   (o o)    Bundle saved to ./1040-2025.json
   ( V )    3 sections, 0 flags, $3,247 refund
   /|  |\   Have a pleasant tax season.
  / |  | \
```

**Error states:**
- Validation error on a field: shake animation (spring with high frequency, low damping)
- Fatal error: red border pulse (2 cycles, then static)

### 14.12 TUI File Structure

```
internal/tui/
├── app.go              // Main model, state machine (expanded)
├── types.go            // Data structures
├── forms.go            // Huh form builders
├── render.go           // Layout composition (overhauled)
├── theme.go            // Color palette, theme switching
├── animation.go        // Spring/projectile animation state
├── components/
│   ├── workflow_list.go    // bubbles/list with custom delegates
│   ├── evidence_table.go   // bubbles/table for evidence checklist
│   ├── review_viewport.go  // bubbles/viewport for review content
│   ├── tax_table.go        // bubbles/table for bracket breakdown
│   ├── progress_panel.go   // bubbles/progress for section progress
│   ├── spinner_overlay.go  // bubbles/spinner for async states
│   ├── help_overlay.go     // bubbles/help for key bindings
│   ├── file_picker.go      // bubbles/filepicker for import/save
│   ├── jump_menu.go        // section jump with fuzzy search
│   ├── deadline_timer.go   // bubbles/timer for deadline display
│   └── confetti.go         // projectile particle celebration
├── keys.go             // Key bindings (key.Binding definitions)
├── markdown.go         // Glamour renderer wrapper
├── accessible.go       // Accessibility mode adaptations
└── nodecli.go          // Node backend integration (existing)
```

---

## 15. Phase 9: Agent-Optimized CLI & MCP

Based on 2026 best practices for building CLI tools and MCP servers that AI agents can use effectively. This phase ensures PigeonGov is a first-class citizen in agentic workflows.

### 15.1 Structured Output Contract

**Every command gets `--json` and `--jsonl`:**
```bash
# Human-readable (default when stdout is a TTY)
$ pigeongov list
  tax/1040                Federal individual return (2025)       ACTIVE
  immigration/family...   Family visa packet assembly           ACTIVE
  ...

# Machine-readable (default when stdout is NOT a TTY, or with --json)
$ pigeongov list --json
[{"id":"tax/1040","domain":"tax","title":"Federal individual return","year":2025,"status":"active"}]

# Streaming (for batch/large outputs)
$ pigeongov batch ./clients/ --jsonl
{"id":"client-001","status":"success","bundle":"./out/client-001.json","flags":0}
{"id":"client-002","status":"error","error":"missing_ssn","suggestion":"Add SSN to identity section"}
```

**Separation of concerns:**
- **stdout:** Structured data (JSON/JSONL) only. This is the API contract.
- **stderr:** Human messages, progress bars, spinners, warnings, prompts. Agents ignore this.
- Non-TTY detection: when `!process.stdout.isTTY`, auto-switch to `--json` and suppress interactive elements

### 15.2 Meaningful Exit Codes

```ts
// src/cli/exit-codes.ts
export const EXIT = {
  SUCCESS: 0,              // Operation completed successfully
  GENERAL_FAILURE: 1,      // Unspecified error
  USAGE_ERROR: 2,          // Invalid arguments, bad syntax
  VALIDATION_WARNING: 3,   // Bundle has validation warnings (but is usable)
  VALIDATION_ERROR: 4,     // Bundle has validation errors (unusable without fixes)
  NOT_FOUND: 5,            // Workflow, file, or resource not found
  PERMISSION_DENIED: 6,    // Vault locked, missing API key
  CONFLICT: 7,             // Draft already exists, file would be overwritten
  SCHEMA_ERROR: 8,         // Input doesn't match expected Zod schema
  DEPENDENCY_MISSING: 9,   // Required external tool not found (e.g., Go for TUI)
  TIMEOUT: 10,             // Operation timed out
} as const;
```

Agents use these for control flow: `exit 3` means "proceed but flag for review," `exit 4` means "stop and fix inputs."

### 15.3 Non-Interactive Mode

```bash
# Fully non-interactive: all input via flags/files, no prompts
$ pigeongov fill tax/1040 --input ./data.json --output ./bundle.json --yes --quiet

# Dry run: show what would happen without doing it
$ pigeongov fill tax/1040 --input ./data.json --dry-run --json
{"wouldCreate":"./1040-2025.json","sections":7,"estimatedFlags":2,"estimatedRefund":3247}

# Explicit non-interactive flag for edge cases
$ pigeongov fill tax/1040 --non-interactive --input ./data.json
```

**Auto-detection:** If `!process.stdin.isTTY && !process.stdout.isTTY`, behave as if `--non-interactive --json` were passed. No spinners, no colors, no prompts.

### 15.4 Self-Describing Schemas

**Schema introspection command:**
```bash
$ pigeongov schema tax/1040 --json
{
  "workflowId": "tax/1040",
  "inputSchema": { /* Full JSON Schema derived from Zod */ },
  "outputSchema": { /* Bundle shape */ },
  "sections": [
    {"id": "identity", "fields": [...], "required": true},
    {"id": "income", "fields": [...], "required": true}
  ],
  "tools": ["fill-workflow", "validate-workflow", "review-workflow", "calculate-tax"],
  "examples": {
    "minimal": { /* Minimal valid input */ },
    "complete": { /* Full input with all optional fields */ }
  }
}
```

**`agents.json` file** (at repo root, served at `/agents.json`):
```json
{
  "name": "pigeongov",
  "version": "0.2.0",
  "description": "Local-first government workflow platform",
  "capabilities": ["cli", "mcp", "rest"],
  "cli": {
    "binary": "pigeongov",
    "install": "npm install -g pigeongov",
    "commands": {
      "fill": {"description": "Execute a workflow", "schema": "/api/schemas/fill"},
      "validate": {"description": "Validate a bundle", "schema": "/api/schemas/validate"}
    }
  },
  "mcp": {
    "endpoint": "http://127.0.0.1:3847/mcp",
    "tools": 18,
    "auth": "api-key"
  }
}
```

**`llms.txt`** (at repo root, served at `/llms.txt`):
```markdown
# PigeonGov

> Local-first, privacy-preserving government workflow platform

## Quick Start
- Install: `npm install -g pigeongov`
- List workflows: `pigeongov list --json`
- Fill a workflow: `pigeongov fill tax/1040 --input data.json --json`
- MCP server: `pigeongov serve --port 3847`

## Workflows
- tax/1040: Federal individual tax return (2025)
- immigration/family-visa-intake: Family visa packet assembly
...

## For Agents
- Always use `--json` for structured output
- Use `--dry-run` before destructive operations
- Check exit codes: 0=success, 3=warnings, 4=errors
- Use `pigeongov schema <workflow>` for input/output shapes
```

### 15.5 Actionable Error Messages

```bash
$ pigeongov fill tax/1040 --input bad.json --json
{
  "error": "schema_validation_failed",
  "field": "identity.ssn",
  "value": "not-a-ssn",
  "expected": "string matching /^\\d{3}-\\d{2}-\\d{4}$/",
  "suggestion": "Format SSN as XXX-XX-XXXX (e.g., 123-45-6789)",
  "retryable": true,
  "docs": "pigeongov schema tax/1040 --field identity.ssn"
}
```

Every error includes:
- **Error type** (machine-readable string, not just human text)
- **Failing input** echoed back
- **What was expected**
- **Suggested recovery command**
- **Whether retrying with different input is worthwhile**

### 15.6 Pipeline Composition

```bash
# Extract all PDFs → fill workflow → validate → review
$ pigeongov extract ./docs/ --jsonl | \
  pigeongov fill tax/1040 --stdin --json | \
  pigeongov validate --stdin --json | \
  pigeongov review --stdin --json

# Selective output to reduce tokens
$ pigeongov review bundle.json --json --fields "headline,flaggedFields,refund"
{"headline":"Federal return complete","flaggedFields":[],"refund":3247}

# Batch with filtering
$ pigeongov list --json --domain tax --status active
$ pigeongov deadlines --json --within 30d
```

**stdin support:** `--stdin` or `-f -` reads JSON from stdin. Enables piping between commands.

**Field selection:** `--fields` returns only specified top-level fields. Reduces token consumption for agents that only need specific data.

### 15.7 MCP Server 2026 Enhancements

**Elicitation (Human-in-the-Loop):**
```ts
// When a workflow needs human confirmation (e.g., overriding a validation flag)
const result = await server.elicit({
  message: "Schedule C shows $45,000 in expenses against $30,000 income. This is a common audit trigger. Proceed anyway?",
  requestedSchema: {
    type: "object",
    properties: {
      proceed: { type: "boolean", title: "Proceed with filing" },
      note: { type: "string", title: "Optional note for records" }
    },
    required: ["proceed"]
  }
});
```

Use cases:
- Confirming overrides on audit risk flags
- Approving PDF OCR extractions with low confidence
- Confirming destructive operations (delete draft, overwrite bundle)
- Requesting missing required fields interactively

**Structured tool output:**
```ts
// Instead of returning text, return typed structures
{
  content: [
    { type: "text", text: "Tax return calculated successfully" },
    { type: "resource", uri: "file:///tmp/1040-2025.json", mimeType: "application/json" },
    { type: "data", data: { refund: 3247, effectiveRate: 0.183, flags: 0 } }
  ],
  structuredContent: {
    type: "tax-calculation-result",
    refund: 3247,
    effectiveRate: 0.183,
    marginalRate: 0.22,
    totalTax: 8432,
    flags: []
  }
}
```

**Tool naming convention:**
```
pigeongov_fill_workflow
pigeongov_validate_workflow
pigeongov_review_workflow
pigeongov_extract_document
pigeongov_screen_eligibility
pigeongov_plan_life_event
pigeongov_calculate_tax
pigeongov_compare_scenarios
pigeongov_list_deadlines
pigeongov_explain_field
pigeongov_vault_add
pigeongov_vault_get
pigeongov_profile_get
pigeongov_profile_update
```

Pattern: `pigeongov_{action}_{resource}` — prevents collisions when multiple MCP servers coexist.

**Pagination for large results:**
```ts
// list-workflows with pagination
{
  workflows: [...],     // max 20 per page
  pagination: {
    offset: 0,
    limit: 20,
    total: 47,
    hasMore: true
  }
}
```

**MCP Server Cards (`.well-known`):**
```json
// Served at /.well-known/mcp-server.json
{
  "name": "pigeongov",
  "version": "0.2.0",
  "description": "Local-first government workflow platform",
  "tools": 18,
  "transport": ["stdio", "streamable-http"],
  "auth": ["api-key"],
  "capabilities": {
    "elicitation": true,
    "structuredOutput": true,
    "streaming": true
  }
}
```

### 15.8 Token Efficiency

**Minimal default responses:**
```bash
# Default list: compact, only essential fields
$ pigeongov list --json
[{"id":"tax/1040","title":"Federal return","status":"active"},...]

# Verbose: all fields
$ pigeongov list --json --verbose
[{"id":"tax/1040","domain":"tax","title":"Federal individual return (2025)","status":"active","sections":7,"deadlines":[...],"fees":[...]}]
```

**Content truncation with escape hatches:**
```json
{
  "review": {
    "headline": "Federal return complete — $3,247 refund",
    "flagCount": 2,
    "flags": ["Schedule C high expenses", "Missing 1098"],
    "fullReview": "pigeongov review bundle.json --json --full"
  }
}
```

Default responses are compact. Full details available via `--full` or follow-up commands referenced in the response itself.

**TOON support (optional):**
```bash
# Token-optimized output (~40% fewer tokens than JSON)
$ pigeongov list --toon
id=tax/1040 title=Federal return status=active
id=immigration/family-visa-intake title=Family visa packet status=active
```

Implement as opt-in format: `--output toon`. JSON remains default for broad compatibility.

### 15.9 Idempotent Operations

```bash
# Ensure a workflow exists (create if not, no-op if already done)
$ pigeongov ensure draft tax/1040 --input data.json
{"status":"exists","draftId":"abc123","message":"Draft already exists, no changes made"}

# Safe retry: same command, same result
$ pigeongov fill tax/1040 --input data.json --output ./out.json --idempotency-key "2026-03-30-client-a"
```

- `ensure` commands for safe creation (like `kubectl apply`)
- Idempotency keys for fill/export operations
- Exit code 7 (CONFLICT) when a create would overwrite — never silent overwrites

### 15.10 Shell Completions

```bash
# Install completions
$ pigeongov completions zsh > ~/.zsh/completions/_pigeongov
$ pigeongov completions bash > /etc/bash_completion.d/pigeongov
$ pigeongov completions fish > ~/.config/fish/completions/pigeongov.fish

# What gets completed:
pigeongov <TAB>          # fill, validate, review, extract, list, ...
pigeongov fill <TAB>     # tax/1040, immigration/family-visa-intake, ...
pigeongov fill tax/<TAB> # 1040
pigeongov fill tax/1040 --<TAB>  # --input, --output, --json, --dry-run, ...
```

Implemented via Commander.js completion generation.

### 15.11 Agent-Friendly Files

**Files to ship:**

| File | Location | Purpose |
|------|----------|---------|
| `agents.json` | repo root + served at `/agents.json` | Machine-readable capability manifest |
| `llms.txt` | repo root + served at `/llms.txt` | LLM-optimized documentation |
| `openapi.json` | generated at build time, served at `/api/openapi.json` | REST API schema |
| `.well-known/mcp-server.json` | served at `/.well-known/mcp-server.json` | MCP server discovery |
| `AGENTS.md` | repo root (already exists) | Human-readable agent guide, enhanced |

### 15.12 CLI Configuration for Agents

```json
// ~/.pigeongov/config.json
{
  "output": {
    "format": "json",           // default output format
    "verbosity": "normal",      // quiet, normal, verbose
    "color": "auto",            // auto, always, never
    "fields": null              // default field selection (null = all)
  },
  "agent": {
    "nonInteractive": true,     // skip all prompts
    "idempotent": true,         // prefer ensure/apply semantics
    "tokenBudget": "compact"    // compact, normal, verbose
  },
  "mcp": {
    "port": 3847,
    "auth": "api-key",
    "key": null,                // or path to key file
    "rateLimit": 60,
    "auditLog": true
  }
}
```

Agents configure PigeonGov once via config file, then every command behaves agent-friendly without per-call flags.

---

## 16. Updated Implementation Order

With the two new phases, the full build order is:

1. **Phase 1: Infrastructure Foundation** — save/resume, vault, PDF intelligence, data sharing, deadlines, fees, i18n, glossary
2. **Phase 9: Agent-Optimized CLI & MCP** — structured output, exit codes, non-interactive mode, schemas, error messages, pipeline composition. *Moved up because it affects every subsequent command and tool we build.*
3. **Phase 2: Tax Engine Depth** — new forms, crypto, intelligence layer, state taxes, multi-year
4. **Phase 3: New Workflow Domains** — 30+ workflows across 8 domains
5. **Phase 4: Intelligence & Advisory** — life event engine, eligibility screener, explainer, decision support
6. **Phase 8: Delightful TUI** — full Charm stack, animations, theming, accessibility, micro-interactions. *After workflows exist to make the TUI worthwhile.*
7. **Phase 5: Developer Platform** — plugins, scaffolding, MCP hardening, REST/OpenAPI, testing infra
8. **Phase 6: UX & Web Interface** — CLI polish, web evolution, output/reporting
9. **Phase 7: Analytics & Community** — local stats, benchmarks, opt-in reporting
