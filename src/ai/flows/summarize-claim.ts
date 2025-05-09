// SummarizeClaimDetails flow
'use server';

/**
 * @fileOverview Summarizes user-submitted claim details for insurance agents.
 *
 * - summarizeClaim - A function that summarizes the claim details.
 * - SummarizeClaimInput - The input type for the summarizeClaim function.
 * - SummarizeClaimOutput - The return type for the summarizeClaim function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeClaimInputSchema = z.object({
  accidentDescription: z
    .string()
    .describe('The description of the accident provided by the user.'),
  supportingDocuments: z
    .array(z.string())
    .describe(
      'An array of data URIs representing supporting documents, such as images or PDFs, related to the claim. Each data URI must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    )
    .optional(),
});
export type SummarizeClaimInput = z.infer<typeof SummarizeClaimInputSchema>;

const SummarizeClaimOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the claim details.'),
});
export type SummarizeClaimOutput = z.infer<typeof SummarizeClaimOutputSchema>;

export async function summarizeClaim(input: SummarizeClaimInput): Promise<SummarizeClaimOutput> {
  return summarizeClaimFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeClaimPrompt',
  input: {schema: SummarizeClaimInputSchema},
  output: {schema: SummarizeClaimOutputSchema},
  prompt: `You are an experienced insurance claim summarizer.

  Summarize the following claim details, including the accident description and any supporting documents, into a concise summary for an insurance agent to quickly understand the context and required actions.

  Accident Description: {{{accidentDescription}}}

  {{#if supportingDocuments}}
  Supporting Documents:
  {{#each supportingDocuments}}
  - {{media url=this}}
  {{/each}}
  {{else}}
  No supporting documents provided.
  {{/if}}
  `,
});

const summarizeClaimFlow = ai.defineFlow(
  {
    name: 'summarizeClaimFlow',
    inputSchema: SummarizeClaimInputSchema,
    outputSchema: SummarizeClaimOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
