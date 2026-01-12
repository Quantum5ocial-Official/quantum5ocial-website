import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role key needed for admin writes if RLS is strict

// NOTE: We need the SERVICE ROLE KEY to bypass RLS or write to the table if public doesn't have access.
// If you only have anon key, ensure RLS allows inserts.
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Fetch all published jobs
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, organisation_name, location_text, job_type, additional_description") // Ensure these fields exist
    .eq("is_published", true);

  if (jobsError) {
    return res.status(500).json({ error: jobsError.message });
  }

  if (!jobs || jobs.length === 0) {
    return res.status(200).json({ message: "No jobs to index." });
  }

  let indexedCount = 0;
  const errors: any[] = [];

  // 2. Iterate and generate embeddings
  for (const job of jobs) {
    const jobContent = `
Title: ${job.title}
Organization: ${job.organisation_name || "Unknown"}
Location: ${job.location_text || "Remote"}
Type: ${job.job_type || "N/A"}
Description: ${job.additional_description || "No description provided."}
    `.trim();

    try {
      // Generate embedding using Gemini
      const { embedding } = await embed({
        model: google.textEmbeddingModel("text-embedding-004"),
        value: jobContent,
      });

      // 3. Upsert into search_documents
      const { error: insertError } = await supabase
        .from("search_documents")
        .insert({
            content: jobContent,
            metadata: { type: "job", job_id: job.id, title: job.title },
            embedding,
        });

      if (insertError) {
        throw new Error(`Supabase insert error: ${insertError.message}`);
      } else {
        indexedCount++;
      }

    } catch (err: any) {
      console.error(`Error processing job ${job.id}:`, err);
      errors.push({ jobId: job.id, error: err.message || err });
    }
  }

  return res.status(200).json({ 
    message: `Processed ${jobs.length} jobs. Indexed: ${indexedCount}. Failed: ${errors.length}`,
    errors 
  });
}
