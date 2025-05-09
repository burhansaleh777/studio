// InsuranceFAQChatbot
'use server';

/**
 * @fileOverview An insurance FAQ chatbot flow.
 *
 * - insuranceFAQChatbot - A function that handles the chatbot interactions.
 * - InsuranceFAQChatbotInput - The input type for the insuranceFAQChatbot function.
 * - InsuranceFAQChatbotOutput - The return type for the insuranceFAQChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InsuranceFAQChatbotInputSchema = z.object({
  question: z.string().describe('The user question about their insurance policy.'),
});
export type InsuranceFAQChatbotInput = z.infer<typeof InsuranceFAQChatbotInputSchema>;

const InsuranceFAQChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot answer to the user question.'),
});
export type InsuranceFAQChatbotOutput = z.infer<typeof InsuranceFAQChatbotOutputSchema>;

export async function insuranceFAQChatbot(input: InsuranceFAQChatbotInput): Promise<InsuranceFAQChatbotOutput> {
  return insuranceFAQChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'insuranceFAQChatbotPrompt',
  input: {schema: InsuranceFAQChatbotInputSchema},
  output: {schema: InsuranceFAQChatbotOutputSchema},
  prompt: `You are a chatbot trained to answer questions about insurance policies.
  Answer the following question about an insurance policy:
  {{question}}`,
});

const insuranceFAQChatbotFlow = ai.defineFlow(
  {
    name: 'insuranceFAQChatbotFlow',
    inputSchema: InsuranceFAQChatbotInputSchema,
    outputSchema: InsuranceFAQChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
