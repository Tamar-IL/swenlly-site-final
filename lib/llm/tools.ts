import { createRecord } from "../airtable";
import { notifyLead } from "../resend";
import { getPricing } from "./pricing-data";
import { availableDays, MIN_LEAD_HOURS, HORIZON_DAYS, SLOT_MINUTES, BREAK_MINUTES } from "../availability";
import { createBooking } from "../booking-service";

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
    name: "get_availability",
    description:
      `Get the real open meeting slots from swenlly's calendar. Call this BEFORE offering any time — never guess or invent one. ` +
      `Returns days with a list of slots; each slot has an "iso" value you must pass verbatim to book_meeting, and a "time" for showing the visitor. ` +
      `Slots already honour every rule: ${MIN_LEAD_HOURS}h minimum notice, up to ${HORIZON_DAYS} days ahead, 11:00-17:00 and 20:00-23:00 Israel time, a ${BREAK_MINUTES}-minute break after each meeting, and never on Shabbat, a holiday or the day before one.`,
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "How many upcoming days to list (default 5, max 14)",
        },
      },
    },
  },
  {
    name: "book_meeting",
    description:
      "Actually book the meeting in swenlly's calendar, create its Google Meet link and send the confirmation emails. This performs the booking — do not claim a meeting is booked unless this tool returned success. " +
      "Collect every required field from the visitor first; do not invent any of them. slot_iso must be copied exactly from get_availability.",
    input_schema: {
      type: "object",
      properties: {
        slot_iso: { type: "string", description: "Exact iso value of a slot from get_availability" },
        name: { type: "string", description: "Contact full name" },
        phone: { type: "string", description: "Contact phone number" },
        email: { type: "string", description: "Contact email address" },
        business: { type: "string", description: "Business name" },
        field: { type: "string", description: "Business field/industry (optional)" },
        topic: { type: "string", description: "What the visitor wants to talk about" },
      },
      required: ["slot_iso", "name", "phone", "email", "business", "topic"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Actually record an enquiry and email it to swenlly so they can call the visitor back. This performs the action — do not claim details were passed on unless this tool returned success. Only call after the visitor agreed to share their details.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        business: { type: "string", description: "Business name, if given" },
        interest: { type: "string", description: "What they're interested in, in their own words" },
      },
      required: ["name", "phone"],
    },
  },
];

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

/** Executes a tool call on the server. Returns a short string result for the model. */
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  locale: string
): Promise<string> {
  try {
    if (name === "get_pricing") {
      return JSON.stringify(getPricing(str(input.service) || undefined));
    }

    if (name === "get_availability") {
      const limit = Math.min(Math.max(Number(input.days) || 5, 1), HORIZON_DAYS);
      const days = await availableDays(new Date(), locale);
      if (!days.length) {
        return JSON.stringify({
          slot_minutes: SLOT_MINUTES,
          days: [],
          note: "No open slots in the next two weeks. Offer to take their details instead with capture_lead.",
        });
      }
      return JSON.stringify({ slot_minutes: SLOT_MINUTES, days: days.slice(0, limit) });
    }

    if (name === "book_meeting") {
      const missing = ["slot_iso", "name", "phone", "email", "business", "topic"].filter(
        (k) => !str(input[k])
      );
      if (missing.length) {
        return `FAILED — nothing was booked. Ask the visitor for: ${missing.join(", ")}. Do not tell them the meeting is set.`;
      }
      const result = await createBooking({
        slot: str(input.slot_iso),
        name: str(input.name),
        phone: str(input.phone),
        email: str(input.email),
        business: str(input.business),
        field: str(input.field),
        topic: str(input.topic),
        locale,
        source: "agent",
      });
      if (!result.ok) {
        return `FAILED — nothing was booked. Reason: ${result.error} Tell the visitor exactly this, call get_availability again and offer a different time.`;
      }
      return (
        `BOOKED. The meeting is in the calendar for ${result.booking.slotLabel} and a confirmation email was sent to ${result.booking.email}. ` +
        (result.booking.meetLink
          ? "A Google Meet link was created and is in that email. Do not paste the link into the chat — tell the visitor it is in their inbox."
          : "No Meet link was created this time; the email says the call link will follow.") +
        " Tell the visitor the date and time, and that a confirmation is on its way."
      );
    }

    if (name === "capture_lead") {
      const lead = {
        name: str(input.name),
        phone: str(input.phone),
        email: str(input.email),
        message: [str(input.business) && `עסק: ${str(input.business)}`, str(input.interest) && `מתעניין ב: ${str(input.interest)}`]
          .filter(Boolean)
          .join(" · "),
        source: "agent",
      };
      if (!lead.name || !lead.phone) {
        return "FAILED — nothing was sent. Ask for a name and a phone number first.";
      }
      const stored = await createRecord("Leads", {
        ...lead,
        locale,
        status: "New",
        createdAt: new Date().toISOString(),
      });
      const mailed = await notifyLead(lead);
      if (!stored.ok && !mailed) {
        console.error("[agent tool capture_lead] LOST — no store and no email", { phone: lead.phone });
        return "FAILED — the enquiry was not saved. Apologise and give the visitor swenlly's WhatsApp instead. Do not say it was passed on.";
      }
      return mailed
        ? "SENT. The enquiry was emailed to swenlly. Confirm to the visitor that someone will get back to them."
        : "SAVED. The enquiry is recorded in swenlly's system (the email notification did not go out). Confirm to the visitor that someone will get back to them.";
    }

    return `Unknown tool: ${name}`;
  } catch (err) {
    console.error(`[agent tool ${name}] failed`, err);
    return "FAILED — the action did not happen because of a server error. Tell the visitor and offer WhatsApp instead.";
  }
}
