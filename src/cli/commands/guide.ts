import type { Command } from "commander";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";

const MAIN_GUIDE = `
PigeonGov Agent Guide
=====================

Workflow Pipeline:
  1. pigeongov list --json              → see all 34 workflows
  2. pigeongov start <id> --json        → get starter data template
  3. pigeongov fill <id> --data <file> --json  → fill & validate
  4. pigeongov review <bundle> --json    → review the result

Intelligence Tools:
  pigeongov life-event <event> --json   → action plan for life events
  pigeongov screen --input <file> --json → eligibility screening
  pigeongov cliff --income X --household N --json → benefits cliff
  pigeongov dependencies <id> --json    → cross-agency effects
  pigeongov cost <id> --json            → DIY vs attorney costs
  pigeongov track <receipt> --json      → USCIS case status

Available Life Events:
  job-loss, marriage, divorce, new-baby, retirement, moving-states,
  death-of-spouse, buying-home, starting-business, becoming-disabled,
  aging-into-medicare, immigration-status-change

Tips for Agents:
  * Always use --json for structured output
  * Use 'start' to get the exact data shape before 'fill'
  * Exit code 0 = success, 2 = warnings, 3 = errors
  * The 'screen' command needs a JSON file (see pigeongov guide screen)
  * All processing is local — no data leaves the machine except 'track'

Run 'pigeongov guide <topic>' for detailed guidance on:
  fill, screen, life-events, exit-codes
`.trimStart();

const FILL_GUIDE = `
pigeongov guide fill — Filling Workflows
=========================================

Step-by-step workflow for agents:

  1. Get the template:
     $ pigeongov start tax/1040 --json > template.json

  2. The output contains a 'starterData' object and a '_guide' field.
     Copy starterData, fill in the values:

     {
       "taxpayer": {
         "firstName": "Jane",
         "lastName": "Doe",
         "ssn": "123-45-6789",
         "address": { "street1": "123 Main St", "city": "Austin", "state": "TX", "zipCode": "73301" }
       },
       "filingStatus": "single",
       "wages": 52000,
       "taxableInterest": 150,
       "ordinaryDividends": 0,
       "scheduleCNet": 0,
       "otherIncome": 0,
       "adjustments": {
         "educatorExpenses": 0,
         "hsaDeduction": 0,
         "selfEmploymentTaxDeduction": 0,
         "iraDeduction": 0,
         "studentLoanInterest": 0
       },
       "useItemizedDeductions": false,
       "itemizedDeductions": 0,
       "federalWithheld": 5200,
       "estimatedPayments": 0,
       "dependents": []
     }

  3. Run fill with the data:
     $ pigeongov fill tax/1040 --data template.json --json

  4. The output is a WorkflowBundle with:
     - workflowId: the workflow that was filled
     - review: { headline, notes, flaggedFields }
     - validation: { checks, flaggedFields }
     - calculation: computed values (tax, refund, etc.)
     - filledForm: the completed form fields

  5. Optionally validate or review separately:
     $ pigeongov validate ./bundle.json --json
     $ pigeongov review ./bundle.json --json

Exit codes:
  0 = success (no issues)
  2 = warnings (review recommended but not blocking)
  3 = validation errors (data needs correction)

The --data file shape varies per workflow. Always use 'pigeongov start <id>'
to discover the exact schema.
`.trimStart();

const SCREEN_GUIDE = `
pigeongov guide screen — Eligibility Screener
==============================================

The screen command evaluates eligibility for government benefit programs
based on 10 household data points.

Non-interactive usage:
  $ pigeongov screen --input screener.json --json

Input JSON format:
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

Field reference:
  householdSize            integer, 1-20
  annualHouseholdIncome    number, >= 0 (pre-tax)
  state                    2-letter state code (e.g., "CA", "TX")
  citizenshipStatus        us_citizen | permanent_resident |
                           conditional_resident | ead_holder |
                           refugee_asylee | undocumented | other
  ages                     array of integers (one per household member)
  hasDisability            boolean
  employmentStatus         employed | unemployed | self_employed |
                           retired | disabled
  isVeteran                boolean
  hasHealthInsurance       boolean
  monthlyRent              number, >= 0

Output (--json):
  {
    "input": { ... },
    "results": [
      {
        "program": "SNAP",
        "eligible": true,
        "estimatedMonthlyBenefit": 680,
        "notes": "..."
      },
      ...
    ]
  }
`.trimStart();

