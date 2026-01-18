import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, UIMessage, embed } from "ai";
import { openai } from "@ai-sdk/openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, userProfile }: { messages: UIMessage[], userProfile?: any } = await req.json();

  const lastMessage = messages[messages.length - 1];
  // Extract text content robustly
  const query = (lastMessage as any).content || lastMessage.parts?.find(p => p.type === 'text')?.text || "";

  // Enrich query with user context if personalization is implied
  let searchInput = query;
  if (userProfile) {
    const q = query.toLowerCase();
    const isPersonal = q.includes("my") || q.includes("me") || q.includes("i ") || q.includes("recommend") || q.includes("match") || q.includes("suitable");
    
    if (isPersonal) {
      const keywords = [
        userProfile.skills,
        userProfile.focus_areas,
        userProfile.current_title,
        userProfile.role
      ].filter(Boolean).join(" ");
      
      if (keywords) {
        searchInput = `${query} ${keywords}`;
      }
    }
  }

  try {
    // 1. Generate embedding using OpenAI
    const { embedding } = await embed({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      value: searchInput,
    });

    // 2. Retrieve relevant documents
    const { data: documents, error: searchError } = await supabase
      .rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.1,
        match_count: 10,
      });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(JSON.stringify({ error: searchError.message }), { status: 500 });
    }

    // 3. Construct system prompt
    const context = documents?.map((doc: any) => `${doc.content}\nID: ${doc.metadata.link}\nType: ${doc.metadata.type}`).join("\n\n---\n\n") || "No relevant documents found.";

    // Format user profile for context
    let userContext = "User is anonymous.";
    if (userProfile) {
      userContext = `
**Current User Context:**
- **Name:** ${userProfile.full_name || "Unknown"}
- **Role:** ${userProfile.role || userProfile.current_title || "Unknown"}
- **Skills:** ${userProfile.skills || "N/A"}
- **Focus Areas:** ${userProfile.focus_areas || "N/A"}
- **Bio:** ${userProfile.short_bio || "N/A"}
- **ID:** ${userProfile.id}
      `.trim();
    }

    const systemPrompt = `
You are Tattva AI, an intelligent and helpful AI assistant for Quantum5ocial.
You have access to the following real-time data from the platform:

${context}

${userContext}

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

    console.log(systemPrompt);

    // 4. Stream response
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: (m as any).content || m.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || "",
      })),
    });

    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}