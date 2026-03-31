# PigeonGov SaaS Product Spec

> The operating system for navigating American bureaucracy.

---

## 1. Product Name & Positioning

**Keep the name PigeonGov.** The brand already has npm presence, GitHub stars, and a marketing site. The name is memorable, slightly irreverent, and projects exactly the right personality: scrappy, persistent, gets things done despite hostile systems. Carrier pigeons delivered messages through warzones. This pigeon delivers benefits through bureaucracy.

**Positioning statement:** PigeonGov is the first platform that sees your whole life, not just one form. File taxes, check benefits eligibility, navigate immigration, plan for life events, and understand benefits cliffs — in one place, with one profile, with AI that connects the dots across agencies.

**Tagline:** "Government paperwork, without the paperwork." (Keep this — it's already on the site and it's good.)

**What PigeonGov is NOT:**
- Not a TurboTax competitor (TurboTax does one domain; PigeonGov does thirteen)
- Not a benefits screener (screeners tell you what you qualify for; PigeonGov fills the forms)
- Not an immigration lawyer replacement (PigeonGov prepares packets; lawyers review them)
- Not a government portal (PigeonGov never submits anything — always human-in-the-loop)

**What PigeonGov IS:**
- The only platform that connects tax filing to benefits eligibility to immigration status to student loans to estate planning — because those connections are where people fall through cracks
- A benefits cliff calculator that answers "should I take this raise?" with actual numbers
- A life event engine that turns "my spouse died" into a phased, deadline-aware, dependency-ordered action plan across 20+ workflows
- An AI-native platform where any MCP-compatible agent can orchestrate government workflows on behalf of a family

---

## 2. The Killer Feature: Cross-Domain Life Intelligence

Every competitor is a vertical silo. TurboTax knows your taxes. Boundless knows your immigration case. BenefitsCheckUp knows your SNAP eligibility. Nobody knows that your immigration status change affects your tax filing which affects your ACA subsidy which affects your student loan repayment plan.

PigeonGov does. The engine already has:
- **20 life events** with cross-domain workflow cascades (the `death-of-spouse` event triggers 20+ workflows across 5 phases spanning tax, benefits, estate, healthcare, identity, veterans, and legal domains)
- **Cross-agency dependency graph** that knows filing status changes propagate to SNAP, Medicaid, student loans, and ACA subsidies
- **Benefits cliff calculator** that models the compound effect of income changes across SNAP, Medicaid, WIC, LIHEAP, Section 8, SSI, and TANF simultaneously
- **Eligibility screener** that checks 13 programs in one pass

The killer feature for the SaaS product is making this intelligence visible and actionable through a consumer-grade UI. Nobody else can do this because nobody else has the cross-domain engine.

---

## 3. Core User Flows

### Flow 1: "What Just Happened?" — Life Event Onboarding

This is the primary entry point. Not "pick a form" — that's the old world. The new world starts with what happened to you.

**Screen 1: Landing / Life Event Selector**

Full-bleed page. No account required. Large cards, each representing a life event:

```
What's going on in your life?

[Lost my job]        [Having a baby]      [Getting married]
[Getting divorced]   [Spouse passed away]  [Moving states]
[Turning 65]         [Lost health insurance] [Income changed]
[Starting a business] [Becoming disabled]   [Got arrested]
[Natural disaster]   [Turning 18]          [Turning 26]
[Child turning 18]   [Received inheritance] [Immigration change]
[Buying a home]      [Retiring]

Or: [I just want to file my taxes →]
Or: [Check what benefits I qualify for →]
```

Each card has the event label and a one-line description. Color-coded by urgency (red border for events with hard deadlines like job loss, neutral for planning events like retirement).

**Screen 2: Quick Context Gather**

After selecting an event, a short conversational form (not a wall of fields). The minimum viable information to generate a plan:

```
Let's figure out what you need to do.

When did this happen?  [Date picker / "Not yet — I'm planning"]

How many people in your household?  [1] [2] [3] [4] [5+]

Approximate household income?  [Slider: $0 — $200k+]
(This determines which benefits you may qualify for)

Which state?  [Dropdown]

Any of these apply?
[ ] Veteran
[ ] Have a disability
[ ] Have children under 18
[ ] Currently on government benefits
[ ] Have student loans
```

This is 30 seconds of input. No SSN. No account. No payment. The screener and life event planner can run on just this.

**Screen 3: Your Action Plan**

This is the money screen. The life event planner output, rendered beautifully:

