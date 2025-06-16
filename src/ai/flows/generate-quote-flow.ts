
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
import { getInsuranceKnowledgeBaseAsText, PREMIUM_RATES } from '@/config/insurance-rules'; // Import new knowledge base

const GenerateQuoteInputSchema = z.object({
  vehicleType: z.string().describe('Type of vehicle (e.g., Motor Vehicles, 2-Wheelers, 3-Wheelers).'),
  vehicleMake: z.string().describe('Manufacturer of the vehicle (e.g., Toyota, Honda).'),
  vehicleModel: z.string().describe('Model of the vehicle (e.g., Corolla, IST).'),
  vehicleYear: z.number().describe('Year of manufacture of the vehicle.'),
  vehicleValue: z.number().describe('Estimated current market value of the vehicle in TZS.'),
  coverageType: z.string().describe('Desired base type of insurance coverage (e.g., Comprehensive, Third Party Only, Third Party Fire & Theft). The AI will map this to a specific rule like "Comprehensive (Claim-Free)" or "Comprehensive (With Claims)" based on hasPriorClaims field.'),
  hasPriorClaims: z.boolean().describe('Does the user have prior claims that would typically lead to a higher premium for comprehensive coverage? If true and coverageType is "Comprehensive", use "Comprehensive (With Claims)" rules. Otherwise, use "Comprehensive (Claim-Free)" for "Comprehensive" requests.'),
  vehicleUsage: z.string().default('Private').describe("Usage of the vehicle, defaults to Private. Can be 'Private' or 'Commercial'. This affects premium rates.")
});
export type GenerateQuoteInput = z.infer<typeof GenerateQuoteInputSchema>;

const GenerateQuoteOutputSchema = z.object({
  quoteDetails: z.string().describe('A summary of the generated quote, chosen coverage (e.g. "Comprehensive (Claim-Free)"), and key details like vehicle type and value.'),
  premiumAmount: z.number().describe('The calculated premium amount in TZS.'),
  currency: z.string().default('TZS').describe('The currency of the premium amount.'),
  quoteId: z.string().describe('A unique identifier for this quote.'),
  effectiveCoverageRule: z.string().describe('The specific coverage rule name from the knowledge base that was applied (e.g., "Comprehensive (Claim-Free)", "Third Party Only (TPO)").')
});
export type GenerateQuoteOutput = z.infer<typeof GenerateQuoteOutputSchema>;

export async function generateQuote(input: GenerateQuoteInput): Promise<GenerateQuoteOutput> {
  return generateQuoteFlow(input);
}

const insuranceKnowledgeBase = getInsuranceKnowledgeBaseAsText();

const prompt = ai.definePrompt({
  name: 'generateQuotePrompt',
  input: {schema: GenerateQuoteInputSchema},
  output: {schema: GenerateQuoteOutputSchema},
  prompt: `You are an insurance quoting engine for Bima Hub in Tanzania.
Your ONLY task is to calculate an insurance premium and provide quote details based STRICTLY on the user's input and the Bima Hub Insurance Product Information & Rules provided below.
Do NOT use any external knowledge or make assumptions beyond these rules.

User Input:
- Vehicle Type: {{vehicleType}}
- Vehicle Make: {{vehicleMake}}
- Vehicle Model: {{vehicleModel}}
- Vehicle Year: {{vehicleYear}}
- Vehicle Value (TZS): {{vehicleValue}}
- Desired Base Coverage Type: {{coverageType}}
- Has Prior Claims: {{hasPriorClaims}}
- Vehicle Usage: {{vehicleUsage}}

Bima Hub Insurance Product Information & Rules:
{{{insuranceKnowledgeBase}}}

Instructions for Quoting:
1.  Determine the 'Effective Coverage Rule' from the "Premium Rates Table" based on the user's 'Desired Base Coverage Type', 'Vehicle Usage', and 'Has Prior Claims' status.
    - If 'Desired Base Coverage Type' is "Comprehensive":
        - If 'Has Prior Claims' is true, the 'Effective Coverage Rule' is "Comprehensive (With Claims)".
        - If 'Has Prior Claims' is false, the 'Effective Coverage Rule' is "Comprehensive (Claim-Free)".
    - If 'Desired Base Coverage Type' is "Third Party Only", the 'Effective Coverage Rule' is "Third Party Only (TPO)".
    - If 'Desired Base Coverage Type' is "Third Party Fire & Theft", the 'Effective Coverage Rule' is "Third Party Fire & Theft (TPFT)".
    - Ensure the selected 'Effective Coverage Rule' exists in the "Premium Rates Table" for the given 'Vehicle Type' and 'Vehicle Usage'. If not, state that the combination is not available.
2.  Find the matching entry in the "Premium Rates Table" using the 'Vehicle Type', 'Vehicle Usage', and the determined 'Effective Coverage Rule'.
3.  Use the 'Premium Calculation' string from the table to calculate the base premium.
    - If it's a percentage (e.g., "X% of Insured Value"), calculate X% of {{vehicleValue}}.
    - If it contains "+ Y" (e.g., "X% of Insured Value + Y" or "FixedAmount + Y"), perform the addition after the initial calculation.
    - If it's a fixed number (e.g., "100,000"), that's the base premium.
    - For commercial 3-wheelers with "Private Rate + 45,000", first find the private rate for the same vehicle type and coverage, calculate it, then add 45,000.
4.  Apply Surcharges (from "Key Business Rules"):
    - For 2-Wheelers (Commercial, Comprehensive types): Add 15,000 TZS to the premium calculated in step 3.
    - For 3-Wheelers (Commercial, Comprehensive types if using 'Private Rate + X' logic): The 45,000 TZS is part of the rule, ensure it's applied. For Commercial TPO, the rule is '75,000 + 45,000', so it's already included.
5.  Check Minimum Premium: If the "Premium Rates Table" entry has a 'Minimum Premium' and your calculated premium (after surcharges) is less than this, the premium becomes the 'Minimum Premium'.
6.  The final premium is the 'premiumAmount'.
7.  For 'quoteDetails', provide a brief summary including the Vehicle Make, Model, Value, the 'Effective Coverage Rule' you applied, and the calculated premium.
8.  Generate a unique 'quoteId' (e.g., BIMAHUB-Q-<timestamp>-<random>).
9.  The 'currency' is 'TZS'.
10. Set 'effectiveCoverageRule' to the specific rule name you used from the table (e.g., "Comprehensive (Claim-Free)").

Output ONLY the JSON object in the specified format. Do not add any conversational text or explanations outside the JSON structure.
If a specific combination of vehicle type, usage, and coverage is not found in the rates table, the premiumAmount should be -1 and quoteDetails should explain that the specific cover is not available for the selected options.
`,
});

const generateQuoteFlow = ai.defineFlow(
  {
    name: 'generateQuoteFlow',
    inputSchema: GenerateQuoteInputSchema,
    outputSchema: GenerateQuoteOutputSchema,
  },
  async (input) => {
    const quoteId = `BIMAHUB-Q-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const llmInput = {
        ...input,
        insuranceKnowledgeBase: insuranceKnowledgeBase, // Pass the stringified knowledge base
    };

    const {output} = await prompt(llmInput);

    if (!output) {
        // Fallback if LLM fails to produce structured output
        throw new Error("AI failed to generate a quote. Please try again.");
    }
    
    // Ensure the output has the generated quoteId and default currency if not set by LLM
    return {
        ...output,
        quoteId: output.quoteId || quoteId,
        currency: output.currency || 'TZS',
    };
  }
);
