import { readFile, writeFile } from "node:fs/promises";

import type { HouseholdProfile, PersonRecord } from "../types.js";
import { getProfilePath, ensureDir, PIGEONGOV_HOME } from "./paths.js";

/**
 * Load the household profile from disk.
 * Returns null if the file does not exist or is malformed.
 */
export async function loadProfile(): Promise<HouseholdProfile | null> {
  try {
    const raw = await readFile(getProfilePath(), "utf-8");
    return JSON.parse(raw) as HouseholdProfile;
  } catch {
    return null;
  }
}

/**
 * Write the household profile to disk.
 */
export async function saveProfile(profile: HouseholdProfile): Promise<void> {
  await ensureDir(PIGEONGOV_HOME);
  await writeFile(getProfilePath(), JSON.stringify(profile, null, 2), "utf-8");
}

/**
 * Deep merge identity fields from a household profile into starter data.
 *
 * Only merges fields that exist in both the profile and the starter data schema:
 * firstName, lastName, ssn, address (and address subfields).
 */
export function mergeProfileIntoStarterData(
  profile: HouseholdProfile,
  starterData: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(starterData);

  // Find the primary person (relationship: "self")
  const primary = profile.people.find((p) => p.relationship === "self") ?? profile.people[0];
  if (!primary) return result;

  // Merge top-level identity fields only if they exist in starter data
  const identityFields: Array<keyof PersonRecord> = ["firstName", "lastName", "ssn"];
  for (const field of identityFields) {
    if (field in result && primary[field] !== undefined) {
      result[field] = primary[field];
    }
  }

  // Merge address fields
  if ("address" in result && typeof result.address === "object" && result.address !== null) {
    const addrTarget = result.address as Record<string, unknown>;
    const addrSource = profile.address;

    const addressFields = ["street1", "street2", "city", "state", "zipCode"] as const;
    for (const field of addressFields) {
      if (field in addrTarget && addrSource[field] !== undefined) {
        addrTarget[field] = addrSource[field];
      }
    }
  } else if ("address" in result) {
    // starter data has address as a key but it's null/undefined — set the whole object
    result.address = structuredClone(profile.address);
  }

  return result;
}
