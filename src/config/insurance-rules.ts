
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

// NEW: Detailed information sections for FAQ chatbot
const CLAIM_PROCESS_INFO: string[] = [
  "To file a claim, use the step-by-step wizard in the BimaHub app. Here’s how it generally works:",
  "1. Select Your Vehicle: From the 'Claims' section, start a new claim and choose the insured vehicle that was involved in the incident.",
  "2. Provide Accident Details: You'll need to enter the date, time, and a specific location of the accident. Describe what happened in detail. The app also offers a voice-to-text feature to help you dictate the accident description easily.",
  "3. Upload Photos: The app will guide you to take and upload clear photos of the vehicle and incident. Typically, you'll be asked for photos of the full vehicle, close-ups of any damaged areas, the surrounding scene of the incident, and any other vehicles involved, if applicable. Generally, up to 4 photos are required to capture different perspectives.",
  "4. Add Supporting Documents (Optional): If you have any supporting documents, like a police report abstract or third-party information, you can upload them in this step.",
  "5. Review and Submit: Before submitting, you'll have a chance to review all the information and photos you've provided. Once you're satisfied, submit the claim.",
  "After submission, you'll receive a claim number for your records and for tracking the progress. Our claims team will then review your submission and get in touch with you regarding the next steps for assessment and processing."
];

const VEHICLE_POLICY_OVERVIEW_INFO: string[] = [
  "Bima Hub provides a range of vehicle insurance policies to suit different needs and budgets. The premium for each policy is determined by factors such as the type of vehicle (e.g., Motor Vehicle, 2-Wheeler, 3-Wheeler), its market value, how it's used (Private or Commercial), the type of coverage you select, and your claims history. You can get a personalized quote quickly using the 'Get Quote' feature in the app.",
  "Here's a general overview of our main coverage types:",
  "- Comprehensive (Claim-Free): This is our most extensive cover. It includes accidental damage to your own vehicle, damage or loss due to fire or theft, and liability for damages or injuries to third parties. The 'Claim-Free' rate is typically lower and applies if you have not made recent claims.",
  "- Comprehensive (With Claims): Offers the same broad protection as the Claim-Free Comprehensive policy but is priced for users who have a recent claims history, which usually results in a slightly higher premium.",
  "- Third Party, Fire & Theft (TPFT): This policy covers your liability to third parties for injury or property damage. Additionally, it covers your own vehicle against loss or damage caused by fire or theft.",
  "- Third Party Only (TPO): This is the basic legal minimum coverage required. It covers your legal liability for death or bodily injury to third parties, and damage to third-party property arising from the use of your vehicle.",
  "For specific premium calculations, minimum premiums, and how these apply to different vehicle types (Motor Vehicles, 2-Wheelers, 3-Wheelers) and usage (Private, Commercial), please refer to the 'Premium Rates Table' (Section 1 of our product information) or use the 'Get Quote' feature in the app."
];

const RENEWAL_PROCESS_INFO: string[] = [
  "Renewing your Bima Hub insurance policy is designed to be straightforward through our app:",
  "1. Renewal Reminder: We aim to send you a renewal notification via the app or email before your current policy is due to expire.",
  "2. Navigate to Policies: Log in to the app and go to the 'My Policies' section, typically found on your dashboard.",
  "3. Select Policy for Renewal: Identify the policy that is nearing its expiry date. There should be an option or button like 'Renew Policy' or 'Manage Policy' leading to renewal.",
  "4. Confirm Details: Review your current policy details, including your vehicle information and coverage level. At this stage, you might have the option to adjust your coverage if your needs have changed.",
  "5. Make Payment: Once you've confirmed the details, you'll be prompted to make the payment for the renewal premium. You can usually pay using Mobile Money (M-Pesa, Tigo Pesa, Airtel Money) or a Bank Card.",
  "6. Confirmation and New Documents: After a successful payment, your policy will be renewed. You will receive a confirmation, and your updated policy documents (like the new insurance certificate) will be made available in the app and/or sent to your registered email address.",
  "If you encounter any issues or have questions during the renewal process, our AI Support Chat is available 24/7, or you can request to be routed to a human agent for assistance."
];

const POLICY_DOCUMENTS_INFO: string[] = [
  "Accessing your Bima Hub insurance policy documents is easy and can be done directly through the app:",
  "- Via 'My Policies' on Dashboard: The primary way to find your documents is by navigating to your Dashboard after logging in. In the 'My Policies' section, you will see a list of your current and past policies. Select the relevant policy and tap on 'View Details' (or a similar option). This section should provide access to download or view your policy certificate, schedule, and other related documents.",
  "- Email Attachments: When you initially purchase a policy or successfully renew one, we typically send the core policy documents (like the certificate of insurance and policy wording) as PDF attachments to your registered email address. Please check your inbox (and spam/junk folder, just in case).",
  "If you are having trouble locating your policy documents or need a specific document, please use the AI Support Chat within the app. You can ask, 'Where can I find my policy documents?' or 'I need a copy of my insurance certificate,' and the AI will guide you or help escalate your request if needed."
];


export const getInsuranceKnowledgeBaseAsText = (): string => {
  let knowledgeBase = "## Bima Hub Insurance Product Information & Rules:\n\n";

  knowledgeBase += "**1. Premium Rates Table (for Quote Calculation and Information):**\n";
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

  knowledgeBase += "\n**4. Document Requirements for Policy Issuance:**\n";
  DOCUMENT_REQUIREMENTS.forEach(r => {
    knowledgeBase += `- For Coverage Type: ${r.coverageTypeForDocs}, Mandatory Documents: ${r.mandatoryDocuments.join(', ')}\n`;
  });

  knowledgeBase += "\n**5. Key Business Rules & Calculation Logic (Primarily for Quoting Engine):**\n";
  KEY_BUSINESS_RULES.forEach(rule => {
    knowledgeBase += `- ${rule}\n`;
  });

  // Append NEW SECTIONS for FAQ Chatbot
  knowledgeBase += "\n**6. How to File a Claim with BimaHub (Step-by-Step Guide from the App):**\n";
  CLAIM_PROCESS_INFO.forEach(item => {
    knowledgeBase += `- ${item}\n`;
  });

  knowledgeBase += "\n**7. Understanding Your BimaHub Vehicle Insurance Policy Options:**\n";
  VEHICLE_POLICY_OVERVIEW_INFO.forEach(item => {
    knowledgeBase += `- ${item}\n`;
  });

  knowledgeBase += "\n**8. How to Renew Your BimaHub Insurance Policy:**\n";
  RENEWAL_PROCESS_INFO.forEach(item => {
    knowledgeBase += `- ${item}\n`;
  });

  knowledgeBase += "\n**9. Accessing Your Policy Documents in the BimaHub App:**\n";
  POLICY_DOCUMENTS_INFO.forEach(item => {
    knowledgeBase += `- ${item}\n`;
  });

  return knowledgeBase;
};

    