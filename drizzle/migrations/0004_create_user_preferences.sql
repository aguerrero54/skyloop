CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('light', 'dark', 'system')),
  theme_color text NOT NULL DEFAULT 'default' CHECK (theme_color IN ('default', 'slate', 'blue', 'purple', 'green', 'rose')),
  background_color text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own"
ON public.user_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
ON public.user_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own"
ON public.user_preferences FOR DELETE TO authenticated
USING (auth.uid() = user_id);