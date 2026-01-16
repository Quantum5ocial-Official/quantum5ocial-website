import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, UIMessage, embed } from "ai";
import { openai } from "@ai-sdk/openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  // Extract text content robustly
  // Extract text content robustly
  const query = (lastMessage as any).content || lastMessage.parts?.find(p => p.type === 'text')?.text || "";

  try {
    // 1. Generate embedding using OpenAI
    const { embedding } = await embed({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      value: query,
    });

    // 2. Retrieve relevant documents
    const { data: documents, error: searchError } = await supabase
      .rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.1,
        match_count: 5,
      });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(JSON.stringify({ error: searchError.message }), { status: 500 });
    }

    // 3. Construct system prompt
    const context = documents?.map((doc: any) => `${doc.content}\nID: ${doc.metadata.link}\nType: ${doc.metadata.type}`).join("\n\n---\n\n") || "No relevant documents found.";

    console.log("Context:", documents);
    const systemPrompt = `
You are Tattva AI, an intelligent and helpful AI assistant for Quantum5ocial.
You have access to the following real-time data from the platform:

${context}

Instructions:
- Answer the user's question based ONLY on the provided context.
- If the answer is not in the context, say "I can't find that in the quantum realm currently."
- Be concise, helpful, and slightly snarky/witty.
- Do not hallucinate jobs or facts not present in the context.
- Filter out the results that are not relevant to the user's question.
- **Formating**: Use Markdown tables or bulleted lists to present job listings or data clearly. Avoid dense paragraphs for lists.
- **Linking**:
  - When mentioning a Job, you MUST link to it using the format: \`[Job Title](/jobs/ID)\` (using the ID from the context).
  - When mentioning a Product, you MUST link to it using the format: \`[Product Name](/products/ID)\`.
  - When mentioning a User/Profile, you MUST link to it using the format: \`[Name](/profile/ID)\`.
  - When mentioning an Organization, you MUST link to it using the format: \`[Name](/orgs/ID)\`.
  - Do NOT create links for types other than Job, Product, Profile, or Organization unless you are certain of the URL.
    `.trim();
    console.log("System prompt:", systemPrompt);

    // 4. Stream response
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}