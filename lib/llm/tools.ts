import { createRecord } from "../airtable";
import { notifyLead, notifyBooking } from "../resend";
import { getPricing } from "./pricing-data";

export type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export const TOOLS: ToolDef[] = [
  {
    name: "get_pricing",
    description:
      "Get swenlly's price range for a service. Call before quoting any price. service is one of: agents, crm, forms, automations, systems. Omit service to get all ranges.",
    input_schema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          enum: ["agents", "crm", "forms", "automations", "systems"],
          description: "The service to price",
        },
      },
    },
  },
  {
    name: "capture_lead",
    description:
      "Save an interested visitor's contact details so swenlly can call them back. Only call after the visitor agreed to share details.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        interest: { type: "string", description: "What they're interested in" },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "request_booking",
    description:
      "Request a free consultation call for the visitor. Only call after collecting name, phone, email and a preferred time.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        preferred_time: { type: "string" },
      },
      required: ["name", "phone", "preferred_time"],
    },
  },
];

/** Executes a tool call on the server. Returns a short string result for the model. */
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  locale: string
): Promise<string> {
  try {
    if (name === "get_pricing") {
      return JSON.stringify(getPricing(input.service as string | undefined));
    }
    if (name === "capture_lead") {
      const lead = {
        name: String(input.name || ""),
        phone: String(input.phone || ""),
        email: input.email ? String(input.email) : "",
        message: input.interest ? `מתעניין ב: ${input.interest}` : "",
        source: "agent",
      };
      await createRecord("Leads", { ...lead, locale, status: "New", createdAt: new Date().toISOString() });
      await notifyLead(lead);
      return "נשמר. אישרנו שהפרטים התקבלו ונחזור אליו/ה.";
    }
    if (name === "request_booking") {
      const booking = {
        name: String(input.name || ""),
        phone: String(input.phone || ""),
        email: input.email ? String(input.email) : "",
        slot: String(input.preferred_time || ""),
        topic: "שיחת ייעוץ מהסוכן",
      };
      await createRecord("Bookings", { ...booking, locale, status: "Pending", createdAt: new Date().toISOString() });
      await notifyBooking(booking);
      return "בקשת הפגישה נרשמה. נאשר את המועד במייל.";
    }
    return `Unknown tool: ${name}`;
  } catch (err) {
    console.error(`[agent tool ${name}] failed`, err);
    return "אירעה שגיאה בשמירה. אפשר לפנות אלינו בוואטסאפ.";
  }
}
