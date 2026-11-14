import assert from "node:assert/strict";
import test from "node:test";
import {
  getRequiredRestMinutes,
  intervalOverlaps,
  isValidDate,
  makeDutyInterval
} from "../src/services/unlinkedDutyService.js";

test("validates calendar dates before building duty intervals", () => {
  assert.equal(isValidDate("2026-03-19"), true);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("19-03-2026"), false);
  assert.match(makeDutyInterval("2026-02-30", "08:00", "16:00").error, /valid calendar date/);
});

test("converts Delhi-local duty times to UTC and handles overnight shifts", () => {
  const interval = makeDutyInterval("2026-03-19", "22:00", "06:00");
  assert.equal(interval.start.toISOString(), "2026-03-19T16:30:00.000Z");
  assert.equal(interval.end.toISOString(), "2026-03-20T00:30:00.000Z");
  assert.equal(interval.durationMinutes, 480);
});

test("rejects duties outside the supported duration and invalid clock times", () => {
  assert.match(makeDutyInterval("2026-03-19", "06:00", "15:00").error, /between 30 minutes and 8 hours/);
  assert.match(makeDutyInterval("2026-03-19", "24:00", "06:00").error, /valid HH:mm/);
  assert.match(makeDutyInterval("2026-03-19", "08:00", "08:00").error, /different/);
});

test("identifies overlapping intervals while allowing back-to-back duties", () => {
  const first = makeDutyInterval("2026-03-19", "08:00", "12:00");
  const overlapping = makeDutyInterval("2026-03-19", "11:30", "14:00");
  const backToBack = makeDutyInterval("2026-03-19", "12:00", "16:00");
  assert.equal(intervalOverlaps(first.start, first.end, overlapping.start, overlapping.end), true);
  assert.equal(intervalOverlaps(first.start, first.end, backToBack.start, backToBack.end), false);
});

test("reads a configurable required rest duration and rejects invalid settings", () => {
  const previous = process.env.UNLINKED_DUTY_REST_MINUTES;
  try {
    delete process.env.UNLINKED_DUTY_REST_MINUTES;
    assert.equal(getRequiredRestMinutes(), 480);
    process.env.UNLINKED_DUTY_REST_MINUTES = "600";
    assert.equal(getRequiredRestMinutes(), 600);
    process.env.UNLINKED_DUTY_REST_MINUTES = "0";
    assert.throws(() => getRequiredRestMinutes(), /whole number between 1 and 1440/);
  } finally {
    if (previous === undefined) delete process.env.UNLINKED_DUTY_REST_MINUTES;
    else process.env.UNLINKED_DUTY_REST_MINUTES = previous;
  }
});