```
Your Action Plan: Job Loss
━━━━━━━━━━━━━━━━━━━━━━━━━
8 workflows across 3 phases | ~15 hours of paperwork | 2 urgent deadlines

PHASE 1: THIS WEEK                                    [2 urgent items]
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ File Unemployment Claim                    DEADLINE: 7 days  │
│    unemployment/claim-intake                                     │
│    File immediately — benefits start from filing date            │
│    [Start this workflow →]                                       │
├─────────────────────────────────────────────────────────────────┤
│ ⚡ Health Insurance                          DEADLINE: 60 days  │
│    healthcare/aca-enrollment                                     │
│    Special enrollment period — evaluate ACA vs COBRA             │
│    [Start this workflow →]                                       │
└─────────────────────────────────────────────────────────────────┘

PHASE 2: THIS MONTH                                   [3 items]
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Check SNAP Eligibility                                       │
│    Your income drop may qualify your household                   │
│    [Check eligibility →]                                         │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Check Medicaid Eligibility                                   │
│    Income-based — check before marketplace enrollment            │
│    [Check eligibility →]                                         │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Recalculate Student Loans                                    │
│    IDR recertification at lower income may reduce to $0/month   │
│    [Start this workflow →]                                       │
└─────────────────────────────────────────────────────────────────┘

PHASE 3: WHEN READY                                   [3 items]
  ...
```

Dependencies are shown inline ("Start this after filing unemployment claim"). Computed deadlines are actual dates, not relative strings. Progress indicators show which workflows are started/complete.

**Screen 4: Workflow Questionnaire**

When the user clicks "Start this workflow," they enter the guided form experience. Sections render one at a time (like a wizard, not a mega-form). Fields come from the workflow's `sections` array — the same data that drives the CLI TUI.

```
Unemployment Claim — Section 1 of 4: Personal Information

First name          [___________]
Last name           [___________]
Social Security #   [___-__-____]    🔒 Encrypted locally

[Save draft]  [Back]  [Continue →]
```

Profile auto-fill: if the user has created a profile, identity fields pre-populate. The `mergeProfileIntoStarterData` function already does this.

**Screen 5: Review & Export**

After completing a workflow, the review screen shows the `WorkflowBundle.review` output:

```
Review: Unemployment Claim Intake
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary
  • Filing for state: California
  • Estimated weekly benefit: $450
  • Claim effective date: April 7, 2026

⚠ Flagged Fields (1)
  • employer_address: Missing — required for claim processing

[Fix flagged fields]  [Download PDF]  [Save to vault]

What's next?
  → This workflow feeds into: SNAP eligibility, Medicaid eligibility
  → "Start SNAP screening with your unemployment data pre-filled"
```

The cross-domain handoff is the magic: completing one workflow pre-populates downstream workflows. The dependency graph already models this.

---

### Flow 2: "Should I Take This Raise?" — Benefits Cliff Explorer

This is the single most underserved tool in the entire government-tech space. The Atlanta Fed's CLIFF tools exist but aren't consumer-facing. PigeonGov's calculator already works. The SaaS wraps it in a visual experience.

**Screen 1: Income & Household Input**

Same quick-gather as the life event flow (household size, income, state, ages). Can be skipped if profile exists.

**Screen 2: The Cliff Visualization**

An interactive chart. X-axis is income. Y-axis is total household value (income + benefits). Shows:

- Current position (green dot)
- Each cliff point (red zone showing where net value drops)
- The "safe raise threshold" (green zone on the far side of the cliff)
- Individual program lines that show exactly which benefit drops off at what income

```
Total Household Value
$62,000 ┤
         │    ████ Current position ($32,000 income + $30,000 benefits)
$55,000 ┤   █    █
         │  █      █ ← SNAP drops off at $34,700
$48,000 ┤ █        █████
         │█              █ ← Medicaid drops off at $41,900
$40,000 ┤                █████████████████████████
         │                                         ██████████
$35,000 ┤                                                    █████ ← Safe: $52,500
         └──────────────────────────────────────────────────────────
         $30k    $35k    $40k    $45k    $50k    $55k

Your household currently receives ~$2,500/month in benefits:
  SNAP:     $835/mo  (drops at $34,700/yr)
  Medicaid: $1,200/mo value (drops at $41,900/yr)
  WIC:      $150/mo  (drops at $48,300/yr)
  LIHEAP:   $75/mo   (drops at $23,400/yr — already past)

🎯 Safe raise threshold: $52,500/year
   You'd need a $20,500/year raise to come out ahead.
   A raise to $36,000 would actually COST your household $8,200/year.
```

