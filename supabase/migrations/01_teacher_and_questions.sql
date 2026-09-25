-- ═══════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATION: TEACHER & QUESTION MANAGEMENT EXTENSION
-- ═══════════════════════════════════════════════════════════════════

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher', 'student')),
  department TEXT DEFAULT 'IT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Questions Master Table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option1 TEXT NOT NULL,
  option2 TEXT NOT NULL,
  option3 TEXT NOT NULL,
  option4 TEXT NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 1 AND 4),
  marks NUMERIC NOT NULL DEFAULT 1,
  subject TEXT,
  topic TEXT,
  difficulty TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  question_type TEXT DEFAULT 'MCQ',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  archived BOOLEAN DEFAULT FALSE
);

-- Enable RLS on Questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own non-deleted questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    archived = FALSE AND deleted_at IS NULL AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Teachers can insert questions"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Teachers can update their own questions"
  ON public.questions FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can safe-delete (archive) their questions"
  ON public.questions FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Event Questions Association Table
CREATE TABLE IF NOT EXISTS public.event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INT8 REFERENCES public.events(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INT DEFAULT 1,
  marks NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, question_id)
);

-- Enable RLS on Event Questions
ALTER TABLE public.event_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event questions without answers"
  ON public.event_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and Admins can manage event questions"
  ON public.event_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 4. Question Imports Tracker
CREATE TABLE IF NOT EXISTS public.question_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id INT8 REFERENCES public.events(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('excel', 'ai_text', 'pdf', 'image', 'manual')),
  file_name TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'review', 'completed', 'failed')),
  total_questions INT DEFAULT 0,
  valid_questions INT DEFAULT 0,
  invalid_questions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.question_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own imports"
  ON public.question_imports FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage their imports"
  ON public.question_imports FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Test Platform Sync Table
CREATE TABLE IF NOT EXISTS public.test_platform_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INT8 REFERENCES public.events(id) ON DELETE CASCADE,
  test_platform_id TEXT,
  test_platform_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_platform_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view synced test URL for live events"
  ON public.test_platform_sync FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Teachers and Admins can manage test sync"
  ON public.test_platform_sync FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 6. Extend Events Table with Test Platform columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'test_platform_id') THEN
    ALTER TABLE public.events ADD COLUMN test_platform_id TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'test_platform_url') THEN
    ALTER TABLE public.events ADD COLUMN test_platform_url TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'test_status') THEN
    ALTER TABLE public.events ADD COLUMN test_status TEXT DEFAULT 'UNPUBLISHED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'test_published_at') THEN
    ALTER TABLE public.events ADD COLUMN test_published_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- 7. Storage Bucket for Question Imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-imports', 'question-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload question imports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'question-imports');

CREATE POLICY "Users can access their own uploaded files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'question-imports');
