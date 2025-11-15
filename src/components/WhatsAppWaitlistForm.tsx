import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { waitlistSchema } from "@/lib/validations";

export function WhatsAppWaitlistForm() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      const validatedData = waitlistSchema.parse(formData);

      const { error } = await supabase
        .from('whatsapp_waitlist')
        .insert([
          {
            email: validatedData.email,
            name: validatedData.name,
            phone: validatedData.phone || null
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You've been added to the WhatsApp waitlist. We'll notify you when it's ready!",
      });

      // Reset form
      setFormData({ email: '', name: '', phone: '' });
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Your email address"
          required
          className="border rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500"
        />
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name"
          required
          className="border rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500"
        />
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Your WhatsApp number (optional)"
          className="border rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500"
        />
        <Button 
          type="submit" 
          size="lg" 
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full disabled:opacity-50"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Joining...' : 'Join WhatsApp Waitlist'}
        </Button>
      </div>
    </form>
  );
}