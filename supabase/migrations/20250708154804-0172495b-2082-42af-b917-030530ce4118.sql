-- Create family_members table for dynamic family profiles
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('child', 'parent', 'elder', 'teen', 'adult')),
  age INTEGER,
  learning_level TEXT NOT NULL DEFAULT 'beginner' CHECK (learning_level IN ('beginner', 'intermediate', 'advanced')),
  interests TEXT[] DEFAULT '{}',
  tone TEXT NOT NULL DEFAULT 'conversational' CHECK (tone IN ('playful', 'patient', 'conversational', 'enthusiastic', 'calm')),
  spanish_preference DECIMAL(3,2) DEFAULT 0.5 CHECK (spanish_preference >= 0 AND spanish_preference <= 1),
  english_preference DECIMAL(3,2) DEFAULT 0.5 CHECK (english_preference >= 0 AND english_preference <= 1),
  name_variants TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create policies for family_members
CREATE POLICY "Users can view their own family members" 
ON public.family_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own family members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family members" 
ON public.family_members 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family members" 
ON public.family_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_members_active ON public.family_members(user_id, is_active) WHERE is_active = true;