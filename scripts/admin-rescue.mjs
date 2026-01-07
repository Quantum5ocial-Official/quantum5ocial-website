import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const USER_ID = process.env.USER_ID;
const NEW_EMAIL = process.env.NEW_EMAIL;
const NEW_PASSWORD = process.env.NEW_PASSWORD;

if (!USER_ID) {
  console.error("Missing USER_ID");
  process.exit(1);
}

async function run() {
  const update = {};

  if (NEW_EMAIL) {
    update.email = NEW_EMAIL;
    update.email_confirm = true; // IMPORTANT
  }

  if (NEW_PASSWORD) {
    update.password = NEW_PASSWORD;
  }

  if (Object.keys(update).length === 0) {
    console.error("Nothing to update");
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    USER_ID,
    update
  );

  if (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  console.log("✅ User updated");
  console.log("ID:", data.user.id);
  console.log("Email:", data.user.email);
}

run();
