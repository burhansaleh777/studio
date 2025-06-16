// src/config/insurance-rules.ts

export interface RateEntry {
  vehicleType: 'Motor Vehicles' | '2-Wheelers' | '3-Wheelers';
  usage: 'Private' | 'Commercial';
  coverageTypeRule: 'Comprehensive (Claim-Free)' | 'Comprehensive (With Claims)' | 'Third Party Fire & Theft (TPFT)' | 'Third Party Only (TPO)' | 'Comprehensive'; // 'Comprehensive' for 3-wheelers commercial
  premiumCalculation: string; // e.g., "3.5% of Insured Value" or "100,000"
  minPremium?: number; // Using number, can be undefined if not applicable
}

export interface ExcessRuleEntry {
  vehicleType: 'Motor Vehicles' | '2-Wheelers' | '3-Wheelers';
  standardExcess: string | number; // Allow "Not specified"
  totalTheftExcess: string | number; // Allow "Not specified"
}

export interface AddedBenefitEntry {
  benefitName: 'Loss of Use' | 'Excess Buy Back';
  coverage: string;
  rules: string;
}

export interface DocumentRequirementEntry {
  coverageTypeForDocs: 'Comprehensive' | 'Third Party (TPFT/TPO)'; // Renamed to avoid conflict
  mandatoryDocuments: string[];
}

export const PREMIUM_RATES: RateEntry[] = [
  // Motor Vehicles
  { vehicleType: 'Motor Vehicles', usage: 'Private', coverageTypeRule: 'Comprehensive (Claim-Free)', premiumCalculation: '3.5% of Insured Value', minPremium: 250000 },
  { vehicleType: 'Motor Vehicles', usage: 'Private', coverageTypeRule: 'Comprehensive (With Claims)', premiumCalculation: '4.0% of Insured Value', minPremium: 250000 },
  { vehicleType: 'Motor Vehicles', usage: 'Private', coverageTypeRule: 'Third Party Fire & Theft (TPFT)', premiumCalculation: '2% of Insured Value + 100,000' },
  { vehicleType: 'Motor Vehicles', usage: 'Private', coverageTypeRule: 'Third Party Only (TPO)', premiumCalculation: '100,000' },
  // 2-Wheelers
  { vehicleType: '2-Wheelers', usage: 'Private', coverageTypeRule: 'Comprehensive (Claim-Free)', premiumCalculation: '5.0% of Insured Value', minPremium: 125000 },
  { vehicleType: '2-Wheelers', usage: 'Private', coverageTypeRule: 'Comprehensive (With Claims)', premiumCalculation: '6.0% of Insured Value', minPremium: 125000 },
  { vehicleType: '2-Wheelers', usage: 'Commercial', coverageTypeRule: 'Comprehensive (Claim-Free)', premiumCalculation: '5.0% of Insured Value + 15,000', minPremium: 125000 },
  { vehicleType: '2-Wheelers', usage: 'Commercial', coverageTypeRule: 'Comprehensive (With Claims)', premiumCalculation: '6.0% of Insured Value + 15,000', minPremium: 125000 },
  { vehicleType: '2-Wheelers', usage: 'Private', coverageTypeRule: 'Third Party Fire & Theft (TPFT)', premiumCalculation: '3.5% of Insured Value + 100,000' },
  { vehicleType: '2-Wheelers', usage: 'Private', coverageTypeRule: 'Third Party Only (TPO)', premiumCalculation: '50,000' },
  { vehicleType: '2-Wheelers', usage: 'Commercial', coverageTypeRule: 'Third Party Only (TPO)', premiumCalculation: '65,000' },
  // 3-Wheelers
  { vehicleType: '3-Wheelers', usage: 'Private', coverageTypeRule: 'Comprehensive (Claim-Free)', premiumCalculation: '6.0% of Insured Value', minPremium: 125000 },
  { vehicleType: '3-Wheelers', usage: 'Private', coverageTypeRule: 'Comprehensive (With Claims)', premiumCalculation: '7.0% of Insured Value', minPremium: 125000 },
  { vehicleType: '3-Wheelers', usage: 'Commercial', coverageTypeRule: 'Comprehensive', premiumCalculation: 'Private Rate + 45,000' },
  { vehicleType: '3-Wheelers', usage: 'Private', coverageTypeRule: 'Third Party Only (TPO)', premiumCalculation: '75,000' },
  { vehicleType: '3-Wheelers', usage: 'Commercial', coverageTypeRule: 'Third Party Only (TPO)', premiumCalculation: '75,000 + 45,000' },
];

export const EXCESS_RULES: ExcessRuleEntry[] = [
  { vehicleType: 'Motor Vehicles', standardExcess: 350000, totalTheftExcess: 700000 },
  { vehicleType: '3-Wheelers', standardExcess: 100000, totalTheftExcess: 200000 },
  { vehicleType: '2-Wheelers', standardExcess: 'Not specified', totalTheftExcess: 'Not specified' },
];

