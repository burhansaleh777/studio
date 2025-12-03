
'use server';
/**
 * @fileOverview Generates an insurance quote based on user-provided details and defined business rules.
 *
 * - generateQuote - A function that generates an insurance quote.
 * - GenerateQuoteInput - The input type for the generateQuote function.
 * - GenerateQuoteOutput - The return type for the generateQuote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PREMIUM_RATES, type RateEntry, getInsuranceKnowledgeBaseAsText } from '@/config/insurance-rules';

const GenerateQuoteInputSchema = z.object({
  vehicleType: z.string().describe('Type of vehicle (e.g., Motor Vehicles, 2-Wheelers, 3-Wheelers).'),
  vehicleMake: z.string().describe('Manufacturer of the vehicle (e.g., Toyota, Honda).'),
  vehicleModel: z.string().describe('Model of the vehicle (e.g., Corolla, IST).'),
  vehicleYear: z.number().describe('Year of manufacture of the vehicle.'),
  vehicleValue: z.number().describe('Estimated current market value of the vehicle in TZS.'),
  coverageType: z.string().describe('Desired base type of insurance coverage (e.g., Comprehensive, Third Party Only, Third Party Fire & Theft).'),
  hasPriorClaims: z.boolean().describe('Does the user have prior claims that would typically lead to a higher premium for comprehensive coverage?'),
  vehicleUsage: z.string().default('Private').describe("Usage of the vehicle, defaults to Private. Can be 'Private' or 'Commercial'. This affects premium rates.")
});
export type GenerateQuoteInput = z.infer<typeof GenerateQuoteInputSchema>;

const GenerateQuoteOutputSchema = z.object({
  quoteDetails: z.string().describe('A summary of the generated quote, chosen coverage (e.g. "Comprehensive (Claim-Free)"), and key details like vehicle type and value.'),
  premiumAmount: z.number().describe('The calculated premium amount in TZS. Returns -1 if cover is not available.'),
  currency: z.string().default('TZS').describe('The currency of the premium amount.'),
  quoteId: z.string().describe('A unique identifier for this quote.'),
  effectiveCoverageRule: z.string().describe('The specific coverage rule name from the knowledge base that was applied (e.g., "Comprehensive (Claim-Free)", "Third Party Only (TPO)").')
});
export type GenerateQuoteOutput = z.infer<typeof GenerateQuoteOutputSchema>;


function determineEffectiveCoverageRule(input: GenerateQuoteInput): RateEntry['coverageTypeRule'] {
  if (input.coverageType === "Comprehensive") {
    // For 3-Wheelers, Commercial, there's a specific "Comprehensive" rule.
    if (input.vehicleType === "3-Wheelers" && input.vehicleUsage === "Commercial") {
      return "Comprehensive";
    }
    return input.hasPriorClaims ? "Comprehensive (With Claims)" : "Comprehensive (Claim-Free)";
  }
  if (input.coverageType === "Third Party Only") return "Third Party Only (TPO)";
  if (input.coverageType === "Third Party Fire & Theft") return "Third Party Fire & Theft (TPFT)";
  // Fallback, though input validation should prevent this.
  return input.coverageType as RateEntry['coverageTypeRule'];
}

function parsePremiumCalculation(
  calcString: string,
  insuredValue: number,
  vehicleType: GenerateQuoteInput['vehicleType'],
  baseCoverageRule: RateEntry['coverageTypeRule'] // For "Private Rate + X"
): number | { error: string } {
  
  calcString = calcString.trim();

  // Handle "Private Rate + X"
  if (calcString.toLowerCase().startsWith("private rate + ")) {
    const addition = parseFloat(calcString.toLowerCase().replace("private rate + ", "").replace(/,/g, ''));
    if (isNaN(addition)) return { error: "Invalid addition in 'Private Rate + X'" };

    const privateRateEntry = PREMIUM_RATES.find(r =>
      r.vehicleType === vehicleType &&
      r.usage === 'Private' &&
      r.coverageTypeRule === baseCoverageRule // Use the base comprehensive rule
    );
    if (!privateRateEntry) return { error: `Private rate for ${vehicleType} ${baseCoverageRule} not found for 'Private Rate + X' calculation.` };

    const privatePremium = parsePremiumCalculation(privateRateEntry.premiumCalculation, insuredValue, vehicleType, baseCoverageRule);
    if (typeof privatePremium === 'object' && privatePremium.error) return privatePremium;
    
    let finalCommercialPremium = (privatePremium as number) + addition;
    // Apply min premium of the private rate IF the private rate itself had one, then sum. This might need clarification in business rules.
    // For now, we sum then apply the commercial rate's min premium if any.
    // Or if the commercial rule has its own min premium defined, that one takes precedence after sum.
    return finalCommercialPremium;
  }

  const parts = calcString.split('+').map(p => p.trim());
  let totalPremium = 0;

  for (const part of parts) {
    if (part.includes('% of Insured Value')) {
      const percentage = parseFloat(part.replace('% of Insured Value', '').trim());
      if (isNaN(percentage)) return { error: `Invalid percentage in calculation part: ${part}` };
      totalPremium += (percentage / 100) * insuredValue;
    } else {
      const fixedAmount = parseFloat(part.replace(/,/g, ''));
      if (isNaN(fixedAmount)) return { error: `Invalid fixed amount in calculation part: ${part}` };
      totalPremium += fixedAmount;
    }
  }
  return totalPremium;
}


function calculatePremiumLogic(input: GenerateQuoteInput): { premiumAmount: number; effectiveCoverageRuleName: string; error?: string } {
  const effectiveRuleName = determineEffectiveCoverageRule(input);

  const rateEntry = PREMIUM_RATES.find(r =>
    r.vehicleType === input.vehicleType &&
    r.usage === input.vehicleUsage &&
    r.coverageTypeRule === effectiveRuleName
  );

  if (!rateEntry) {
    return { premiumAmount: -1, effectiveCoverageRuleName: effectiveRuleName, error: `No matching rate found for ${input.vehicleType}, ${input.vehicleUsage}, ${effectiveRuleName}` };
  }

  let calculatedPremiumOrError = parsePremiumCalculation(
    rateEntry.premiumCalculation,
    input.vehicleValue,
    input.vehicleType,
    // For "Private Rate + X", we need the corresponding private comprehensive rule (claim-free or with claims)
    // This assumes 'Comprehensive' for commercial 3-wheelers maps to either claim-free or with claims for its private rate.
    // For simplicity, let's assume 'Comprehensive (Claim-Free)' as base if not specified, or derive from hasPriorClaims.
    input.hasPriorClaims ? "Comprehensive (With Claims)" : "Comprehensive (Claim-Free)"
  );


  if (typeof calculatedPremiumOrError === 'object' && calculatedPremiumOrError.error) {
    return { premiumAmount: -1, effectiveCoverageRuleName: effectiveRuleName, error: calculatedPremiumOrError.error };
  }
  
  let calculatedPremium = calculatedPremiumOrError as number;

  // Apply minimum premium
  if (rateEntry.minPremium && calculatedPremium < rateEntry.minPremium) {
    calculatedPremium = rateEntry.minPremium;
  }

  return { premiumAmount: Math.round(calculatedPremium), effectiveCoverageRuleName: rateEntry.coverageTypeRule };
}

export async function generateQuote(input: GenerateQuoteInput): Promise<GenerateQuoteOutput> {
  const calculationResult = calculatePremiumLogic(input);

  if (calculationResult.error || calculationResult.premiumAmount === -1) {
    const quoteId = `BIMAHUB-Q-ERR-${Date.now()}`;
    return {
      quoteDetails: calculationResult.error || "The specific cover is not available for the selected options.",
      premiumAmount: -1,
      currency: 'TZS',
      quoteId: quoteId,
      effectiveCoverageRule: calculationResult.effectiveCoverageRuleName || input.coverageType,
    };
  }

  const { premiumAmount, effectiveCoverageRuleName } = calculationResult;
  const quoteId = `BIMAHUB-Q-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  const insuranceKnowledgeBaseForLLM = getInsuranceKnowledgeBaseAsText(); // To provide context if needed for summary

  const llmInput = {
    ...input,
    premiumAmount, // Pass the calculated premium
    effectiveCoverageRule: effectiveCoverageRuleName, // Pass the determined rule
    insuranceKnowledgeBase: insuranceKnowledgeBaseForLLM, 
  };

  const prompt = ai.definePrompt({
    name: 'generateQuoteSummaryPrompt',
    input: { schema: z.any() }, // Use z.any() or a more specific schema for LLM input
    output: { schema: z.object({ 
        quoteDetails: z.string(), 
        // LLM might re-iterate these, but we'll use our calculated ones primarily
        llmPremiumAmount: z.number().optional(), 
        llmQuoteId: z.string().optional() 
    }) },
    prompt: `You are an insurance assistant for Bima Hub in Tanzania.
Your task is to generate a concise and friendly quote summary.
You have been provided with the user's input and the already calculated premium and effective coverage rule.

User Input:
- Vehicle Type: {{vehicleType}}
- Vehicle Make: {{vehicleMake}}
- Vehicle Model: {{vehicleModel}}
- Vehicle Year: {{vehicleYear}}
- Vehicle Value (TZS): {{vehicleValue}}
- Desired Base Coverage Type: {{coverageType}}
- Has Prior Claims: {{hasPriorClaims}}
- Vehicle Usage: {{vehicleUsage}}

Calculated Insurance Quote Results:
- Effective Coverage Rule Applied by Bima Hub System: "{{effectiveCoverageRule}}"
- Calculated Premium Amount by Bima Hub System: {{premiumAmount}} TZS

Based on ALL this information, generate a 'quoteDetails' string. This string should be a brief summary for the user, confirming the vehicle, the type of cover they are getting (use the "Effective Coverage Rule Applied"), and the premium.
Example: "Your quote for the Toyota Corolla (Value: TZS {{vehicleValue}}) with {{effectiveCoverageRule}} cover is TZS {{premiumAmount}}."
Do NOT perform any calculations yourself. Use the provided "Calculated Premium Amount" and "Effective Coverage Rule Applied".

Bima Hub Insurance Product Information & Rules (for context, if needed for phrasing the summary):
{{{insuranceKnowledgeBase}}}

Output ONLY the JSON object with 'quoteDetails'.
`,
  });

  const {output: llmOutput} = await prompt(llmInput);

  if (!llmOutput || !llmOutput.quoteDetails) {
    // Fallback if LLM fails to produce structured output for summary
    return {
        quoteDetails: `Quote for ${input.vehicleMake} ${input.vehicleModel}. Coverage: ${effectiveCoverageRuleName}. Premium: ${premiumAmount} TZS.`,
        premiumAmount,
        currency: 'TZS',
        quoteId,
        effectiveCoverageRule: effectiveCoverageRuleName,
    };
  }
  
  return {
    quoteDetails: llmOutput.quoteDetails,
    premiumAmount, // Use TypeScript calculated premium
    currency: 'TZS',
    quoteId, // Use system generated quoteId
    effectiveCoverageRule: effectiveCoverageRuleName, // Use TypeScript determined rule
  };
}
const generateQuoteFlow = ai.defineFlow(
  {
    name: 'generateQuoteFlow',
    inputSchema: GenerateQuoteInputSchema,
    outputSchema: GenerateQuoteOutputSchema,
  },
  generateQuote // The exported generateQuote function now directly serves as the flow's implementation
);

    