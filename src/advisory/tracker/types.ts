export interface ProcessingTimeEstimate {
  formType: string;
  formTitle: string;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  lastUpdated: string;
}

/**
 * Offline processing time estimates for common USCIS forms.
 * Values are in months. Sources: USCIS processing time data, updated periodically.
 */
export const PROCESSING_TIMES: ProcessingTimeEstimate[] = [
  {
    formType: "I-130",
    formTitle: "Petition for Alien Relative",
    percentile50: 12,
    percentile75: 18,
    percentile90: 24,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-485",
    formTitle: "Application to Register Permanent Residence (Adjustment of Status)",
    percentile50: 8,
    percentile75: 14,
    percentile90: 20,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-765",
    formTitle: "Application for Employment Authorization",
    percentile50: 3,
    percentile75: 5,
    percentile90: 7,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "N-400",
    formTitle: "Application for Naturalization",
    percentile50: 7,
    percentile75: 11,
    percentile90: 15,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-90",
    formTitle: "Application to Replace Permanent Resident Card",
    percentile50: 6,
    percentile75: 10,
    percentile90: 14,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-751",
    formTitle: "Petition to Remove Conditions on Residence",
    percentile50: 12,
    percentile75: 18,
    percentile90: 24,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-140",
    formTitle: "Immigrant Petition for Alien Workers",
    percentile50: 6,
    percentile75: 10,
    percentile90: 16,
    lastUpdated: "2025-12-01",
  },
  {
    formType: "I-129",
    formTitle: "Petition for Nonimmigrant Worker",
    percentile50: 3,
    percentile75: 5,
    percentile90: 8,
    lastUpdated: "2025-12-01",
  },
];

/**
 * Look up offline processing time estimates for a given form type.
 * Returns null if the form type is not in the database.
 */
export function getProcessingTime(formType: string): ProcessingTimeEstimate | null {
  const normalized = formType.toUpperCase().trim();
  return PROCESSING_TIMES.find((pt) => pt.formType === normalized) ?? null;
}
