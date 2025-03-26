import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const openAiModel = openai('gpt-4o-mini');
