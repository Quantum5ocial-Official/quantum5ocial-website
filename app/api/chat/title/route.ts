import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { inputText } = await req.json();

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `
        You are a helpful assistant that generates a concise title for a chat conversation based on the user's first message.
        - The title should be short (3-5 words max).
        - It should summarize the user's intent.
        - Do not include quotes or punctuation.
        - Do not include "Title:" prefix.
      `.trim(),
      prompt: `User message: ${inputText}`,
    });

    return new Response(JSON.stringify({ title: text }), { status: 200 });
  } catch (error: any) {
    console.error("Title generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
