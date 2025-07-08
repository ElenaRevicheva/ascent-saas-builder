-- Create learning modules table
CREATE TABLE public.learning_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  category TEXT NOT NULL DEFAULT 'conversation',
  lesson_content JSONB NOT NULL DEFAULT '{}',
  estimated_duration_minutes INTEGER DEFAULT 15,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user module progress table
CREATE TABLE public.user_module_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER DEFAULT 0,
  vocabulary_learned TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create learning streaks table
CREATE TABLE public.learning_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_title TEXT NOT NULL,
  achievement_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  badge_icon TEXT DEFAULT 'trophy'
);

-- Enable RLS
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_modules (public read access)
CREATE POLICY "Anyone can view learning modules" 
ON public.learning_modules 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for user_module_progress
CREATE POLICY "Users can view their own module progress" 
ON public.user_module_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own module progress" 
ON public.user_module_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module progress" 
ON public.user_module_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for learning_streaks
CREATE POLICY "Users can view their own learning streaks" 
ON public.learning_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning streaks" 
ON public.learning_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning streaks" 
ON public.learning_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for timestamp updates
CREATE TRIGGER update_learning_modules_updated_at
BEFORE UPDATE ON public.learning_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_module_progress_updated_at
BEFORE UPDATE ON public.user_module_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_streaks_updated_at
BEFORE UPDATE ON public.learning_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample learning modules
INSERT INTO public.learning_modules (title, description, difficulty_level, category, lesson_content, estimated_duration_minutes, order_index) VALUES
('Basic Greetings', 'Learn essential Spanish greetings and introductions', 'beginner', 'vocabulary', '{"vocabulary": ["Hola", "Buenos días", "¿Cómo estás?", "Me llamo"], "exercises": ["greeting_practice", "pronunciation"], "conversation_starters": ["Introduce yourself to a new friend"]}', 10, 1),
('Family Members', 'Master family vocabulary and relationships', 'beginner', 'vocabulary', '{"vocabulary": ["familia", "madre", "padre", "hermano", "hermana", "abuelo", "abuela"], "exercises": ["family_tree", "role_play"], "conversation_starters": ["Describe your family to Espaluz"]}', 15, 2),
('Daily Routines', 'Express daily activities and time', 'intermediate', 'conversation', '{"vocabulary": ["levantarse", "desayunar", "trabajar", "almorzar", "cenar"], "grammar": ["present_tense_reflexive"], "exercises": ["daily_schedule", "time_practice"], "conversation_starters": ["Tell Espaluz about your typical day"]}', 20, 3),
('Emotions & Feelings', 'Learn to express emotions and feelings', 'intermediate', 'conversation', '{"vocabulary": ["feliz", "triste", "enojado", "emocionado", "cansado", "nervioso"], "exercises": ["emotion_matching", "feeling_stories"], "conversation_starters": ["Share how you are feeling today"]}', 15, 4),
('Advanced Conversations', 'Practice complex topics and opinions', 'advanced', 'conversation', '{"topics": ["current_events", "culture", "philosophy", "future_plans"], "exercises": ["debate_practice", "opinion_sharing"], "conversation_starters": ["Discuss your dreams and aspirations"]}', 30, 5);