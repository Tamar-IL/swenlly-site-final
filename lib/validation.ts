import { z } from "zod";

// Israeli phone: 0xx-xxxxxxx or +972..., allow spaces/dashes; also allow "-" placeholder for newsletter.
const phone = z
  .string()
  .trim()
  .min(1, "נא למלא מספר טלפון")
  .max(30, "מספר הטלפון ארוך מדי")
  .regex(/^[-+0-9()\s]{1,30}$/, "מספר טלפון לא תקין");

export const leadSchema = z.object({
  name: z.string().trim().min(1, "נא למלא שם").max(120, "השם ארוך מדי"),
  phone,
  email: z.string().trim().email("אימייל לא תקין").max(160, "האימייל ארוך מדי").optional().or(z.literal("")),
  message: z.string().trim().max(2000, "ההודעה ארוכה מדי — עד 2000 תווים").optional().or(z.literal("")),
  source: z.string().max(60).default("contact"),
  locale: z.string().max(10).default("he"),
  turnstileToken: z.string().optional(),
  hp: z.string().optional(), // honeypot
});
export type LeadInput = z.infer<typeof leadSchema>;

export const bookingSchema = z.object({
  name: z.string().trim().min(1, "נא למלא שם").max(120, "השם ארוך מדי"),
  phone,
  email: z.string().trim().email("אימייל לא תקין").max(160, "האימייל ארוך מדי"),
  slot: z.string().trim().min(1, "נא לבחור מועד").max(60, "המועד ארוך מדי"),
  topic: z.string().trim().max(400, "הנושא ארוך מדי").optional().or(z.literal("")),
  locale: z.string().max(10).default("he"),
  turnstileToken: z.string().optional(),
  hp: z.string().optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const agentSchema = z.object({
  sessionId: z.string().trim().min(1).max(80),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(40),
  locale: z.string().max(10).default("he"),
  turnstileToken: z.string().optional(),
});
export type AgentInput = z.infer<typeof agentSchema>;
