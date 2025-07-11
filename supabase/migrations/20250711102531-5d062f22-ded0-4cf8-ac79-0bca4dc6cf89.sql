-- Create a table for WhatsApp waitlist
CREATE TABLE public.whatsapp_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (public waitlist)
CREATE POLICY "Anyone can join the waitlist" 
ON public.whatsapp_waitlist 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow only admins to view (you can modify this later)
CREATE POLICY "Only authenticated users can view waitlist" 
ON public.whatsapp_waitlist 
FOR SELECT 
USING (false); -- Change this to allow specific users if needed

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_waitlist_updated_at
BEFORE UPDATE ON public.whatsapp_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();