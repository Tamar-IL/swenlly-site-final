/**
 * Runs once when the server boots. Starts the reminder sweep so meetings booked
 * before the last restart still get their hour-before email.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureReminderLoop } = await import("./lib/reminders");
  ensureReminderLoop();
}
