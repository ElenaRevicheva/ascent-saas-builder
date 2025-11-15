import { z } from 'zod';

// Waitlist form validation
export const waitlistSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  name: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  phone: z.string()
    .trim()
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal(''))
});

// Feedback form validation
export const feedbackSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .optional()
    .or(z.literal('')),
  message: z.string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(2000, { message: "Message must be less than 2000 characters" })
});

// Family member validation
export const familyMemberSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  role: z.string()
    .min(1, { message: "Role is required" }),
  age: z.number()
    .min(1)
    .max(120)
    .optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']),
  interests: z.array(z.string().max(50))
    .max(10, { message: "Maximum 10 interests allowed" }),
  tone: z.string()
    .min(1, { message: "Tone is required" }),
  spanish_preference: z.number()
    .min(0)
    .max(1),
  english_preference: z.number()
    .min(0)
    .max(1),
  name_variants: z.array(z.string().max(100))
    .max(5, { message: "Maximum 5 name variants allowed" }),
  is_active: z.boolean()
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;
