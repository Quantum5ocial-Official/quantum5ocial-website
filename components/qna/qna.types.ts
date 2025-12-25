// components/qna/qna.types.ts

export type ProfileLite = {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
};

// Supabase relation may return object OR array
export type ProfileMaybe = ProfileLite | ProfileLite[] | null;

export type QQuestion = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
  profiles?: ProfileMaybe;

  qna_answers?: { count: number }[] | null;
  qna_votes?: { count: number }[] | null;
};

export type QAnswer = {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  created_at: string;

  profile?: ProfileLite | null;
  qna_answer_votes?: { count: number }[] | null;
};

export type MyProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};
