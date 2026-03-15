'use server';
/**
 * @fileOverview This file implements a Genkit flow for classifying the industry type
 * of a company based on its name, primarily for auto-completion in MOA entries.
 *
 * - classifyMoaIndustry - A function that suggests the industry type for a given company name.
 * - MoaIndustryClassifierInput - The input type for the classifyMoaIndustry function.
 * - MoaIndustryClassifierOutput - The return type for the classifyMoaIndustry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MoaIndustryClassifierInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
});
export type MoaIndustryClassifierInput = z.infer<typeof MoaIndustryClassifierInputSchema>;

const MoaIndustryClassifierOutputSchema = z.object({
  industryType: z.string().describe('The suggested industry type for the company.'),
});
export type MoaIndustryClassifierOutput = z.infer<typeof MoaIndustryClassifierOutputSchema>;

const prompt = ai.definePrompt({
  name: 'moaIndustryClassifierPrompt',
  input: {schema: MoaIndustryClassifierInputSchema},
  output: {schema: MoaIndustryClassifierOutputSchema},
  prompt: `You are an AI assistant specialized in business classification.
Given a company name, suggest the most appropriate and concise industry type from the following examples:
Telecom, Food, Services, Technology, Finance, Education, Healthcare, Manufacturing, Retail, Consulting, Energy, Real Estate, Media, Automotive, Government.

Return only the most fitting industry type as a single string.

Company Name: {{{companyName}}}`,
});

const moaIndustryClassifierFlow = ai.defineFlow(
  {
    name: 'moaIndustryClassifierFlow',
    inputSchema: MoaIndustryClassifierInputSchema,
    outputSchema: MoaIndustryClassifierOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function classifyMoaIndustry(
  input: MoaIndustryClassifierInput
): Promise<MoaIndustryClassifierOutput> {
  return moaIndustryClassifierFlow(input);
}
