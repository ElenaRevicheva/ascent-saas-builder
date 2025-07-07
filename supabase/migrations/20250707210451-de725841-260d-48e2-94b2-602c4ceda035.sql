-- Create subscription status table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id TEXT NOT NULL UNIQUE, -- PayPal subscription ID
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, trial
  plan_type TEXT NOT NULL DEFAULT 'standard', -- free_trial, standard, premium
  paypal_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  trial_end TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '1 week'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_type TEXT NOT NULL, -- 'conversation', 'avatar_video', 'voice_message'
  usage_count INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_type, date)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage" 
ON public.usage_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" 
ON public.usage_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
ON public.usage_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid UUID)
RETURNS TABLE (
  status TEXT,
  plan_type TEXT,
  trial_days_left INTEGER,
  is_trial_active BOOLEAN,
  is_subscription_active BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.status, 'free_trial') as status,
    COALESCE(us.plan_type, 'free_trial') as plan_type,
    CASE 
      WHEN us.trial_end IS NOT NULL AND us.trial_end > now() 
      THEN EXTRACT(days FROM (us.trial_end - now()))::INTEGER
      ELSE 0
    END as trial_days_left,
    CASE 
      WHEN us.trial_end IS NOT NULL AND us.trial_end > now() 
      THEN true 
      ELSE false 
    END as is_trial_active,
    CASE 
      WHEN us.status = 'active' AND us.current_period_end > now() 
      THEN true 
      ELSE false 
    END as is_subscription_active
  FROM public.user_subscriptions us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, return trial status
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'free_trial'::TEXT as status,
      'free_trial'::TEXT as plan_type,
      7 as trial_days_left,
      true as is_trial_active,
      false as is_subscription_active;
  END IF;
END;
$$;