Below the chart: a slider that lets the user explore "what if my income changed to $X?" and see the real-time effect on every program. This uses the existing `calculateCliff` function with dynamic input.

**Screen 3: Scenario Planner**

"What if?" mode. User can model:
- "What if I got a raise to $X?"
- "What if I added a household member?"
- "What if I moved to a different state?"
- "What if my spouse started working?"

Each scenario re-runs the cliff calculator and shows the delta. This leverages the existing `whatif` scenario engine.

---

### Flow 3: "What Do I Qualify For?" — Eligibility Screener

**Screen 1: Quick Screener Input**

Same household context form. If they came from Flow 1 or Flow 2, the data is already populated.

**Screen 2: Results Dashboard**

```
Benefits You Likely Qualify For
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LIKELY ELIGIBLE                                    Total: ~$2,100/mo
┌─────────────────────────────────────────────────────────────────┐
│ ✅ SNAP (Food Assistance)            ~$835/mo                   │
│    Income at 98% FPL — below 130% limit                         │
│    [Start SNAP application →]                                   │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Medicaid                          ~$1,200/mo value           │
│    CA is expansion state, income below 138% FPL                 │
│    [Start Medicaid workflow →]                                  │
├─────────────────────────────────────────────────────────────────┤
│ ✅ WIC                               ~$150/mo                   │
│    Child under 5, income below 185% FPL                         │
│    [Start WIC workflow →]                                       │
└─────────────────────────────────────────────────────────────────┘

WORTH INVESTIGATING
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Section 8 Housing                                            │
│    Housing costs exceed 30% of income — waitlists vary          │
│    [Learn more →]                                               │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 LIHEAP (Energy Assistance)                                   │
│    Income at 98% FPL — below 150% limit                         │
│    [Start LIHEAP workflow →]                                    │
└─────────────────────────────────────────────────────────────────┘

💰 You may be leaving ~$25,200/year on the table.
```

The total unclaimed value is the hook. That number — personalized to the user's actual situation — is the viral moment. "I was leaving $25,000 on the table and didn't know it."

---

### Flow 4: "File My Taxes" — Tax Workflow

For users who come in specifically for taxes. This is the most direct TurboTax comparison, but the differentiation is what happens AFTER the return.

**Screen 1: Tax Return Wizard**

Renders the `tax/1040` sections as a step-by-step wizard. Same section structure that already exists in the workflow definition. Document upload (W-2 photo → OCR → auto-populate) is a stretch goal for v1 but the extraction tool already exists in the MCP.

**Screen 2: Return Review**

Shows the `WorkflowBundle.review` output: refund/owed, gross income, taxable income, flagged fields. The PDF writer generates a downloadable review document.

**Screen 3: Cross-Domain Intelligence (the differentiator)**

After the return is computed, PigeonGov does what nobody else does:

```
Based on your return, we noticed:

📊 Benefits Eligibility
   Your AGI of $34,200 for a household of 3 means you likely qualify for:
   • SNAP (~$635/mo)  •  Medicaid  •  WIC (child under 5)
   → [Check all benefits eligibility]

⚠️ Benefits Cliff Alert
   You're $500 below the SNAP cutoff. A small raise could cost $7,620/year.
   → [See full cliff analysis]

📚 Student Loans
   Your IDR payment at this income: ~$0-47/month (depending on plan)
   → [Calculate loan repayment options]

💡 Missed Deductions
   The engine flagged 2 potential deductions you didn't claim.
   → [Review missed deductions]
```

This screen is impossible to build without the cross-domain engine. It's the moment where PigeonGov proves it sees connections competitors can't.

---

### Flow 5: "Help My Clients" — Pro Navigator Dashboard

For benefits navigators, legal aid attorneys, and community organizations.

**Screen 1: Client List**

```
Your Clients                                    [+ New Client]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maria Santos        3 active workflows  ⚡ 1 deadline in 5 days
  immigration/family-visa, tax/1040, benefits/medicaid

James Washington    1 active workflow   ✅ On track
  veterans/disability-claim

Chen Wei Family     5 active workflows  ⚠ 2 flagged fields
  tax/1040, benefits/snap, education/fafsa, ...

[Filter by: domain | deadline | status]
```

**Screen 2: Client Workspace**

Same workflow experience as the consumer tier, but with:
- Client profile management (navigator fills on behalf of client)
- Case notes per workflow
- Deadline calendar across all clients
- Bulk PDF export ("generate all packets for this family")
- Audit trail (who changed what, when)
- Handoff workflow: navigator prepares, client reviews and signs

