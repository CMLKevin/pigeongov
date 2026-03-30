import type { GlossaryEntry } from "../../types.js";

export const immigrationGlossaryEntries: GlossaryEntry[] = [
  {
    term: "Petitioner",
    domain: "immigration",
    definition:
      "The U.S. citizen or lawful permanent resident who files an immigration petition on behalf of a foreign national family member or employee.",
    source: "USCIS",
    relatedTerms: ["beneficiary", "I-130"],
  },
  {
    term: "Beneficiary",
    domain: "immigration",
    definition:
      "The foreign national for whom an immigration petition is filed. The beneficiary is the person who will receive the immigration benefit (e.g., a green card).",
    source: "USCIS",
    relatedTerms: ["petitioner", "adjustment of status"],
  },
  {
    term: "Adjustment of Status",
    abbreviation: "AOS",
    domain: "immigration",
    definition:
      "The process of applying for lawful permanent resident status (a green card) while physically present in the United States, using Form I-485.",
    source: "USCIS",
    relatedTerms: ["consular processing", "I-485", "green card"],
  },
  {
    term: "Consular Processing",
    domain: "immigration",
    definition:
      "The process of obtaining an immigrant visa through a U.S. embassy or consulate abroad, as an alternative to adjustment of status within the U.S.",
    source: "USCIS",
    relatedTerms: ["adjustment of status", "visa bulletin"],
  },
  {
    term: "I-130",
    domain: "immigration",
    definition:
      "Petition for Alien Relative — the form a U.S. citizen or LPR files to establish a qualifying family relationship with a foreign national, the first step in family-based immigration.",
    source: "USCIS",
    relatedTerms: ["petitioner", "beneficiary", "priority date"],
  },
  {
    term: "I-485",
    domain: "immigration",
    definition:
      "Application to Register Permanent Residence or Adjust Status — the form used to apply for a green card from within the United States.",
    source: "USCIS",
    relatedTerms: ["adjustment of status", "I-130", "EAD"],
  },
  {
    term: "Priority Date",
    domain: "immigration",
    definition:
      "The date that establishes your place in the immigration queue. For family-based cases, it is typically the date USCIS receives the I-130 petition. Your visa becomes available when the visa bulletin shows your priority date is current.",
    source: "USCIS",
    relatedTerms: ["visa bulletin", "I-130"],
  },
  {
    term: "Visa Bulletin",
    domain: "immigration",
    definition:
      "A monthly publication by the Department of State showing which priority dates are currently eligible to file or be approved for immigrant visas in each preference category and country.",
    source: "Department of State",
    relatedTerms: ["priority date", "consular processing"],
  },
  {
    term: "Affidavit of Support",
    domain: "immigration",
    definition:
      "Form I-864, a legally enforceable contract in which the petitioner/sponsor agrees to financially support the immigrant at 125% of the federal poverty level. Required for most family-based green card applications.",
    source: "USCIS",
    relatedTerms: ["petitioner", "I-485"],
  },
  {
    term: "Biometrics",
    domain: "immigration",
    definition:
      "The process of collecting fingerprints, photographs, and a digital signature at a USCIS Application Support Center. Required for background checks as part of most immigration applications.",
    source: "USCIS",
    relatedTerms: ["I-485", "USCIS"],
  },
  {
    term: "Employment Authorization Document",
    abbreviation: "EAD",
    domain: "immigration",
    definition:
      "A card (Form I-766) that proves you are authorized to work in the United States. Often issued while an adjustment of status application is pending.",
    source: "USCIS",
    relatedTerms: ["adjustment of status", "advance parole", "I-485"],
  },
  {
    term: "Advance Parole",
    abbreviation: "AP",
    domain: "immigration",
    definition:
      "A travel document that allows a person with a pending adjustment of status to travel outside the U.S. and return without abandoning their application.",
    source: "USCIS",
    relatedTerms: ["EAD", "adjustment of status"],
  },
  {
    term: "Green Card",
    domain: "immigration",
    definition:
      "Common name for a Permanent Resident Card (Form I-551). It proves that the holder is authorized to live and work in the United States permanently.",
    source: "USCIS",
    relatedTerms: ["adjustment of status", "naturalization"],
  },
  {
    term: "Naturalization",
    domain: "immigration",
    definition:
      "The process by which a lawful permanent resident becomes a U.S. citizen, typically requiring five years of continuous residence (three if married to a U.S. citizen), passing a civics and English test, and taking the Oath of Allegiance.",
    source: "USCIS",
    relatedTerms: ["green card", "USCIS"],
  },
  {
    term: "U.S. Citizenship and Immigration Services",
    abbreviation: "USCIS",
    domain: "immigration",
    definition:
      "The federal agency within the Department of Homeland Security that administers the immigration and naturalization system, processes petitions, and conducts interviews.",
    source: "USCIS",
    relatedTerms: ["I-130", "I-485", "naturalization"],
  },
];
