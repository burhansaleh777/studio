
'use server';

/**
 * @fileOverview An insurance FAQ chatbot flow that uses a defined knowledge base.
 *
 * - insuranceFAQChatbot - A function that handles the chatbot interactions.
 * - InsuranceFAQChatbotInput - The input type for the insuranceFAQChatbot function.
 * - InsuranceFAQChatbotOutput - The return type for the insuranceFAQChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getInsuranceKnowledgeBaseAsText } from '@/config/insurance-rules'; // Import knowledge base

const InsuranceFAQChatbotInputSchema = z.object({
  question: z.string().describe('The user question about their insurance policy or Bima Hub products.'),
});
export type InsuranceFAQChatbotInput = z.infer<typeof InsuranceFAQChatbotInputSchema>;

const InsuranceFAQChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot answer to the user question, based on the provided knowledge base.'),
});
export type InsuranceFAQChatbotOutput = z.infer<typeof InsuranceFAQChatbotOutputSchema>;

export async function insuranceFAQChatbot(input: InsuranceFAQChatbotInput): Promise<InsuranceFAQChatbotOutput> {
  return insuranceFAQChatbotFlow(input);
}

const insuranceKnowledgeBase = getInsuranceKnowledgeBaseAsText();

const prompt = ai.definePrompt({
  name: 'insuranceFAQChatbotPrompt',
  input: {schema: InsuranceFAQChatbotInputSchema},
  output: {schema: InsuranceFAQChatbotOutputSchema},
  prompt: `You are an AI customer support agent for Bima Hub, an insurance company in Tanzania.
Your ONLY source of information for answering questions is the "Bima Hub Insurance Product Information & Rules" provided below.
Answer the user's question accurately based on this information.
If the information to answer the question is not present in the provided text, clearly state that you do not have that specific detail or that the information is not covered in your knowledge base.
Do not make up answers or use external knowledge. Be concise and helpful.

User's Question:
{{question}}

Bima Hub Insurance Product Information & Rules:
{{{insuranceKnowledgeBase}}}

Based ONLY on the information above, provide the answer.
`,
});

const insuranceFAQChatbotFlow = ai.defineFlow(
  {
    name: 'insuranceFAQChatbotFlow',
    inputSchema: InsuranceFAQChatbotInputSchema,
    outputSchema: InsuranceFAQChatbotOutputSchema,
  },
  async (input) => {
    const llmInput = {
        ...input,
        insuranceKnowledgeBase: insuranceKnowledgeBase,
    };
    const {output} = await prompt(llmInput);
    
    if (!output) {
        return { answer: "I'm sorry, I couldn't process that request at the moment. Please try again." };
    }
    return output;
  }
);
