const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv, isMatch, isAbstention, wilsonInterval, majorityBaseline, calibration } = require("../eval/scoring");

test("parseCsv handles quotes, embedded commas, newlines and BOM", () => {
  const csv = '﻿id,symptoms,label\r\n1,"yellow, then brown ""rings""",A\n2,"line one\nline two",B\n\n';
  assert.deepEqual(parseCsv(csv), [
    { id: "1", symptoms: 'yellow, then brown "rings"', label: "A" },
    { id: "2", symptoms: "line one\nline two", label: "B" },
  ]);
});

test("isMatch accepts the label or any alias, ignoring case and punctuation", () => {
  assert.equal(isMatch("Likely Rice Blast (fungal)", "rice blast"), true);
  assert.equal(isMatch("Magnaporthe oryzae infection", "Rice blast", ["Magnaporthe oryzae"]), true);
  assert.equal(isMatch("Bacterial leaf blight", "Rice blast"), false);
  assert.equal(isMatch("", "Rice blast"), false);
});

test("isAbstention detects the model's off-topic answer", () => {
  assert.equal(isAbstention("Insufficient or off-topic information"), true);
  assert.equal(isAbstention("Nitrogen deficiency"), false);
});

test("wilsonInterval gives a sensible 95% interval", () => {
  const [lo, hi] = wilsonInterval(30, 40);
  assert.ok(lo > 0.59 && lo < 0.61, `lo=${lo}`);
  assert.ok(hi > 0.85 && hi < 0.87, `hi=${hi}`);
  assert.deepEqual(wilsonInterval(0, 0), [0, 0]);
});

test("majorityBaseline and calibration", () => {
  assert.deepEqual(majorityBaseline(["A", "a", "B"]), { label: "a", accuracy: 2 / 3 });
  const bands = calibration([
    { confidence: 90, correct: true },
    { confidence: 95, correct: false },
    { confidence: 40, correct: false },
  ]);
  assert.deepEqual(bands.find((b) => b.band === "85-100"), { band: "85-100", n: 2, accuracy: 0.5 });
  assert.deepEqual(bands.find((b) => b.band === "0-50"), { band: "0-50", n: 1, accuracy: 0 });
});
