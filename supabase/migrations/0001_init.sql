-- SucreGo · Initial database schema (Supabase / PostgreSQL)
-- Access model: Row Level Security is enabled on every table with NO open
-- policies. All reads and writes go through the backend API using service role.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  alias text NOT NULL UNIQUE CHECK (char_length(btrim(alias)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.places (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  category text NOT NULL CHECK (char_length(btrim(category)) > 0),
  latitude double precision CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude double precision CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  summary text NOT NULL,
  image_url text
);

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_slug text NOT NULL REFERENCES public.places (slug) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  institution text NOT NULL,
  consulted_at timestamptz NOT NULL DEFAULT now(),
  excerpt text NOT NULL
);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_slug text NOT NULL REFERENCES public.places (slug) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  explanation text NOT NULL,
  CONSTRAINT questions_place_slug_position_unique UNIQUE (place_slug, position),
  CONSTRAINT questions_options_valid_check CHECK (
    CASE
      WHEN jsonb_typeof(options) = 'array' THEN
        jsonb_array_length(options) >= 2
        AND correct_index >= 0
        AND correct_index < jsonb_array_length(options)
      ELSE false
    END
  )
);

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  place_slug text NOT NULL REFERENCES public.places (slug) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  passed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mission_completions (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  place_slug text NOT NULL REFERENCES public.places (slug) ON DELETE CASCADE,
  xp_awarded integer NOT NULL CHECK (xp_awarded >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, place_slug)
);

-- Indexes for frequent lookups by foreign keys
CREATE INDEX idx_sources_place_slug ON public.sources (place_slug);
CREATE INDEX idx_attempts_user_id ON public.attempts (user_id);
CREATE INDEX idx_attempts_place_slug ON public.attempts (place_slug);
CREATE INDEX idx_mission_completions_place_slug ON public.mission_completions (place_slug);

-- Public leaderboard view (service_role reads through backend API).
-- Uses security_invoker so caller RLS on underlying tables is never bypassed.
-- Includes profiles with 0 XP via LEFT JOIN and breaks ties deterministically.
CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
WITH user_totals AS (
  SELECT
    p.id AS user_id,
    p.alias,
    p.created_at,
    COALESCE(SUM(mc.xp_awarded), 0)::integer AS total_xp,
    MAX(mc.completed_at) AS last_completed_at
  FROM public.profiles AS p
  LEFT JOIN public.mission_completions AS mc
    ON mc.user_id = p.id
  GROUP BY p.id, p.alias, p.created_at
)
SELECT
  RANK() OVER (ORDER BY total_xp DESC)::integer AS rank,
  user_id,
  alias,
  total_xp
FROM user_totals
ORDER BY
  total_xp DESC,
  last_completed_at ASC NULLS LAST,
  created_at ASC,
  alias ASC;

-- Enable Row Level Security on ALL tables without open policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