export const ADDED_BENEFITS: AddedBenefitEntry[] = [
  { benefitName: 'Loss of Use', coverage: '50,000 TZS', rules: 'Must be claimed within 21 days of incident' },
  { benefitName: 'Excess Buy Back', coverage: 'Reduces standard excess to zero', rules: 'Cost = 10% of base premium (excl. VAT). Does not apply to Total Theft Excess.' },
];

export const DOCUMENT_REQUIREMENTS: DocumentRequirementEntry[] = [
  { coverageTypeForDocs: 'Comprehensive', mandatoryDocuments: ['Vehicle Registration Card', "Driver's License", 'Vehicle Photos (Front/Back/Left/Right)'] },
  { coverageTypeForDocs: 'Third Party (TPFT/TPO)', mandatoryDocuments: ['Vehicle Registration Card', "Driver's License"] },
];

export const KEY_BUSINESS_RULES: string[] = [
  "Always apply minimum premium if calculated premium is lower than the minimum premium for that category.",
  "Commercial surcharges for 2-Wheelers (Comprehensive coverage types): Add 15,000 TZS to the calculated premium after percentage calculation but before minimum premium check.",
  "Commercial surcharges for 3-Wheelers (All Comprehensive Coverages): Add 45,000 TZS to the private rate for the same coverage. For TPO, the 45,000 TZS is often already included in its 'premiumCalculation' string; if 'Private Rate + 45,000' is specified, calculate the private rate for the coverage and then add 45,000 TZS.",
  "Claim History Impact: 'Comprehensive (With Claims)' rates are inherently 0.5% to 1.0% higher than 'Comprehensive (Claim-Free)' rates as per the PREMIUM_RATES table. Use 'Comprehensive (Claim-Free)' rate if user indicates no recent claims, and 'Comprehensive (With Claims)' if they do for comprehensive coverage requests.",
  "Total theft claims trigger double the standard excess for the vehicle type. If standard excess is 'Not specified', this rule doesn't apply.",
  "Loss of Use benefit must be claimed within 21 days of the incident.",
  "Excess Buy Back cost is 10% of the base premium (excluding VAT) and reduces standard excess to zero. It does not affect Total Theft Excess.",
  "TPFT and TPO coverage types require simpler documentation as listed.",
  "When 'Private Rate + X' is mentioned for commercial vehicles, it means take the equivalent private usage rate for the same vehicle type and coverage, calculate it, and then add X TZS.",
  "All monetary values are in TZS unless otherwise specified.",
  "If a calculation like 'X% of Insured Value + Y' results in a value lower than a specified 'minPremium' for that category, the 'minPremium' should be quoted.",
  "For 'Third Party Fire & Theft (TPFT)', if '2% of Insured Value + 100,000' is the calculation, perform that calculation. There's no separate minimum premium listed for this specific TPFT, so the calculated value is the premium.",
];

export const getInsuranceKnowledgeBaseAsText = (): string => {
  let knowledgeBase = "## Bima Hub Insurance Product Information & Rules:\n\n";

  knowledgeBase += "**1. Premium Rates Table:**\n";
  PREMIUM_RATES.forEach(r => {
    knowledgeBase += `- Vehicle Type: ${r.vehicleType}, Usage: ${r.usage}, Coverage Rule Name: ${r.coverageTypeRule}, Premium Calculation: ${r.premiumCalculation}${r.minPremium ? ', Minimum Premium: '+r.minPremium+' TZS' : ''}\n`;
  });

  knowledgeBase += "\n**2. Excess (Deductible) Rules Table:**\n";
  EXCESS_RULES.forEach(r => {
    knowledgeBase += `- Vehicle Type: ${r.vehicleType}, Standard Excess: ${r.standardExcess}${typeof r.standardExcess === 'number' ? ' TZS' : ''}, Total Theft Excess: ${r.totalTheftExcess}${typeof r.totalTheftExcess === 'number' ? ' TZS' : ''}\n`;
  });

  knowledgeBase += "\n**3. Added Benefits Table:**\n";
  ADDED_BENEFITS.forEach(r => {
    knowledgeBase += `- Benefit Name: ${r.benefitName}, Coverage Details: ${r.coverage}, Specific Rules: ${r.rules}\n`;
  });

  knowledgeBase += "\n**4. Document Requirements Table:**\n";
  DOCUMENT_REQUIREMENTS.forEach(r => {
    knowledgeBase += `- For Coverage Type: ${r.coverageTypeForDocs}, Mandatory Documents: ${r.mandatoryDocuments.join(', ')}\n`;
  });

  knowledgeBase += "\n**5. Key Business Rules & Calculation Logic (Strictly Adhere to These):**\n";
  KEY_BUSINESS_RULES.forEach(rule => {
    knowledgeBase += `- ${rule}\n`;
  });

  return knowledgeBase;
};
