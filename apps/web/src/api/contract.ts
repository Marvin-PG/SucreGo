export interface Source {
  title: string;
  url: string;
}

export interface Place {
  slug: string;
  name: string;
  summary: string;
  coordinates: { latitude: number | null; longitude: number | null };
  imageUrl: string | null;
}

export interface PlaceDetail extends Place {
  description: string;
  sources: Source[];
}

export interface Lesson {
  lessonId: string;
  placeSlug: string;
  title: string;
  content: string;
  sources: Source[];
  createdAt: string;
}

export interface ChatReply {
  answer: string;
  citations: Source[];
  abstained: boolean;
  createdAt: string;
}

export interface Quiz {
  quizId: string;
  placeSlug: string;
  questions: {
    questionId: string;
    prompt: string;
    options: { optionId: string; text: string }[];
  }[];
}

export interface Submission {
  quizId: string;
  answers: { questionId: string; optionId: string }[];
}

export interface Result {
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  xpAwarded: number;
  totalXp: number;
  level: string;
  firstCompletion: boolean;
}

export interface Profile {
  userId: string;
  alias: string;
  totalXp: number;
  level: string;
  completedPlaceSlugs: string[];
  createdAt: string;
}

export interface RankingEntry {
  rank: number;
  userId: string;
  alias: string;
  totalXp: number;
  level: string;
}

export interface Api {
  places: () => Promise<{ items: Place[]; nextCursor: string | null }>;
  place: (slug: string) => Promise<PlaceDetail>;
  lesson: (slug: string) => Promise<Lesson>;
  chat: (slug: string, message: string) => Promise<ChatReply>;
  quiz: (slug: string) => Promise<Quiz>;
  submit: (slug: string, submission: Submission) => Promise<Result>;
  me: () => Promise<Profile>;
  leaderboard: () => Promise<{ items: RankingEntry[]; generatedAt: string }>;
}
