-- All application database access goes through the server's service role.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON TABLE
  public.places,
  public.sources,
  public.questions,
  public.leaderboard
TO service_role;

GRANT SELECT, INSERT ON TABLE
  public.profiles,
  public.attempts,
  public.mission_completions
TO service_role;
