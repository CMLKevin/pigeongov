import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const rootDir = process.cwd();
const distSiteDir = path.join(rootDir, "dist", "site");
const siteSourceDir = path.join(rootDir, "site");
const cliPath = path.join(rootDir, "dist", "bin", "pigeongov.js");
const execFileAsync = promisify(execFile);

async function runMachine(args) {
  const { stdout } = await execFileAsync("node", [cliPath, "machine", ...args], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return JSON.parse(stdout);
}

const exampleInputs = {
  "tax/1040": {
    taxpayer: {
      firstName: "Kevin",
      lastName: "Lin",
      ssn: "123-45-6789",
      address: {
        street1: "1 Market St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
      },
    },
    dependents: [],
    filingStatus: "single",
    wages: 50000,
    taxableInterest: 0,
    ordinaryDividends: 0,
    scheduleCNet: 0,
    otherIncome: 0,
    adjustments: {
      educatorExpenses: 0,
      hsaDeduction: 0,
      selfEmploymentTaxDeduction: 0,
      iraDeduction: 0,
      studentLoanInterest: 0,
    },
    useItemizedDeductions: false,
    itemizedDeductions: 0,
    federalWithheld: 6200,
    estimatedPayments: 0,
  },
  "immigration/family-visa-intake": {
    applicant: {
      firstName: "Ana",
      lastName: "Rivera",
      ssn: "000-00-0000",
      address: {
        street1: "200 Mission St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
      },
    },
    beneficiary: {
      fullName: "Luis Rivera",
      relationship: "spouse",
      currentCountry: "Mexico",
      currentlyInUnitedStates: false,
    },
    household: [],
    visaGoal: "family",
    petitionerStatus: "uscitizen",
    hasPassportCopy: true,
    hasBirthCertificate: true,
    hasRelationshipEvidence: true,
    hasFinancialSponsor: true,
    priorVisaDenials: false,
    needsTranslation: true,
    workAuthorizationRequested: false,
  },
  "healthcare/aca-enrollment": {
    applicant: {
      firstName: "Mia",
      lastName: "Johnson",
      ssn: "000-00-0000",
      address: {
        street1: "500 W 2nd St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
      },
    },
    household: [{ name: "Leo Johnson", relationship: "child", age: 7 }],
    stateOfResidence: "TX",
    annualHouseholdIncome: 52000,
    currentlyInsured: false,
    qualifyingLifeEvent: true,
    hasEmployerCoverageOffer: false,
    needsDependentCoverage: true,
    immigrationDocumentsAvailable: true,
    incomeProofAvailable: true,
    residenceProofAvailable: true,
    preferredCoverageMonth: "May",
  },
  "unemployment/claim-intake": {
    applicant: {
      firstName: "Jordan",
      lastName: "Lee",
      ssn: "000-00-0000",
      address: {
        street1: "88 Pine St",
        city: "Seattle",
        state: "WA",
        zipCode: "98101",
      },
    },
    stateOfClaim: "WA",
    lastEmployerName: "Harbor Logistics",
    lastDayWorked: "2026-03-01",
    separationReason: "laid_off",
    wagesLast12Months: 68000,
    receivingSeverance: false,
    availableForWork: true,
    identityProofAvailable: true,
    wageProofAvailable: true,
    separationNoticeAvailable: true,
  },
};

await rm(distSiteDir, { recursive: true, force: true });
await mkdir(path.join(distSiteDir, "data", "examples"), { recursive: true });
await cp(siteSourceDir, distSiteDir, { recursive: true });

const workflowCatalog = await runMachine(["workflow-catalog"]);
const workflows = workflowCatalog.workflows;
const descriptors = await Promise.all(
  workflows.map((workflow) =>
    runMachine(["describe-workflow", "--workflow", workflow.id]),
  ),
);
const bundles = workflows
  .filter((workflow) => workflow.id in exampleInputs)
  .map(async (workflow) => {
    const input = exampleInputs[workflow.id];
    const inputPath = path.join(
      distSiteDir,
      "data",
      "examples",
      `${workflow.id.replace(/[^\w]+/g, "-")}-input.json`,
    );
    await writeFile(inputPath, JSON.stringify({ data: input }, null, 2));
    const rendered = await runMachine([
      "render-workflow",
      "--workflow",
      workflow.id,
      "--data",
      inputPath,
    ]);
    return {
      workflowId: workflow.id,
      input,
      bundle: rendered.bundle ?? rendered,
    };
  });
const resolvedBundles = await Promise.all(bundles);

await writeFile(
  path.join(distSiteDir, "data", "workflows.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      workflows,
      descriptors,
    },
    null,
    2,
  ),
);

for (const workflow of workflows) {
  const starterData = (await runMachine(["start-workflow", "--workflow", workflow.id])).starterData;
  await writeFile(
    path.join(distSiteDir, "data", "examples", `${workflow.id.replace(/[^\w]+/g, "-")}-starter.json`),
    JSON.stringify(starterData, null, 2),
  );
}

for (const bundle of resolvedBundles) {
  await writeFile(
    path.join(
      distSiteDir,
      "data",
      "examples",
      `${bundle.workflowId.replace(/[^\w]+/g, "-")}-bundle.json`,
    ),
    JSON.stringify(bundle.bundle, null, 2),
  );
}
