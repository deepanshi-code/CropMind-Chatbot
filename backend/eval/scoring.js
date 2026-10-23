// Pure helpers for the diagnosis evaluation (unit-tested in tests/eval-scoring.test.js).

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), commas and newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()])));
}

const normalize = (text) => String(text || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

/**
 * A prediction counts as correct if the expected label or any accepted alias appears in the
 * predicted diagnosis text. Deliberately simple and strict; review mismatches by hand
 * (the results CSV has a manual_correct column for that).
 */
function isMatch(predicted, expected, aliases = []) {
  const p = normalize(predicted);
  if (!p) return false;
  return [expected, ...aliases].map(normalize).filter(Boolean).some((label) => p.includes(label));
}

const isAbstention = (predicted) => normalize(predicted).includes("insufficient or off topic");

/** Wilson score interval: honest uncertainty for an accuracy measured on a small sample. */
function wilsonInterval(successes, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Accuracy of always predicting the most common label: the minimum a model must beat. */
function majorityBaseline(expectedLabels) {
  if (expectedLabels.length === 0) return { label: null, accuracy: 0 };
  const counts = new Map();
  for (const label of expectedLabels.map(normalize)) counts.set(label, (counts.get(label) || 0) + 1);
  const [label, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { label, accuracy: count / expectedLabels.length };
}

/** Accuracy per self-reported confidence band: is the model's "confidence" informative at all? */
function calibration(results, bands = [[0, 50], [50, 70], [70, 85], [85, 101]]) {
  return bands.map(([lo, hi]) => {
    const inBand = results.filter((r) => r.confidence >= lo && r.confidence < hi);
    const correct = inBand.filter((r) => r.correct).length;
    return { band: `${lo}-${Math.min(hi, 100)}`, n: inBand.length, accuracy: inBand.length ? correct / inBand.length : null };
  });
}

module.exports = { parseCsv, normalize, isMatch, isAbstention, wilsonInterval, majorityBaseline, calibration };
