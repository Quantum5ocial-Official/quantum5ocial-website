import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, UIMessage, embed } from "ai";
import { google } from "@ai-sdk/google";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  // Extract text content robustly
  const query = lastMessage.parts?.find(p => p.type === 'text')?.text || "";

  try {
    // 1. Generate embedding using Gemini
    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: query,
    });

    // 2. Retrieve relevant documents
    const { data: documents, error: searchError } = await supabase
      .rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 5,
      });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(JSON.stringify({ error: searchError.message }), { status: 500 });
    }

    // 3. Construct system prompt
    const context = documents?.map((doc: any) => doc.content).join("\n\n---\n\n") || "No relevant documents found.";

    const systemPrompt = `
You are HeisenBot, a witty and rebellious AI assistant for Quantum5ocial.
You have access to the following real-time data from the platform:

${context}

Instructions:
- Answer the user's question based ONLY on the provided context.
- If the answer is not in the context, say "I can't find that in the quantum realm currently."
- Be concise, helpful, and slightly snarky/witty.
- Do not hallucinate jobs or facts not present in the context.
- **Formating**: Use Markdown tables or bulleted lists to present job listings or data clearly. Avoid dense paragraphs for lists.
    `.trim();

    // 4. Stream response
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}