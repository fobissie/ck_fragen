import { DateTime } from "luxon";

const BERLIN_ZONE = "Europe/Berlin";
const WEDNESDAY = 3;

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function toTwoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

export function getNextBerlinWednesdayDeadline(reference: Date = new Date()): Date {
  const berlinNow = DateTime.fromJSDate(reference).setZone(BERLIN_ZONE);
  const daysUntilWednesday = (WEDNESDAY - berlinNow.weekday + 7) % 7;

  let candidate = berlinNow.plus({ days: daysUntilWednesday }).set({
    hour: 4,
    minute: 44,
    second: 0,
    millisecond: 0,
  });

  if (candidate <= berlinNow) {
    candidate = candidate.plus({ weeks: 1 });
  }

  return candidate.toUTC().toJSDate();
}

export function getCountdownParts(
  deadline: Date,
  reference: Date = new Date(),
): CountdownParts {
  const diffMs = Math.max(deadline.getTime() - reference.getTime(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function formatCountdown(parts: CountdownParts): string {
  return `${parts.days}T ${toTwoDigits(parts.hours)}:${toTwoDigits(
    parts.minutes,
  )}:${toTwoDigits(parts.seconds)}`;
}

export function formatDeadlineForDisplay(deadline: Date): string {
  return DateTime.fromJSDate(deadline, { zone: "utc" })
    .setZone(BERLIN_ZONE)
    .setLocale("de")
    .toFormat("cccc, dd. LLLL yyyy 'um' HH:mm 'Uhr'");
}
