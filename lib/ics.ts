// A minimal iCalendar file, attached to the confirmation email so the meeting
// lands in the client's own calendar instead of only in ours.

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Folds long lines at 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildIcs(opts: {
  uid: string;
  start: Date;
  minutes: number;
  title: string;
  description: string;
  organizerEmail: string;
  attendeeEmail: string;
  /** Google Meet URL, when there is one. Becomes the event's location. */
  meetLink?: string;
}): string {
  const end = new Date(opts.start.getTime() + opts.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//swenlly//booking//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(opts.title)}`,
    `DESCRIPTION:${escape(
      opts.meetLink ? `${opts.description}\n\nקישור לפגישה: ${opts.meetLink}` : opts.description
    )}`,
    // LOCATION is what calendar apps turn into a join button.
    ...(opts.meetLink ? [`LOCATION:${escape(opts.meetLink)}`] : []),
    `ORGANIZER;CN=swenlly:mailto:${opts.organizerEmail}`,
    `ATTENDEE;CN=${escape(opts.attendeeEmail)};RSVP=TRUE:mailto:${opts.attendeeEmail}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:תזכורת לפגישה",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n");
}
