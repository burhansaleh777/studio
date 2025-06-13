
'use server';
/**
 * @fileOverview Generates an insurance quote based on user-provided details.
 *
 * - generateQuote - A function that generates an insurance quote.
 * - GenerateQuoteInput - The input type for the generateQuote function.
 * - GenerateQuoteOutput - The return type for the generateQuote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuoteInputSchema = z.object({
  vehicleType: z.string().describe('Type of vehicle (e.g., Private Car, Motorcycle, Commercial Vehicle).'),
  vehicleMake: z.string().describe('Manufacturer of the vehicle (e.g., Toyota, Honda).'),
  vehicleModel: z.string().describe('Model of the vehicle (e.g., Corolla, IST).'),
  vehicleYear: z.number().describe('Year of manufacture of the vehicle.'),
  vehicleValue: z.number().describe('Estimated current market value of the vehicle in TZS.'),
  coverageType: z.string().describe('Desired type of insurance coverage (e.g., Comprehensive, Third Party Only).'),
  drivingExperience: z.number().describe('Main driver\'s years of driving experience.'),
  noClaimBonus: z.number().describe('Percentage of No Claim Bonus (NCB) applicable (0-100).'),
  additionalDrivers: z.enum(['none', 'one', 'two_plus']).describe('Number of additional drivers to be covered.'),
  driverAge: z.number().describe('Age of the main driver.'),
  driverLocation: z.string().describe('Primary location/region where the vehicle will be used (e.g., Dar es Salaam, Arusha).'),
});
export type GenerateQuoteInput = z.infer<typeof GenerateQuoteInputSchema>;

const GenerateQuoteOutputSchema = z.object({
  quoteDetails: z.string().describe('A summary of the generated quote and coverage details.'),
  premiumAmount: z.number().describe('The calculated premium amount in TZS.'),
  currency: z.string().default('TZS').describe('The currency of the premium amount.'),
  quoteId: z.string().describe('A unique identifier for this quote.'),
});
export type GenerateQuoteOutput = z.infer<typeof GenerateQuoteOutputSchema>;

export async function generateQuote(input: GenerateQuoteInput): Promise<GenerateQuoteOutput> {
  return generateQuoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuotePrompt',
  input: {schema: GenerateQuoteInputSchema},
  output: {schema: GenerateQuoteOutputSchema},
  prompt: `You are an insurance quoting assistant for Bima Hub in Tanzania.
Generate an insurance quote based on the following details. Provide a brief summary of the quote and a calculated premium.
The premium should be realistic for the Tanzanian market. For comprehensive, it's usually between 3% and 7% of vehicle value. For Third Party, it's a fixed amount, typically lower.

Vehicle Details:
- Type: {{vehicleType}}
- Make: {{vehicleMake}}
- Model: {{vehicleModel}}
- Year: {{vehicleYear}}
- Value (TZS): {{vehicleValue}}

Coverage Preferences:
- Type: {{coverageType}}
- Driving Experience (years): {{drivingExperience}}
- No Claim Bonus (%): {{noClaimBonus}}
- Additional Drivers: {{additionalDrivers}}

Driver Information:
- Age: {{driverAge}}
- Location: {{driverLocation}}

Calculate a premium. Provide a quote summary in 'quoteDetails'.
Generate a unique quoteId.
The currency should be TZS.
Ensure the output is in the specified JSON format.
If the vehicle type is Motorcycle or Commercial Vehicle and coverage is Comprehensive, be cautious with the premium, it might be higher.
If no claim bonus is high (e.g. > 30%), reduce the premium slightly. Young drivers (under 25) or very old drivers (over 70) might have higher premiums.
Locations like Dar es Salaam might have slightly higher premiums due to traffic density.
`,
});

const generateQuoteFlow = ai.defineFlow(
  {
    name: 'generateQuoteFlow',
    inputSchema: GenerateQuoteInputSchema,
    outputSchema: GenerateQuoteOutputSchema,
  },
  async (input) => {
    // Simulate a unique quote ID
    const quoteId = `BIMAHUB-Q-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const {output} = await prompt(input);

    // Ensure the output has the generated quoteId and default currency if not set by LLM
    return {
        ...output!,
        quoteId: output?.quoteId || quoteId, // Use LLM's quoteId if provided, else ours
        currency: output?.currency || 'TZS', // Default currency
    };
  }
);
