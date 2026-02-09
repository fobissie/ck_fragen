import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  getCountdownParts,
  getNextBerlinWednesdayDeadline,
} from "./deadline";

describe("getNextBerlinWednesdayDeadline", () => {
  it("returns current week Wednesday at 04:44 Berlin time if still in the future", () => {
    const reference = new Date("2026-02-09T12:00:00.000Z");
    const deadline = getNextBerlinWednesdayDeadline(reference);

    expect(deadline.toISOString()).toBe("2026-02-11T03:44:00.000Z");
  });

  it("rolls to next week when Wednesday 04:44 is already passed", () => {
    const reference = new Date("2026-02-11T03:45:00.000Z");
    const deadline = getNextBerlinWednesdayDeadline(reference);

    expect(deadline.toISOString()).toBe("2026-02-18T03:44:00.000Z");
  });

  it("keeps 04:44 local Berlin time around DST periods", () => {
    const reference = new Date("2026-03-29T12:00:00.000Z");
    const deadline = getNextBerlinWednesdayDeadline(reference);
    const berlin = DateTime.fromJSDate(deadline, { zone: "utc" }).setZone(
      "Europe/Berlin",
    );

    expect(berlin.weekday).toBe(3);
    expect(berlin.hour).toBe(4);
    expect(berlin.minute).toBe(44);
  });
});

describe("getCountdownParts", () => {
  it("returns zero values when deadline is in the past", () => {
    const result = getCountdownParts(
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-02T00:00:00.000Z"),
    );

    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("splits remaining time into day/hour/minute/second", () => {
    const result = getCountdownParts(
      new Date("2026-02-04T01:02:03.000Z"),
      new Date("2026-02-02T00:00:00.000Z"),
    );

    expect(result).toEqual({ days: 2, hours: 1, minutes: 2, seconds: 3 });
  });
});