**Screen 3: Organization Dashboard**

For the community org that employs multiple navigators:
- Aggregate statistics (clients served, benefits unlocked, workflows completed)
- Navigator assignment and workload
- Reporting for grant compliance ("we helped 400 families access $2.1M in benefits this quarter")

---

## 4. The Dashboard — Home Screen

After a user creates an account (free), they see their household dashboard:

```
Good morning, Pigeon.                         Household: 3 people | CA

YOUR ACTIVE WORKFLOWS                                    [+ New]
┌────────────────────────┐ ┌────────────────────────┐
│ Tax Return 2025        │ │ SNAP Application       │
│ ████████░░ 80%         │ │ ██░░░░░░░░ 20%         │
│ 1 flagged field        │ │ Section 2 of 5         │
│ [Continue →]           │ │ [Continue →]           │
└────────────────────────┘ └────────────────────────┘

UPCOMING DEADLINES
  📅 Apr 15  Federal tax return (9 days)
  📅 Jun 15  Estimated tax payment Q2
  📅 Jul 1   Student loan consolidation deadline

BENEFITS SNAPSHOT
  Currently receiving: SNAP ($635/mo), Medicaid
  Potential unclaimed: WIC (~$150/mo), LIHEAP (~$75/mo)
  Next recertification: SNAP in 4 months

RECENT ACTIVITY
  ✅ Completed eligibility screening (Mar 28)
  💾 Draft saved: Tax Return 2025 (Mar 27)
  📄 PDF exported: Benefits cliff analysis (Mar 25)
```

The dashboard is organized around action, not taxonomy. It doesn't say "Tax domain" and "Benefits domain" — it says "here's what you need to do and when."

---

## 5. Feature Tiers

### Free Tier — "Community"

**Target:** Families navigating their own paperwork. This is the $140B TAM. Nobody should pay to discover they qualify for benefits.

Everything a family needs to help themselves:

