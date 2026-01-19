import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, skills, focus_areas, short_bio")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile load error", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Construct search query
    const textToEmbed = `
      Role: ${profile.role || ""}
      Skills: ${profile.skills || ""}
      Focus: ${profile.focus_areas || ""}
      Bio: ${profile.short_bio || ""}
    `.trim();

    if (!textToEmbed) {
        return NextResponse.json({ jobIds: [] });
    }

    // 3. Generate embedding
    const { embedding } = await embed({
      model: openai.textEmbeddingModel("text-embedding-3-small"),
      value: textToEmbed,
    });

    // 4. Find matches
    const { data: documents, error: searchError } = await supabase
      .rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.1, // Lower threshold to ensure we get some results
        match_count: 50, // Get top 50 matches to filter for jobs
      });

    if (searchError) {
      throw searchError;
    }

    // 5. Filter for jobs and extract IDs
    // The 'metadata' column contains { type: 'job', link: 'job_id', ... }
    const jobIds = documents
      ?.filter((doc: any) => doc.metadata?.type === "job")
      .map((doc: any) => doc.metadata.link); // 'link' stores the ID for jobs

    // Limit to top 2 recommendations
    const topJobIds = Array.from(new Set(jobIds)).slice(0, 2);

    return NextResponse.json({ jobIds: topJobIds });

  } catch (error: any) {
    console.error("Recommendation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
