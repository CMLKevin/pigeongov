import { describeWorkflow, getWorkflowStarterData } from "../workflows/registry.js";

/**
 * Simple seeded PRNG (mulberry32).
 * Deterministic, fast, good enough for test data.
 */
function createPrng(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 0x100000000;
  };
}

const FIRST_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George",
  "Hannah", "Isaac", "Julia", "Kevin", "Laura", "Miguel", "Nina",
  "Oscar", "Priya", "Quinn", "Rosa", "Sam", "Tara",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
  "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
  "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
];

const STREETS = [
  "123 Main St", "456 Oak Ave", "789 Pine Rd", "321 Elm Blvd",
  "654 Maple Dr", "987 Cedar Ln", "111 Birch Way", "222 Willow Ct",
];

const CITIES = [
  "Springfield", "Portland", "Denver", "Austin", "Sacramento",
  "Phoenix", "Seattle", "Atlanta", "Miami", "Boston",
];

const STATES = [
  "CA", "NY", "TX", "FL", "WA", "OR", "CO", "IL", "PA", "GA",
];

const ZIP_CODES = [
  "90210", "10001", "73301", "33101", "98101",
  "97201", "80201", "60601", "19101", "30301",
];

const RELATIONSHIPS = ["self", "spouse", "child", "parent"];

function pickFrom<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function randomSsn(rand: () => number): string {
  const a = String(Math.floor(rand() * 900) + 100);
  const b = String(Math.floor(rand() * 90) + 10);
  const c = String(Math.floor(rand() * 9000) + 1000);
  return `${a}-${b}-${c}`;
}

function randomDate(rand: () => number, yearStart = 1960, yearEnd = 2005): string {
  const year = Math.floor(rand() * (yearEnd - yearStart)) + yearStart;
  const month = String(Math.floor(rand() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(rand() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function randomCurrency(rand: () => number, min = 0, max = 150000): number {
  return Math.round((rand() * (max - min) + min) * 100) / 100;
}

interface FieldDescriptor {
  name: string;
  kind: string;
  optional?: boolean;
  fields?: FieldDescriptor[];
  items?: FieldDescriptor;
}

/**
 * Recursively generate a value for a described field.
 */
function generateFieldValue(
  field: FieldDescriptor,
  rand: () => number,
): unknown {
  const { kind, name } = field;

  if (kind === "object" && field.fields) {
    const obj: Record<string, unknown> = {};
    for (const child of field.fields) {
      if (child.optional && rand() < 0.3) continue; // skip some optionals
      obj[child.name] = generateFieldValue(child, rand);
    }
    return obj;
  }

  if (kind === "array" && field.items) {
    const length = Math.floor(rand() * 3) + 1;
    return Array.from({ length }, () => generateFieldValue(field.items!, rand));
  }

  // Heuristic field generation based on name patterns
  const lowerName = name.toLowerCase();

  if (lowerName.includes("firstname") || lowerName === "name") {
    return pickFrom(FIRST_NAMES, rand);
  }
  if (lowerName.includes("lastname")) {
    return pickFrom(LAST_NAMES, rand);
  }
  if (lowerName.includes("ssn")) {
    return randomSsn(rand);
  }
  if (lowerName.includes("street")) {
    return pickFrom(STREETS, rand);
  }
  if (lowerName.includes("city")) {
    return pickFrom(CITIES, rand);
  }
  if (lowerName.includes("state")) {
    return pickFrom(STATES, rand);
  }
  if (lowerName.includes("zip")) {
    return pickFrom(ZIP_CODES, rand);
  }
  if (lowerName.includes("relationship")) {
    return pickFrom(RELATIONSHIPS, rand);
  }
  if (lowerName.includes("date") || lowerName.includes("dob")) {
    return randomDate(rand);
  }
  if (lowerName.includes("email")) {
    return `${pickFrom(FIRST_NAMES, rand).toLowerCase()}@example.com`;
  }
  if (lowerName.includes("phone")) {
    return `555-${String(Math.floor(rand() * 9000) + 1000)}`;
  }

  // Fall back to type-based generation
  switch (kind) {
    case "string":
      return `sample-${name}-${Math.floor(rand() * 1000)}`;
    case "number":
      if (
        lowerName.includes("wage") ||
        lowerName.includes("income") ||
        lowerName.includes("amount") ||
        lowerName.includes("tax") ||
        lowerName.includes("withh")
      ) {
        return randomCurrency(rand);
      }
      if (lowerName.includes("age")) {
        return Math.floor(rand() * 80) + 1;
      }
      return Math.floor(rand() * 10000);
    case "boolean":
      return rand() > 0.5;
    case "enum":
      // We don't have enum values from describeField, pick a default
      return "unknown";
    default:
      return `generated-${name}`;
  }
}

/**
 * Generate a random input object for the given workflow, using the
 * starter data as a base and overriding fields with random values.
 *
 * Falls back to purely random generation from the described schema
 * if starter data is not available.
 */
export function generateRandomInput(
  workflowId: string,
  seed: number,
): Record<string, unknown> {
  const rand = createPrng(seed);
  const description = describeWorkflow(workflowId);
  const starterData = getWorkflowStarterData(workflowId) as Record<string, unknown>;

  // Start from starter data, then overlay random values from the schema
  const result = structuredClone(starterData);

  for (const field of description.inputSchema as unknown as FieldDescriptor[]) {
    if (field.optional && rand() < 0.2) continue;
    result[field.name] = generateFieldValue(field, rand);
  }

  return result;
}

/**
 * Generate N random inputs for a workflow, each with a unique seed
 * derived from the base seed.
 */
export function generateRandomInputBatch(
  workflowId: string,
  count: number,
  baseSeed: number,
): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) =>
    generateRandomInput(workflowId, baseSeed + i),
  );
}