const LIFE_EVENTS_GUIDE = `
pigeongov guide life-events — Life Event Planning
===================================================

Life events trigger multiple government workflows. The life-event command
creates a prioritized, phased action plan.

Usage:
  $ pigeongov life-event --json                  # list all 12 events
  $ pigeongov life-event job-loss --json          # get action plan

Available events:
  job-loss                  Unemployment claim, health insurance, benefits
  marriage                  Filing status, name change, insurance
  divorce                   Filing status, child support, estate updates
  new-baby                  Health insurance, WIC, tax credits
  retirement                Social Security, Medicare, pension
  moving-states             Voter registration, license, tax nexus
  death-of-spouse           Estate, benefits, insurance, tax filing
  buying-home               Mortgage programs, property tax, insurance
  starting-business         EIN, licenses, tax registration
  becoming-disabled         SSDI, Medicaid, accommodations
  aging-into-medicare       Medicare enrollment, supplement plans
  immigration-status-change Work permits, travel, benefit eligibility

Output structure (--json):
  {
    "event": { "id": "job-loss", "label": "...", "description": "..." },
    "orderedWorkflows": [
      {
        "workflowId": "unemployment/claim-intake",
        "priority": 1,
        "phase": 1,
        "deadline": "File within 7 days",
        "notes": "...",
        "dependsOn": []
      },
      ...
    ],
    "totalWorkflows": 5,
    "hasUrgentDeadlines": true
  }
`.trimStart();

const EXIT_CODES_GUIDE = `
pigeongov guide exit-codes — Exit Code Reference
==================================================

  0   success           Clean run, no issues
  1   runtimeError      Unexpected crash or internal error
  2   hasWarnings        Completed but with review-worthy warnings
  3   hasErrors          Validation errors — data needs correction
  4   invalidInput       Bad CLI arguments or malformed input file
  5   notFound           Unknown workflow ID or resource
  6   permissionDenied   File access denied
  7   conflict           Conflicting data or duplicate entries
  8   schemaError        JSON input doesn't match expected schema
  9   dependencyMissing  Required upstream workflow not completed
  10  timeout            Operation timed out

For agents: check exit code 0 for success. Codes 2-3 mean the output
is still valid JSON but contains flagged issues. Codes 4+ mean the
command failed and stderr has details.
`.trimStart();

const TOPIC_GUIDES: Record<string, string> = {
  fill: FILL_GUIDE,
  screen: SCREEN_GUIDE,
  "life-events": LIFE_EVENTS_GUIDE,
  "exit-codes": EXIT_CODES_GUIDE,
};

const TOPIC_GUIDES_JSON: Record<string, { title: string; content: string }> = {
  fill: { title: "Filling Workflows", content: FILL_GUIDE },
  screen: { title: "Eligibility Screener", content: SCREEN_GUIDE },
  "life-events": { title: "Life Event Planning", content: LIFE_EVENTS_GUIDE },
  "exit-codes": { title: "Exit Code Reference", content: EXIT_CODES_GUIDE },
};

export function registerGuideCommand(program: Command): void {
  program
    .command("guide [topic]")
    .description(
      `Agent-friendly usage guide for PigeonGov.

  Without a topic, prints the full workflow pipeline, available commands,
  life events, and tips for non-interactive (agent) usage.

  With a topic, prints detailed guidance:
    fill         — step-by-step fill workflow with example JSON
    screen       — screener input format and field reference
    life-events  — all 12 life events with descriptions
    exit-codes   — what each exit code means

  Examples:
    $ pigeongov guide
    $ pigeongov guide fill
    $ pigeongov guide screen --json`,
    )
    .action((topic?: string) => {
      if (!topic) {
        if (isJsonMode()) {
          emitJson({
            guide: "PigeonGov Agent Guide",
            pipeline: [
              "pigeongov list --json",
              "pigeongov start <id> --json",
              "pigeongov fill <id> --data <file> --json",
              "pigeongov review <bundle> --json",
            ],
            intelligenceTools: [
              "pigeongov life-event <event> --json",
              "pigeongov screen --input <file> --json",
              "pigeongov cliff --income X --household N --json",
              "pigeongov dependencies <id> --json",
              "pigeongov cost <id> --json",
              "pigeongov track <receipt> --json",
            ],
            lifeEvents: [
              "job-loss", "marriage", "divorce", "new-baby", "retirement",
              "moving-states", "death-of-spouse", "buying-home",
              "starting-business", "becoming-disabled", "aging-into-medicare",
              "immigration-status-change",
            ],
            tips: [
              "Always use --json for structured output",
              "Use 'start' to get the exact data shape before 'fill'",
              "Exit code 0 = success, 2 = warnings, 3 = errors",
              "The 'screen' command needs a JSON file (see pigeongov guide screen)",
              "All processing is local — no data leaves the machine except 'track'",
            ],
            availableTopics: Object.keys(TOPIC_GUIDES),
          });
          return;
        }

        process.stdout.write(MAIN_GUIDE);
        return;
      }

      const guide = TOPIC_GUIDES[topic];
      if (!guide) {
        const available = Object.keys(TOPIC_GUIDES).join(", ");
        if (isJsonMode()) {
          emitJson({
            error: `Unknown guide topic: ${topic}`,
            availableTopics: Object.keys(TOPIC_GUIDES),
          });
        } else {
          process.stderr.write(`Unknown guide topic: "${topic}"\n`);
          process.stderr.write(`Available topics: ${available}\n`);
        }
        process.exitCode = 5;
        return;
      }

      if (isJsonMode()) {
        const jsonGuide = TOPIC_GUIDES_JSON[topic]!;
        emitJson({
          topic,
          title: jsonGuide.title,
          content: jsonGuide.content,
        });
        return;
      }

      process.stdout.write(guide);
    });
}
