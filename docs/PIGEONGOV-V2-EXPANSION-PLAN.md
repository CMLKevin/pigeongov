# PigeonGov v2: The Government Intelligence Platform

> Research compiled March 31, 2026 from 4 parallel research agents covering: US government digital services landscape, MCP ecosystem & agent architecture, codebase gap analysis, and real user needs across 200+ sources.

---

## The Thesis

The US government is simultaneously **adding unprecedented bureaucratic complexity** (Medicaid work requirements, SNAP cuts, ACA subsidy cliff, SAVE plan death, immigration holds, new tax deductions) while **dismantling the digital infrastructure** that helped citizens navigate it (Direct File killed, Navigator funding cut 90%, LEP.gov removed, SSA service degraded). **$140 billion in federal benefits goes unclaimed annually.** That gap is widening.

PigeonGov v1 is a form calculator. PigeonGov v2 is the missing infrastructure layer between American families and the government systems that affect their lives.

---

## Part 1: What v1 Can't Do (Codebase Gaps)

### Tax Engine
- **1040 only** — no state returns, no capital gains (Schedule D/8949 schemas exist but aren't wired), no AMT, no rental income (Schedule E), no foreign income/FBAR, no QBI deduction (Section 199A), no multi-state filing
- **Schedule C is net-only** — no actual expense categories, depreciation, home office, COGS
- **Missing credits**: Education (Form 8863), childcare (Form 2441), energy (Form 5695), saver's credit
- **No deduction limits**: SALT cap ($40K under OBBB Act), charitable % of AGI, medical expense floor, passive activity losses
- **No Medicare surtax** (0.9% on high earners), no NIIT (3.8% on investment income)

### Benefits
- **No SSI** (distinct from SSDI — asset-based, no work history required)
- **No TANF** (cash assistance — and TANF receipt triggers categorical eligibility for SNAP/Medicaid)
- **Medicaid is expansion-status-only** — no state-specific income limits for parents, pregnant people, children (varies 50-205% FPL by state)
- **SNAP has no state adjustments** — uses federal table only
- **Section 8 uses placeholder 50% AMI** — real limits vary by county
- **No childcare subsidies, school lunch programs, ABLE accounts, or disability work incentives**
- **No asset/resource limits** for SNAP, SSI, LIHEAP

### Immigration
- **Family-based only** — no employment-based (EB-1 through EB-5), no H-1B, no TPS/DED, no VAWA
- **No I-765 (work permit) or I-131 (travel document) workflows**
- **No awareness of**: travel bans (39 countries), $100K H-1B surcharge, processing holds, re-review of approved benefits
- **Naturalization has no civics prep** — no N-400 interview simulation or question bank

### Other Domains
- **Education**: No PLUS loans, no PSLF tracker, no loan consolidation calculator, no SAVE→RAP transition advisor
- **Veterans**: Combined rating is approximate (not exact VA math), GI Bill MHA is placeholder ($1,800 vs real BAH by ZIP)
- **Retirement**: No spousal/survivor benefits, no Government Pension Offset, no Windfall Elimination Provision
- **Healthcare**: No plan comparison engine, no APTC calculator, no Medicaid enrollment pathway
- **Business/Permits**: Both marked "preview" — stubs only
- **Unemployment**: No state-specific benefit calculation, no weekly benefit amount, no work-share programs

### Infrastructure
- **No state tax engine** — only federal
- **Validator is line-reconciliation only** — no cross-form validation, no business rules engine
- **Storage has no versioning, conflict resolution, or sync**
- **Profile system has no completeness scoring or validation**
- **MCP doesn't expose**: drafts, vault, profiles, batch processing, PDF generation
- **No tests for**: domain workflows, storage, profiles, state-specific logic

---

## Part 2: What People Actually Need

### The Numbers That Matter
- **$140B/year** in unclaimed federal benefits
- **1 in 5** eligible Americans never apply for SNAP (~$30B unclaimed)
- **$45B+** in unclaimed Medicaid
- **10M+ projected** to lose Medicaid from work requirements (2027)
- **7.5M borrowers** stuck in SAVE forbearance, must transition by Sept 2026
- **5M borrowers** defaulted in October 2025 alone
- **22%** of public assistance recipients deliberately limit income to avoid benefits cliffs
- **62%** initial SSDI denial rate; appeals take 1.5-3+ years
- **36%** of VA disability claims denied in 2024
- **USCIS**: 11M+ pending cases, 2M+ EAD backlog

### The Sharpest Pain Points

**Benefits Cliffs**: A $1,000 wage increase can cost $25,000 in childcare benefits. In North Carolina, a mother needs to earn $70,000 to match the net value of earning $30,000 with benefits. The Atlanta Fed's CLIFF tools exist but aren't consumer-facing.

**Death of a Spouse**: Triggers 30+ government interactions across SSA survivor benefits, tax filing status changes, Medicare/Medicaid adjustments, estate probate, account retitling, credit bureau notifications, VA burial benefits — all while grieving. No tool handles the cascade.

**Immigration Chaos**: Travel bans on 39 countries with processing holds on all pending applications. $100K H-1B surcharge. "Re-review" of benefits approved since Jan 2021. A single missing form costs families 2+ years. 53% of asylum seekers with counsel win vs 17% without.

**Student Loan Crisis**: SAVE plan dead. 7.5M borrowers must switch plans. New RAP plan has no $0 payment option. PSLF can now be denied based on employer's political activities. Critical consolidation deadline: July 1, 2026.

**ACA Subsidy Cliff**: Enhanced subsidies expired. Average premium increase: 114%. A 60-year-old just over 400% FPL sees premiums jump from 8.5% to 23%+ of income. Navigator funding slashed 90%.

### What Doesn't Exist Yet
1. **Unified benefits discovery + form completion** across federal AND state programs
2. **Cross-domain life event navigator** — "my spouse died" triggers 30+ workflows with deadlines, completed forms for each
3. **AI-powered immigration guidance** incorporating current policy (travel bans, holds, fee changes)
4. **Student loan plan transition advisor** with personalized calculations
5. **Benefits cliff navigator** with actual state-specific data and temporal modeling
6. **MCP server for citizen-facing government transactions** (existing govt MCP servers are data-transparency only)

---

## Part 3: The Landscape (Competitors & APIs)

### What Already Exists on GitHub
- **IRS Direct File** source code (public domain, Scala Fact Graph) — free to fork
- **IRS Taxpayer MCP** (39 tax tools, all 50 states, TY2024+2025) — could integrate or learn from
- **US Gov Open Data MCP** (300+ tools, 40+ federal APIs) — data layer exists
- **OpenFile** (active Direct File fork) — community building on IRS codebase

### Government APIs Available
| Agency | API | Access |
|--------|-----|--------|
| USCIS | Case Status, FOIA | Public (developer.uscis.gov) |
| IRS | Modernized e-File (MeF) | Restricted (XML/SOAP) |
| CMS | Marketplace, Blue Button 2.0 (FHIR) | Public (OAuth 2.0) |
| SSA | eCBSV, Benefits by State | Mixed |
| VA | Health, Benefits, Facilities (Lighthouse) | Public (FHIR) |
| GSA | SAM.gov, Regulations.gov, 30+ APIs | Mostly public |

### Scrape-Only (No API)
- SSA my Social Security (identity verification required)
- State benefits portals (every state different — BenefitsCal, Georgia Gateway, YourTexasBenefits, etc.)
- Passport status
- FAFSA application (SAIG batch only for schools/states)

### Competitor Gaps
- **TurboTax/H&R Block**: Tax-only silos. Expensive. Lobby against free alternatives.
- **Immigration tools** (Boundless, SimpleCitizen): Marriage-based only. No policy intelligence.
- **Benefits tools** (BenefitsCheckUp, GetCalFresh): Screening only, no form filling. Single-program or single-state.
- **Nobody** combines AI guidance + multi-domain coverage + form filling + MCP server. The market is entirely siloed.

---

## Part 4: MCP & Agent Architecture for v2

### Protocol Features to Build On
- **Streamable HTTP** (deployed): Scalable, Lambda-compatible, no long-lived connections
- **Elicitation**: Servers define input schemas for credential entry, document uploads
- **Tasks Primitive** (experimental): Async state machine for long-running workflows — perfect for government form processing that involves document uploads, eligibility checks, waiting periods
- **June 2026 spec**: Stateless MCP, `.well-known/mcp.json` discovery, horizontal scaling

### Architecture Recommendations

**PII Tokenization at the MCP Layer**: Intercept PII before it reaches any LLM. Local vault with AES-256. Hybrid regex (SSN, A-Number, receipt numbers) + NLP (names, addresses via Presidio). Session-scoped token maps. Raw PII never touches cloud.

**Hierarchical Agent Orchestration**: One orchestrator decomposes "my spouse died" into: SSA survivor benefits + tax status change + Medicare adjustment + estate probate + account retitling. Specialist subagents handle each domain. 70-90% token savings vs monolithic agent.

**CLI-First, MCP-Native**: CLI for human interaction (fast, zero overhead). MCP for agent orchestration (typed schemas, structured output). Use lazy tool discovery (mcp2cli pattern) to avoid 40-50% context window consumption from schema injection.

**Progressive Form Automation**: Start with data preparation and validation (v2.0). Add PDF form filling (v2.1). Add browser automation via Skyvern-style explore/replay for government portals (v2.2). Never auto-submit — always human-in-the-loop.

### Security Requirements
- 66% of MCP servers have security findings. Build security-first.
- OWASP MCP Top 10 compliance
- Input validation on every tool
- No auto-approval for any destructive action
- mcp-scan integration in CI

---

## Part 5: The v2 Feature Roadmap

### v2.0 — The Intelligence Layer (Foundation)

**State Tax Engine**
- 10 highest-impact states first: CA, NY, TX, FL, IL, PA, OH, GA, NJ, NC
- Tax Foundation's State Tax Competitiveness Index as priority guide
- State EITC programs (16 states + DC)
- State CTC programs (16 states + GA adding 2026)
- SALT cap at $40K (OBBB Act)

**Capital Gains & Investment Income**
- Wire existing Schedule D and Form 8949 schemas to tax calculator
- Long-term rates: 0%/15%/20% tiers
- Net Investment Income Tax (3.8% NIIT)
- Qualified dividends at LTCG rates
- Crypto cost basis (Form 1099-DA support for TY2025)

**Benefits Intelligence Upgrade**
- SSI workflow (asset-based, no work history)
- TANF workflow with categorical eligibility chains (TANF → auto-qualifies SNAP, Medicaid)
- State-specific Medicaid income limits (not just expansion yes/no)
- County-level Section 8 AMI limits
- Childcare subsidies (CCDF) with state variation
- School lunch program eligibility
- State-specific SNAP max allotments

**OBBB Act Tax Changes**
- New deductions: tips, overtime, auto loan interest, senior citizen deduction
- Child Tax Credit at $2,200/child (verify against IRS guidance)
- SALT cap raised to $40K
- ITIN filer CTC restrictions (2.7M children affected)

**Student Loan Crisis Tools**
- SAVE → RAP/IBR transition calculator with personalized comparison
- PSLF employment certification tracker
- Consolidation deadline advisor (July 1, 2026)
- Default prevention navigator
- IDR application pre-fill

**Life Event Cascades (Deep)**
- Expand from 12 events to 20+, with full paperwork sequences including deadlines, dependencies, and form pre-population
- Priority additions: "spouse died" (30+ workflows), "became disabled" (SSDI + SSI + FMLA + COBRA + Medicaid), "lost health insurance" (ACA SEP + Medicaid + CHIP)
- Temporal modeling: deadlines relative to event date, not static

### v2.1 — The Form Engine

**PDF Form Population**
- Generate actual IRS forms (1040, schedules) from computed data
- Generate USCIS forms (I-130, I-485, I-765, N-400) from workflow bundles
- State benefit applications (where forms are publicly available)
- Use pdf-lib (already a dependency) for form field population

**Document Intelligence**
- Expand OCR beyond W-2/1099 to: passport, driver's license, green card, EAD, SSA-1099, 1095-A
- Evidence checklist verification: "upload your lease — I'll extract the address and landlord info"
- Photo quality checker for passport/visa photos

**Validation Rules Engine**
- Cross-form validation (Schedule D feeds 1040 line 7, Form 8949 feeds Schedule D)
- Business rules engine for eligibility (if TANF → categorically eligible for SNAP)
- IRS consistency checks (W-2 wages match 1040 line 1a, total across multiple W-2s)
- Immigration form consistency (name/DOB/A-Number match across I-130, I-485, I-765)

### v2.2 — The Agent Platform

**MCP Server Expansion**
- Expose all 50+ tools (currently 24)
- Add: draft management, vault operations, profile CRUD, batch processing, PDF generation
- Tasks primitive for long-running workflows (document upload → OCR → validation → review)
- Elicitation for credential entry and document upload flows
- `.well-known/mcp.json` discovery endpoint

**PII Protection Layer**
- MCP interception tokenizer: SSN → [SSN_1], A-Number → [ANUM_1], etc.
- Hybrid detection: regex fast path + Presidio NLP
- Session-scoped token maps with automatic cleanup
- Audit trail of every tokenization/detokenization event
- Zero-knowledge mode option (token maps encrypted, never stored in plaintext)

**Agent Orchestration**
- Claude Agent SDK integration for multi-step government workflows
- Hierarchical orchestrator: life event → domain specialists → form fillers → validators
- Plan-and-execute pattern: Opus plans, Haiku executes (70-90% token savings)
- Shared scratchpad for cross-domain state (household data, income, documents)

**Government API Integrations**
- USCIS Case Status API (already have — expand to processing time predictions)
- CMS Marketplace API (plan comparison, APTC calculation)
- VA Lighthouse API (benefits eligibility, facility lookup, claim status)
- SSA benefits estimation (when API access available)
- IRS MeF integration research (restricted, long-term goal)

### v2.3 — The State Layer

**State Benefits Portals**
- Skyvern-style browser automation for the 10 highest-population states
- Explore mode: learn each state portal's navigation flow
- Replay mode: deterministic Playwright scripts for application pre-fill
- Never auto-submit — prepare the application, hand off to user for submission

**50-State Tax Coverage**
- Full state income tax returns for all 41 states + DC that have income tax
- State-specific credits, deductions, and phase-outs
- Multi-state allocation for remote workers
- Reciprocity agreements between states

**County-Level Intelligence**
- Property tax exemption lookup (veteran, senior, homestead — varies by county)
- Local permit requirements
- School district boundaries for education program eligibility
- Housing authority contact info and waitlist status (where available)

---

## Part 6: What This Becomes

PigeonGov v1 is a CLI that calculates tax forms.

PigeonGov v2 is the **operating system for navigating American bureaucracy**:

- A family's spouse dies → PigeonGov generates the full cascade: survivor benefits application, tax filing status change, Medicare enrollment, estate probate checklist, account retitling letters, VA burial benefits if veteran — with deadlines, dependencies, and pre-populated forms for each.

- A worker gets a raise offer → the cliff calculator shows exactly which benefits they'd lose, at what income thresholds, and whether the raise nets positive after accounting for lost SNAP, Medicaid, childcare subsidies, and EITC phase-out. With state-specific data, not federal approximations.

- An AI agent working on behalf of a family → connects via MCP, gets the full toolkit: 50+ tools for screening, calculating, filling, validating, and reviewing — with PII tokenized at the protocol layer so no SSN ever touches the model's context.

- An immigration lawyer's agent → uses PigeonGov MCP to prepare I-130 + I-485 + I-765 + I-864 packets, with current policy awareness (travel ban countries, fee changes, processing holds), evidence checklists, and cross-form consistency validation.

The $140 billion unclaimed benefits gap exists because no one has built the bridge between "you qualify" and "here's your completed application." PigeonGov v2 is that bridge.

---

## Appendix: Key Data Sources

### Government APIs
- USCIS Developer Portal (developer.uscis.gov)
- CMS Blue Button 2.0 / Marketplace API (developer.cms.gov)
- VA Lighthouse (developer.va.gov)
- GSA Open APIs (open.gsa.gov)
- IRS Direct File source (github.com/IRS-Public/direct-file)

### Existing MCP Servers
- IRS Taxpayer MCP — 39 tax tools, 50 states (github.com/dma9527/irs-taxpayer-mcp)
- US Gov Open Data MCP — 300+ tools, 40+ APIs (github.com/lzinga/us-gov-open-data-mcp)
- French Government MCP — first govt-published MCP server (github.com/datagouv/datagouv-mcp)

### Research
- Atlanta Fed CLIFF Tools (atlantafed.org)
- OWASP MCP Top 10 (owasp.org)
- NASCIO Agentic AI Report March 2026
- Code for America GetYourRefund / FileYourStateTaxes
- Tax Foundation State Tax Competitiveness Index
- KFF Medicaid Expansion Tracker
