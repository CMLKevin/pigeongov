import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { WorkflowDefinition } from "../registry.js";
import {
  buildEvidenceItem,
  buildGenericSummary,
  currency,
  genericArtifacts,
  makeCheck,
  makeFlag,
} from "../helpers.js";
import {
  basicWillInputSchema,
  powerOfAttorneyInputSchema,
  advanceDirectiveInputSchema,
  type BasicWillInput,
  type PowerOfAttorneyInput,
  type AdvanceDirectiveInput,
} from "../schemas/estate.js";

// ---------------------------------------------------------------------------
// estate/basic-will
// ---------------------------------------------------------------------------

/** Most states require 2 witnesses; a handful require or strongly recommend notarisation. */
function witnessRequirements(state: string): { witnesses: number; notarizationRecommended: boolean } {
  // Vermont requires 3 witnesses; Louisiana requires notarisation + 2 witnesses
  const threeWitnessStates = new Set(["VT"]);
  const notaryStates = new Set(["LA", "CO", "IN", "NH"]);

  return {
    witnesses: threeWitnessStates.has(state) ? 3 : 2,
    notarizationRecommended: notaryStates.has(state),
  };
}

const basicWillWorkflow = {
  summary: {
    id: "estate/basic-will",
    domain: "estate" as const,
    title: "Basic will planner",
    summary:
      "Plan asset distribution, executor selection, and guardian designation for a basic last will and testament.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["will", "estate", "executor", "guardian", "probate"],
  },
  inputSchema: basicWillInputSchema,
  starterData: {
    testatorName: "",
    state: "CA",
    maritalStatus: "single",
    children: [],
    assets: [],
    executor: { name: "", relationship: "" },
  } satisfies BasicWillInput,
  sections: [
    {
      id: "personal-information",
      title: "Personal Information",
      fields: [
        { key: "testatorName", label: "Your full legal name (testator)", type: "text" as const },
        { key: "state", label: "State of residence", type: "text" as const },
        {
          key: "maritalStatus",
          label: "Marital status",
          type: "select" as const,
          options: [
            { label: "Single", value: "single" },
            { label: "Married", value: "married" },
            { label: "Divorced", value: "divorced" },
            { label: "Widowed", value: "widowed" },
          ],
        },
      ],
    },
    {
      id: "assets-beneficiaries",
      title: "Assets & Beneficiaries",
      description: "List each asset with its estimated value and intended beneficiary.",
      fields: [
        {
          key: "assets",
          label: "Assets",
          type: "textarea" as const,
          helpText: "Enter each asset's description, estimated value, and beneficiary.",
        },
      ],
    },
    {
      id: "executor-guardian",
      title: "Executor & Guardian",
      fields: [
        { key: "executor.name", label: "Executor name", type: "text" as const },
        { key: "executor.relationship", label: "Executor relationship", type: "text" as const },
        {
          key: "alternateExecutor.name",
          label: "Alternate executor name (optional)",
          type: "text" as const,
        },
        {
          key: "guardianForMinors",
          label: "Guardian for minor children (if applicable)",
          type: "text" as const,
        },
      ],
    },
    {
      id: "state-requirements",
      title: "State Requirements",
      description: "Witness and notarisation requirements vary by state.",
      fields: [],
    },
  ],
  buildBundle(input: BasicWillInput): WorkflowBundle {
    const hasMinorChildren = input.children.some((c) => c.isMinor);
    const totalEstateValue = input.assets.reduce((s, a) => s + a.estimatedValue, 0);
    const uniqueBeneficiaries = new Set(input.assets.map((a) => a.beneficiary));
    const stateReqs = witnessRequirements(input.state);

    const evidence = [
      buildEvidenceItem("asset-docs", "Asset documentation (titles, deeds, account statements)", false, input.assets.length > 0),
      buildEvidenceItem("current-will", "Current will (if updating)", false, false),
    ];

    const flags: ValidationFlag[] = [
      // Always flag that this is a planning tool
      makeFlag(
        "general",
        "review",
        "This is a planning tool, not a legal document. Consult an attorney to draft and execute your will.",
      ),
    ];

    if (hasMinorChildren && !input.guardianForMinors) {
      flags.push(
        makeFlag(
          "guardianForMinors",
          "warning",
          "You have minor children but no guardian designated. Strongly recommended.",
        ),
      );
    }

    if (totalEstateValue > 500_000) {
      flags.push(
        makeFlag(
          "assets",
          "review",
          `Estate value (${currency(totalEstateValue)}) may benefit from trust planning or more sophisticated estate tools. Consult an estate attorney.`,
        ),
      );
    }

    const checks = [
      makeCheck(
        "testator-name",
        "Testator name provided",
        input.testatorName.trim().length > 0,
        "error",
        "Your full legal name is required.",
      ),
      makeCheck(
        "executor-named",
        "Executor named",
        input.executor.name.trim().length > 0,
        "error",
        "An executor must be named to administer the estate.",
      ),
      makeCheck(
        "assets-listed",
        "At least one asset listed",
        input.assets.length > 0,
        "warning",
        "List your assets to plan distribution.",
      ),
    ];

    return {
      workflowId: "estate/basic-will",
      domain: "estate",
      title: "Basic will planner",
      summary: "Will planning bundle. This is NOT a legal document — consult an attorney.",
      applicant: undefined,
      household: input.children.map((c) => ({
        name: c.name,
        relationship: "child",
        age: c.age,
        notes: c.isMinor ? "Minor" : undefined,
      })),
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        totalEstateValue,
        assetCount: input.assets.length,
        beneficiaryCount: uniqueBeneficiaries.size,
        hasMinorChildren,
        witnessesRequired: stateReqs.witnesses,
        notarizationRecommended: stateReqs.notarizationRecommended,
        hasAlternateExecutor: !!input.alternateExecutor,
        hasGuardian: !!input.guardianForMinors,
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Will plan",
        `${input.assets.length} assets, ${uniqueBeneficiaries.size} beneficiaries`,
        evidence,
        flags,
        [
          `Will plan for ${input.testatorName || "?"}. ${input.assets.length} assets, ${uniqueBeneficiaries.size} beneficiaries.`,
          `Executor: ${input.executor.name || "?"}${input.alternateExecutor ? ` (alternate: ${input.alternateExecutor.name})` : ""}.`,
          `State: ${input.state} — ${stateReqs.witnesses} witnesses required${stateReqs.notarizationRecommended ? ", notarisation recommended" : ""}.`,
          "Attorney review recommended.",
        ],
      ),
      outputArtifacts: genericArtifacts("estate-basic-will", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<BasicWillInput>;

// ---------------------------------------------------------------------------
// estate/power-of-attorney
// ---------------------------------------------------------------------------

const powerOfAttorneyWorkflow = {
  summary: {
    id: "estate/power-of-attorney",
    domain: "estate" as const,
    title: "Power of attorney planner",
    summary:
      "Select POA type, define granted powers, and understand state-specific requirements for durable, springing, healthcare, or financial powers of attorney.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["poa", "power-of-attorney", "estate", "durable", "healthcare"],
  },
  inputSchema: powerOfAttorneyInputSchema,
  starterData: {
    principalName: "",
    agentName: "",
    type: "durable",
    state: "CA",
    powers: ["financial management", "property transactions", "legal matters"],
  } satisfies PowerOfAttorneyInput,
  sections: [
    {
      id: "principal-agent",
      title: "Principal & Agent",
      fields: [
        { key: "principalName", label: "Principal (you)", type: "text" as const },
        { key: "agentName", label: "Agent (person receiving authority)", type: "text" as const },
      ],
    },
    {
      id: "powers",
      title: "Powers",
      fields: [
        {
          key: "powers",
          label: "Powers granted",
          type: "textarea" as const,
          helpText: "List specific powers: financial management, property transactions, healthcare decisions, etc.",
        },
      ],
    },
    {
      id: "type-selection",
      title: "Type Selection",
      fields: [
        {
          key: "type",
          label: "POA type",
          type: "select" as const,
          options: [
            { label: "Durable (survives incapacity)", value: "durable" },
            { label: "Springing (activates on condition)", value: "springing" },
            { label: "Healthcare", value: "healthcare" },
            { label: "Financial", value: "financial" },
          ],
        },
        {
          key: "effectiveDate",
          label: "Effective date (optional — immediate if blank)",
          type: "date" as const,
        },
        { key: "state", label: "State", type: "text" as const },
      ],
    },
  ],
  buildBundle(input: PowerOfAttorneyInput): WorkflowBundle {
    const evidence = [
      buildEvidenceItem("principal-id", "Principal identity document", true, false),
      buildEvidenceItem("agent-id", "Agent identity document", true, false),
    ];

    const flags: ValidationFlag[] = [];

    if (input.type === "springing") {
      flags.push(
        makeFlag(
          "type",
          "warning",
          "Springing POA may be harder to use in practice — the agent must prove the triggering condition (typically incapacity) has occurred, which can cause delays in emergencies.",
        ),
      );
    }

    // Recommend type based on selections
    const hasHealthcarePowers = input.powers.some(
      (p) => p.toLowerCase().includes("healthcare") || p.toLowerCase().includes("medical"),
    );
    let recommendedType: string;
    if (hasHealthcarePowers && input.type !== "healthcare") {
      recommendedType = "Consider a separate healthcare POA / advance directive for medical decisions.";
    } else if (input.type === "durable") {
      recommendedType = "Durable POA is the most common choice — remains effective if you become incapacitated.";
    } else if (input.type === "healthcare") {
      recommendedType = "Healthcare POA grants authority for medical decisions. Consider pairing with an advance directive.";
    } else if (input.type === "financial") {
      recommendedType = "Financial POA is limited to financial and property matters.";
    } else {
      recommendedType = "Springing POA activates only when a specified condition is met.";
    }

    const checks = [
      makeCheck(
        "principal-name",
        "Principal name provided",
        input.principalName.trim().length > 0,
        "error",
        "The principal's legal name is required.",
      ),
      makeCheck(
        "agent-name",
        "Agent name provided",
        input.agentName.trim().length > 0,
        "error",
        "The agent's legal name is required.",
      ),
      makeCheck(
        "powers-defined",
        "Powers defined",
        input.powers.length > 0,
        "error",
        "At least one power must be granted.",
      ),
    ];

    return {
      workflowId: "estate/power-of-attorney",
      domain: "estate",
      title: "Power of attorney planner",
      summary: "POA planning bundle. This is NOT a legal document — consult an attorney.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        poaType: input.type,
        powersCount: input.powers.length,
        recommendedType,
        isImmediate: !input.effectiveDate,
        stateFormNote: `Check ${input.state} statutory form requirements — many states have specific POA forms.`,
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Power of attorney",
        `${input.type} POA — ${input.powers.length} powers`,
        evidence,
        flags,
        [
          `${input.type.charAt(0).toUpperCase() + input.type.slice(1)} POA: ${input.principalName || "?"} grants authority to ${input.agentName || "?"}.`,
          `${input.powers.length} powers defined.`,
          recommendedType,
        ],
      ),
      outputArtifacts: genericArtifacts("estate-power-of-attorney", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<PowerOfAttorneyInput>;

// ---------------------------------------------------------------------------
// estate/advance-directive
// ---------------------------------------------------------------------------

const advanceDirectiveWorkflow = {
  summary: {
    id: "estate/advance-directive",
    domain: "estate" as const,
    title: "Advance directive planner",
    summary:
      "Document healthcare preferences, designate a healthcare agent, and create a distribution plan for your advance directive.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["advance-directive", "living-will", "healthcare-proxy", "estate", "end-of-life"],
  },
  inputSchema: advanceDirectiveInputSchema,
  starterData: {
    principalName: "",
    state: "CA",
    preferences: {
      lifeSupport: false,
      feedingTube: false,
      painManagement: true,
      organDonation: false,
    },
    healthcareAgent: { name: "", relationship: "" },
  } satisfies AdvanceDirectiveInput,
  sections: [
    {
      id: "healthcare-preferences",
      title: "Healthcare Preferences",
      fields: [
        { key: "preferences.lifeSupport", label: "Accept life-sustaining treatment", type: "confirm" as const },
        { key: "preferences.feedingTube", label: "Accept artificial nutrition/hydration", type: "confirm" as const },
        { key: "preferences.painManagement", label: "Prioritise comfort/pain management", type: "confirm" as const },
        { key: "preferences.organDonation", label: "Organ donation", type: "confirm" as const },
      ],
    },
    {
      id: "agent-selection",
      title: "Agent Selection",
      fields: [
        { key: "healthcareAgent.name", label: "Healthcare agent name", type: "text" as const },
        { key: "healthcareAgent.relationship", label: "Relationship", type: "text" as const },
        {
          key: "alternateAgent.name",
          label: "Alternate agent name (recommended)",
          type: "text" as const,
        },
        {
          key: "alternateAgent.relationship",
          label: "Alternate agent relationship",
          type: "text" as const,
        },
      ],
    },
    {
      id: "distribution",
      title: "Distribution",
      description: "Who should receive copies of your advance directive.",
      fields: [],
    },
  ],
  buildBundle(input: AdvanceDirectiveInput): WorkflowBundle {
    // No evidence required for advance directives — they are self-declarative
    const evidence = [] as ReturnType<typeof buildEvidenceItem>[];

    const flags: ValidationFlag[] = [];

    if (!input.alternateAgent) {
      flags.push(
        makeFlag(
          "alternateAgent",
          "review",
          "No alternate healthcare agent designated. Consider naming one in case your primary agent is unavailable.",
        ),
      );
    }

    // Distribution checklist
    const distributionChecklist = [
      { recipient: "Primary care physician", distributed: false },
      { recipient: "Hospital / healthcare system", distributed: false },
      { recipient: `Healthcare agent: ${input.healthcareAgent.name || "?"}`, distributed: false },
      ...(input.alternateAgent
        ? [{ recipient: `Alternate agent: ${input.alternateAgent.name}`, distributed: false }]
        : []),
      { recipient: "Family members", distributed: false },
      { recipient: "Attorney (if applicable)", distributed: false },
    ];

    // Summarise preferences
    const preferencesSummary = [
      `Life support: ${input.preferences.lifeSupport ? "accept" : "decline"}.`,
      `Artificial nutrition/hydration: ${input.preferences.feedingTube ? "accept" : "decline"}.`,
      `Pain management priority: ${input.preferences.painManagement ? "yes" : "no"}.`,
      `Organ donation: ${input.preferences.organDonation ? "yes" : "no"}.`,
    ];

    const checks = [
      makeCheck(
        "principal-name",
        "Your name provided",
        input.principalName.trim().length > 0,
        "error",
        "Your legal name is required.",
      ),
      makeCheck(
        "agent-name",
        "Healthcare agent named",
        input.healthcareAgent.name.trim().length > 0,
        "error",
        "A healthcare agent must be designated.",
      ),
    ];

    return {
      workflowId: "estate/advance-directive",
      domain: "estate",
      title: "Advance directive planner",
      summary: "Advance directive planning bundle. This is NOT a legal document — consult an attorney or use your state's statutory form.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        distributionChecklist,
        preferencesSummary,
        hasAlternateAgent: !!input.alternateAgent,
        stateFormNote: `Use ${input.state}'s statutory advance directive form for legal validity.`,
      },
      validation: { checks, flaggedFields: flags },
      review: {
        headline: `Advance directive for ${input.principalName || "?"}. Healthcare agent: ${input.healthcareAgent.name || "?"}. Key preferences documented.`,
        notes: [
          `Advance directive for ${input.principalName || "?"}.`,
          `Healthcare agent: ${input.healthcareAgent.name || "?"} (${input.healthcareAgent.relationship || "?"}).`,
          ...preferencesSummary,
          `Distribute copies to ${distributionChecklist.length} recipients.`,
        ],
        flaggedFields: flags,
      },
      outputArtifacts: genericArtifacts("estate-advance-directive", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<AdvanceDirectiveInput>;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const estateWorkflows = {
  "estate/basic-will": basicWillWorkflow,
  "estate/power-of-attorney": powerOfAttorneyWorkflow,
  "estate/advance-directive": advanceDirectiveWorkflow,
} as const;