- **All 20 life events** with full action plans and deadline computation
- **Eligibility screening** across all 13 programs (SNAP, Medicaid, WIC, LIHEAP, Section 8, SSI, SSDI, TANF, ACA, unemployment, VA healthcare, VA disability, FAFSA)
- **Benefits cliff calculator** with interactive visualization
- **All 36 workflow questionnaires** — guided form filling for every domain
- **PDF generation** — download review PDFs and filled form packets
- **Draft saving** — resume workflows where you left off (stored locally or with account)
- **Household profile** — fill once, auto-populate everywhere
- **Cross-domain intelligence** — the "Based on your return, we noticed..." insights
- **1 household** (the user's own family)
- **Encrypted local vault** — store sensitive documents with AES-256-GCM
- **Community support** (GitHub discussions)

What's NOT in free: no multi-client management, no bulk processing, no priority support, no organization features. The free tier is complete for self-service use. It is not a crippled demo.

### Pro Tier — $29/month or $290/year — "Navigator"

**Target:** Benefits navigators, legal aid attorneys, immigration paralegals, community health workers, tax preparers, social workers.

Everything in Free, plus:

- **Multi-client management** — unlimited client profiles
- **Case tracking** — status, deadlines, notes per client
- **Bulk operations** — batch eligibility screening, batch PDF generation
- **Client handoff** — prepare workflows, generate review links for client sign-off
- **Deadline calendar** — unified view across all clients
- **Advanced cliff modeling** — multi-year projections, scenario comparison, state-specific program rules
- **Export & reporting** — CSV/PDF reports for grant compliance, case documentation
- **Document vault per client** — encrypted storage organized by client
- **Audit trail** — full history of who changed what
- **Priority support** — email response within 24 hours

### Enterprise Tier — Custom pricing — "Organization"

**Target:** Legal aid organizations, state agencies, large nonprofits, healthcare systems.

Everything in Pro, plus:

- **Organization management** — multiple navigator seats under one account
- **Role-based access control** — admin, navigator, reviewer roles
- **Organization-wide dashboard** — aggregate metrics, workload distribution
- **SSO/SAML** — enterprise authentication
- **Dedicated support** — Slack channel, onboarding assistance
- **Custom workflow plugins** — organization-specific workflows using the plugin system (`WorkflowPlugin` type already exists)
- **API access** — REST API for integration with case management systems
- **Data residency options** — specify where client data is stored
- **Grant compliance reporting** — automated reporting templates for common federal grants
- **White-label option** — custom branding for portal deployment

### API Tier — Usage-based — "Platform"

**Target:** AI agent developers, LegalTech companies, fintech platforms.

- **MCP server access** — all 28+ tools (the existing MCP server, hosted)
- **REST API access** — the existing API routes, hosted with auth
- **Webhook notifications** — workflow completion, deadline alerts
- **Rate limits by plan** — 1,000 / 10,000 / 100,000 calls/month
- **Usage-based pricing** — $0.01/workflow fill, $0.005/eligibility screen, $0.001/cliff calculation
- **SLA** — 99.9% uptime

---

## 6. Technical Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App (App Router)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Dashboard │ │ Workflows│ │ Cliff Viz│ │ Pro/Admin│           │
│  │   Pages   │ │  Wizard  │ │  Charts  │ │  Panel  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │             │             │                 │
│  ┌────┴─────────────┴─────────────┴─────────────┴──────────┐    │
│  │              React Server Components + Actions           │    │
│  │         (Server-side rendering, form handling)            │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐    │
│  │                  PigeonGov Engine (unchanged)             │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐│    │
│  │  │ Workflow   │ │ Advisory  │ │ Engine    │ │ Storage  ││    │
│  │  │ Registry   │ │ (cliff,   │ │ (tax calc,│ │ (vault,  ││    │
│  │  │ (36 wf)    │ │  screener,│ │  state,   │ │  drafts, ││    │
│  │  │            │ │  events,  │ │  forms,   │ │  profile)││    │
│  │  │            │ │  deps)    │ │  crypto)  │ │          ││    │
│  │  └───────────┘ └───────────┘ └───────────┘ └──────────┘│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                     Data Layer                            │    │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐            │    │
│  │  │ Postgres │ │ Client-   │ │ Encrypted    │            │    │
│  │  │ (accounts│ │ side      │ │ Blob Store   │            │    │
│  │  │  clients,│ │ IndexedDB │ │ (vault docs) │            │    │
│  │  │  billing)│ │ (drafts,  │ │              │            │    │
│  │  │          │ │  profile) │ │              │            │    │
│  │  └──────────┘ └───────────┘ └──────────────┘            │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**1. The engine runs server-side, unchanged.**

The PigeonGov engine (`src/engine/`, `src/workflows/`, `src/advisory/`) is a pure TypeScript library with no browser dependencies. It imports `node:crypto`, `node:fs`, etc. It runs server-side in Next.js API routes and Server Actions. The engine code is NOT modified for the SaaS — it's imported as-is.

This means: every improvement to the open-source engine (new workflows, better calculators, new life events) automatically improves the SaaS product. The open-source project IS the engine; the SaaS IS the experience layer.

**2. Privacy-preserving hybrid storage.**

- **Free tier (no account):** Drafts and profile data persist in browser IndexedDB. Workflow computation still happens server-side (the engine needs Node.js), but the server receives form data, computes the bundle, returns the result, and retains nothing. Vault encryption keys never leave the client. This is the local-first promise kept: the server is stateless for free-tier users, functioning as a pure compute layer.
- **Free tier (with account):** Account metadata (email, preferences) in Postgres. Workflow data and profile in client-side IndexedDB by default, with opt-in cloud sync (encrypted at rest, user holds the key).
- **Pro/Enterprise tier:** Client data in Postgres (encrypted at rest). The navigator needs multi-device access and client sharing. But: PII fields (SSN, A-Number, DOB) are encrypted with a per-organization key before hitting the database. The server cannot read PII without the organization's key.

**3. The engine's existing types drive the UI.**

The `WorkflowQuestionSection` and `WorkflowQuestionField` types already define everything a form renderer needs: field key, label, type (text/currency/select/date/confirm), help text, options. The React form wizard is a generic renderer that takes `sections: WorkflowQuestionSection[]` and produces `answers: Record<string, unknown>`.

This means: adding a new workflow to the engine (a new `.ts` file in `src/workflows/domains/`) automatically adds a new form to the web app. No frontend work required per workflow.

**4. Next.js App Router with Server Actions.**

- Server Components render workflow descriptions, eligibility results, and review screens (these are read-heavy, benefit from streaming)
- Server Actions handle form submissions (call `buildWorkflowBundle`, `screenEligibility`, `calculateCliff`, etc.)
- Client Components for interactive elements: cliff chart (canvas/SVG), form wizard (state management), draft auto-save
- No separate API needed for the web app — Server Actions call the engine directly

**5. The existing REST API and MCP server serve the API tier.**

The REST API (`src/api/`) and MCP server (`src/mcp/`) already exist and work. For the API tier, we host them behind auth (API keys for REST, OAuth for MCP) with rate limiting and usage tracking. No new API surface needed.

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Server Components for engine calls, Server Actions for forms, streaming for long computations |
| UI | Tailwind CSS + shadcn/ui | Fast development, good accessibility defaults, works well with the existing design language |
| Charts | D3.js (cliff visualization) | Need custom interactive chart that standard chart libraries can't do |
| Auth | NextAuth.js (Auth.js v5) | Supports email/password + OAuth + SSO for enterprise |
| Database | Postgres (Neon or Supabase) | Accounts, billing, client management, audit trail |
| Client storage | IndexedDB (via idb) | Drafts, profile, vault keys for local-first free tier |
| Payments | Stripe | Subscriptions for Pro/Enterprise, usage-based for API tier |
| Hosting | Vercel | Natural fit for Next.js, edge functions for API tier |
| PDF | pdf-lib (already a dependency) | Engine already generates PDFs — no new dependency |
| Encryption | Web Crypto API (client) + node:crypto (server) | Vault already uses AES-256-GCM; Web Crypto for client-side operations |

### Data Model (Postgres)

```sql
-- Core accounts
users (id, email, name, created_at, tier)
organizations (id, name, tier, encryption_key_hash, created_at)
org_memberships (user_id, org_id, role)

-- Client management (Pro/Enterprise)
clients (id, org_id, encrypted_profile, created_at, updated_at)
client_workflows (id, client_id, workflow_id, status, answers_encrypted, created_at, updated_at)
client_notes (id, client_workflow_id, user_id, note_encrypted, created_at)

-- Workflow state
drafts (id, user_id, client_id, workflow_id, answers_encrypted, completed_sections, created_at, updated_at)
completed_bundles (id, user_id, client_id, workflow_id, bundle_encrypted, created_at)

-- Vault
vault_entries (id, user_id, client_id, filename_encrypted, mime_type, tags, linked_workflows, blob_key, created_at)

-- API tier
api_keys (id, user_id, key_hash, tier, rate_limit, created_at)
api_usage (id, api_key_id, endpoint, timestamp, response_ms)

-- Billing
subscriptions (id, user_id, org_id, stripe_subscription_id, tier, status)
```

All `_encrypted` columns use AES-256-GCM with per-user or per-org keys. The application cannot read PII without the user's session key.

---

## 7. AI Agent Integration

The MCP server is already the developer platform. But the SaaS product has a unique AI angle for consumer users:

### Agent-Assisted Workflow Completion

For complex workflows (immigration packets, disability claims, estate planning), the user can opt into AI assistance:

```
Need help with this section?

[Fill it myself]  [Get AI help →]
```

"Get AI help" connects to a PigeonGov agent (via the MCP server) that:
1. Reads the workflow schema (what fields are needed)
2. Reads the user's profile (what data is already known)
3. Asks natural-language questions to fill gaps
4. Populates the form fields
5. Explains each field in plain English (using the glossary)
6. Flags potential issues (using the validator)

The agent NEVER sees raw PII. The PII tokenization layer (described in the V2 plan) intercepts SSNs, A-Numbers, etc. before they reach the model. The token map is session-scoped and encrypted.

### Agent-to-Agent Orchestration

For the API tier, external agents (Claude, GPT, custom) can use PigeonGov's MCP tools to:

```
1. screen-eligibility → "What does this family qualify for?"
2. plan-life-event → "What workflows do they need?"
3. start-workflow → "Begin filling the first workflow"
4. fill-workflow → "Populate fields from conversation"
5. validate-workflow → "Check for errors"
6. build-packet → "Generate the PDF packet"
```

This is the full lifecycle, composable, with each step returning structured data. No other government-tech product offers this.

---

## 8. Differentiation Matrix

| Capability | PigeonGov | TurboTax | Boundless | BenefitsCheckUp | GetCalFresh |
|---|---|---|---|---|---|
| Tax filing | Yes (federal + 10 states) | Yes (all states) | No | No | No |
| Benefits screening | Yes (13 programs) | No | No | Yes (screening only) | Yes (SNAP only) |
| Immigration workflows | Yes (5 workflows) | No | Yes (marriage-based) | No | No |
| Benefits cliff analysis | Yes (interactive) | No | No | No | No |
| Life event cascades | Yes (20 events, cross-domain) | No | No | No | No |
| Cross-domain intelligence | Yes (13 domains connected) | No | No | No | No |
| Form filling (not just screening) | Yes | Yes (tax only) | Yes (immigration only) | No | No |
| Student loan tools | Yes | No | No | No | No |
| Veterans benefits | Yes | No | No | Partial | No |
| Estate planning | Yes | No | No | No | No |
| MCP/AI agent integration | Yes (28 tools) | No | No | No | No |
| Local-first / privacy | Yes (client-side encryption) | No (cloud) | No (cloud) | N/A | N/A |
| Open source engine | Yes | No | No | Partial | Yes |
| Multi-client (pro) | Yes | Yes (tax pro) | No | No | No |
| Price (individual) | Free | $0-219 | $449-799 | Free | Free |

The row that matters most: **Cross-domain intelligence.** Nobody else has it. Nobody else is close. The dependency graph, life event engine, and cliff calculator represent years of domain modeling that can't be replicated by wrapping a single agency's API.

---

## 9. What Makes This Hard to Copy

### Structural Moats

1. **Cross-domain knowledge graph.** The 60+ dependency relationships between workflows, the 20 life event cascades, the eligibility rules that chain across programs (TANF receipt → categorical SNAP eligibility → Medicaid) — this is domain expertise encoded in code. It took months of research into federal and state program rules. Competitors would need to do the same research AND build the same engine architecture.

2. **MCP-native from day one.** The MCP server isn't bolted on — the engine was designed for structured tool use. 28 tools with typed schemas, structured outputs, validation. Competitors starting from a web UI would need to decompose their entire product into tool-callable units to match this.

3. **Open source engine creates a contribution flywheel.** Every workflow contributed by the community (via the `WorkflowPlugin` system) makes the SaaS product better. Contributors get a free tool; PigeonGov gets a wider moat. TurboTax can't open-source its tax engine because that IS their product. PigeonGov can because the product is the experience + intelligence layer, not the forms.

4. **Local-first architecture locks in trust.** Once a user's vault is encrypted client-side with their key, switching to a competitor means re-uploading and re-encrypting everything. More importantly: the privacy architecture is a trust signal that government-skeptical users (veterans, immigrants, people with past legal issues) need.

5. **Benefits cliff data is a defensible dataset.** State-specific program rules, county-level AMI limits, categorical eligibility chains — this data doesn't exist in any single API. PigeonGov assembles it from dozens of sources into a queryable calculator. This is a data moat that compounds over time as more states and programs are added.

### Network Effects

- **More users → better eligibility data.** Anonymized aggregates reveal patterns: "73% of users in GA earning $28-32K qualify for SNAP but haven't applied." This becomes publishable research that drives awareness.
- **More navigators → more workflows.** Pro users identify gaps ("there's no CCDF childcare subsidy workflow") and contribute them via the plugin system.
- **More AI agents → more integrations.** Each agent built on the MCP server becomes a distribution channel.

---

## 10. Viral Loop

### The "$X Left on the Table" Moment

When the eligibility screener reveals unclaimed benefits, the result is inherently shareable:

```
"PigeonGov just told me I qualify for $25,200/year in benefits I never applied for."
```

Implementation: after screening results, offer a shareable card (image) with the aggregate number (no PII). Social sharing buttons for Twitter/Facebook/text. The card links to pigeongov.com where the recipient can run their own screening in 30 seconds.

### The Cliff Chart Share

The benefits cliff visualization is visually striking and politically resonant. "A $1,000 raise would cost me $8,200" is a chart that gets shared on social media, cited by journalists, referenced by policy advocates.

Implementation: export cliff chart as PNG/SVG with a PigeonGov watermark and link. No PII in the exported chart — just income ranges and program names.

### Navigator Referral

Navigators who help a family will naturally recommend PigeonGov to other families. The tool makes the navigator more effective, so they evangelize it.

Implementation: Pro users get a referral link. Families who sign up via a navigator link get tagged to that navigator's dashboard (with consent). The navigator sees their impact metrics grow.

### The "Death of a Spouse" Action Plan

This is the most emotionally compelling feature. Nobody else generates a 20-workflow, 5-phase, deadline-aware action plan for someone who just lost their partner. When someone shares this with a grief support group, a funeral director, or an estate attorney, it spreads.

Implementation: the life event plan is exportable as a PDF checklist. Funeral homes and hospice organizations are distribution partners.

---

## 11. Revenue Model

### Assumptions

- Year 1 focus: product-market fit with free tier + early Pro adopters
- Year 2: Pro tier growth + Enterprise pilots
- Year 3: API tier at scale + Enterprise contracts

### Revenue Projections (Conservative)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free users | 50,000 | 250,000 | 1,000,000 |
| Pro subscribers | 200 | 2,000 | 8,000 |
| Enterprise orgs | 5 | 30 | 100 |
| API developers | 20 | 200 | 1,000 |
| **Pro revenue** | $70K | $696K | $2.78M |
| **Enterprise revenue** | $60K | $540K | $2.4M |
| **API revenue** | $5K | $120K | $600K |
| **Total ARR** | **$135K** | **$1.36M** | **$5.78M** |

**Pro pricing math:** $29/mo x 200 subscribers = $69,600/yr (Year 1). Realistic because there are ~60,000 VITA volunteers, ~15,000 immigration attorneys, ~30,000 benefits navigators, and ~50,000 social workers in the US. 200 is 0.1% penetration of just the VITA volunteers.

**Enterprise pricing:** ~$1,000/mo average (varies by seats/features). 5 orgs in Year 1 is conservative — Legal Aid Society alone has 30 offices.

**API pricing:** Usage-based. 20 developers at ~$25/mo average in Year 1 is conservative. Grows as MCP ecosystem grows.

### Unit Economics

| Item | Cost |
|------|------|
| Hosting (Vercel Pro + Postgres) | ~$500/mo Year 1, scales with usage |
| Domain + DNS | ~$50/yr |
| Stripe fees | 2.9% + $0.30/transaction |
| Support (Year 1: founder-led) | $0 incremental |
| **Gross margin** | **~85%** (SaaS standard) |

The engine is computationally cheap — it's deterministic math, not LLM inference. A workflow fill takes <100ms of server time. The cliff calculator is a loop over a few hundred iterations. This is not an AI-cost business.

### Grant Revenue (Bonus)

PigeonGov's mission aligns with federal grant programs:
- **USDA SNAP Education grants** (for tools that increase SNAP enrollment)
- **HHS Community Health Worker grants** (for tools that improve benefits access)
- **DOJ Legal Aid Technology grants** (for tools that improve access to justice)
- **CFPB Financial Empowerment grants** (for tools that improve financial literacy)

A single federal grant can be $100K-$1M. This isn't fantasy — Code for America's GetYourRefund and BenefitsCal are grant-funded.

---

## 12. Launch Sequence

### Phase 1 — MVP (8 weeks)

Ship the free tier with:
- Life event selector + action plan generator (Flow 1)
- Eligibility screener with results (Flow 3)
- Benefits cliff calculator with basic chart (Flow 2)
- Tax workflow wizard (Flow 4, 1040 only)
- Household profile + draft saving (IndexedDB)
- No account required for basic use

This is enough to validate product-market fit. The engine already does all the computation — the work is purely UI.

### Phase 2 — Accounts + More Workflows (4 weeks)

- User accounts (email + OAuth)
- Dashboard (the home screen described above)
- All 36 workflows rendered as web forms
- PDF export for all workflows
- Cloud draft sync (opt-in, encrypted)

### Phase 3 — Pro Tier (4 weeks)

- Multi-client management
- Deadline calendar
- Case notes
- Bulk operations
- Stripe billing integration
- Pro onboarding flow

### Phase 4 — Polish + API (4 weeks)

- Interactive cliff chart (D3.js)
- Scenario comparison ("what if?")
- API tier with auth + usage tracking
- Hosted MCP server with API keys
- Enterprise SSO pilot

### Total: ~20 weeks from start to full product.

---

## 13. Open Questions

1. **State-specific benefits data.** The cliff calculator and screener use federal approximations for some programs. How aggressively do we pursue state-specific data in the SaaS vs. the engine? Recommendation: engine improvements benefit both CLI and SaaS, so prioritize there.

2. **Document upload / OCR.** The `extract-document` MCP tool exists but is basic. How much do we invest in W-2 photo → auto-populate for the web product? Recommendation: Phase 2 stretch goal — valuable but not required for MVP.

3. **Mobile.** The web app should be responsive, but is a native mobile app on the roadmap? Recommendation: responsive web first, native only if usage patterns demand it (likely they will — people fill government forms on phones).

4. **Compliance.** Is PigeonGov providing "tax advice" or "legal advice" in a regulated sense? Recommendation: clear disclaimers ("PigeonGov is a preparation tool, not a licensed advisor"), similar to TurboTax's positioning. Consult a lawyer before Pro tier launch.

5. **Internationalization.** The V2 plan mentions LEP.gov being removed. Should the SaaS support Spanish and other languages? Recommendation: Yes, by Phase 3. The US has 25M LEP individuals. Spanish alone covers 62% of them.
