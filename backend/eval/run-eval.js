#!/usr/bin/env node
/**
 * Offline evaluation of the crop diagnosis feature against a labelled case file.
 *
 * Usage (from backend/):
 *   node eval/run-eval.js --cases eval/cases.csv [--limit 20] [--delay 4000] [--out eval/results]
 *
 * Each case calls the real Gemini API (uses GEMINI_API_KEY from backend/.env), so it costs quota.
 * See eval/README.md for how to build a trustworthy case file.
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const { runDiagnosis } = require("../services/diagnosis");
const { parseCsv, isMatch, isAbstention, wilsonInterval, majorityBaseline, calibration } = require("./scoring");

const REQUIRED_COLUMNS = ["id", "crop", "symptoms", "expected_diagnosis", "source"];

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1]]);
    return pairs;
  }, [])
);

const casesPath = path.resolve(args.cases || path.join(__dirname, "cases.csv"));
const limit = args.limit ? Number(args.limit) : Infinity;
const delayMs = Number(args.delay ?? 4000);
const outDir = path.resolve(args.out || path.join(__dirname, "results"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pct = (x) => (x === null ? "  n/a" : `${(x * 100).toFixed(1)}%`);
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

async function main() {
  if (!fs.existsSync(casesPath)) {
    console.error(`Case file not found: ${casesPath}\nCopy eval/cases.template.csv to eval/cases.csv and fill it in (see eval/README.md).`);
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in backend/.env; the evaluation needs the real model.");
    process.exit(1);
  }

  const cases = parseCsv(fs.readFileSync(casesPath, "utf8")).slice(0, limit);
  const missing = REQUIRED_COLUMNS.filter((col) => cases.length && !(col in cases[0]));
  if (cases.length === 0 || missing.length) {
    console.error(cases.length === 0 ? "No cases in file." : `Missing columns: ${missing.join(", ")}`);
    process.exit(1);
  }
  const unsourced = cases.filter((c) => !c.source);
  if (unsourced.length) {
    console.error(`Every case needs a source (where the label comes from). Missing for: ${unsourced.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`Evaluating ${cases.length} case(s) from ${casesPath}\n`);
  const results = [];
  for (const [index, c] of cases.entries()) {
    const aliases = (c.accepted_aliases || "").split("|").map((a) => a.trim()).filter(Boolean);
    const started = Date.now();
    let prediction = null;
    let error = null;
    try {
      prediction = await runDiagnosis({
        cropName: c.crop,
        symptoms: c.symptoms,
        soilType: c.soil_type || undefined,
        wateringFrequency: c.watering || undefined,
      });
    } catch (err) {
      error = err.message;
    }
    const predicted = prediction?.diagnosis || "";
    const result = {
      id: c.id,
      crop: c.crop,
      expected: c.expected_diagnosis,
      predicted,
      confidence: prediction?.confidence ?? null,
      correct: !error && isMatch(predicted, c.expected_diagnosis, aliases),
      abstained: !error && isAbstention(predicted),
      error,
      latencyMs: Date.now() - started,
    };
    results.push(result);
    const mark = result.error ? "ERR " : result.correct ? "OK  " : "MISS";
    console.log(`[${index + 1}/${cases.length}] ${mark} ${c.id}: expected "${c.expected_diagnosis}" | got "${predicted || error}"`);
    if (index < cases.length - 1) await sleep(delayMs);
  }

  const scored = results.filter((r) => !r.error);
  const correct = scored.filter((r) => r.correct).length;
  const [lo, hi] = wilsonInterval(correct, scored.length);
  const baseline = majorityBaseline(cases.map((c) => c.expected_diagnosis));
  const perCrop = [...new Set(scored.map((r) => r.crop))].map((crop) => {
    const rows = scored.filter((r) => r.crop === crop);
    return { crop, n: rows.length, accuracy: rows.filter((r) => r.correct).length / rows.length };
  });
  const meanConfidence = (rows) => (rows.length ? rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length : null);
  const summary = {
    casesFile: casesPath,
    runAt: new Date().toISOString(),
    total: results.length,
    errors: results.length - scored.length,
    accuracy: scored.length ? correct / scored.length : null,
    accuracy95CI: [lo, hi],
    abstentions: scored.filter((r) => r.abstained).length,
    majorityBaseline: baseline,
    meanConfidenceWhenCorrect: meanConfidence(scored.filter((r) => r.correct)),
    meanConfidenceWhenWrong: meanConfidence(scored.filter((r) => !r.correct)),
    calibration: calibration(scored),
    perCrop,
    medianLatencyMs: scored.length ? scored.map((r) => r.latencyMs).sort((a, b) => a - b)[Math.floor(scored.length / 2)] : null,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = summary.runAt.replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(outDir, `summary-${stamp}.json`), JSON.stringify({ summary, results }, null, 2));
  fs.writeFileSync(
    path.join(outDir, `results-${stamp}.csv`),
    ["id,crop,expected,predicted,confidence,auto_correct,manual_correct,error",
      ...results.map((r) => [r.id, r.crop, r.expected, r.predicted, r.confidence, r.correct, "", r.error].map(csvCell).join(","))
    ].join("\n")
  );

  console.log("\n================ SUMMARY ================");
  console.log(`Scored cases:         ${scored.length} (errors: ${summary.errors})`);
  console.log(`Top-1 accuracy:       ${pct(summary.accuracy)}  (95% CI ${pct(lo)} – ${pct(hi)})`);
  console.log(`Majority baseline:    ${pct(baseline.accuracy)}  (always "${baseline.label}")`);
  console.log(`Abstentions:          ${summary.abstentions}`);
  console.log(`Mean confidence:      correct ${summary.meanConfidenceWhenCorrect?.toFixed(1) ?? "n/a"} | wrong ${summary.meanConfidenceWhenWrong?.toFixed(1) ?? "n/a"}`);
  console.log("Accuracy by self-reported confidence:");
  for (const band of summary.calibration) console.log(`  ${band.band.padEnd(7)} n=${String(band.n).padEnd(4)} ${pct(band.accuracy)}`);
  console.log("Per crop:");
  for (const row of perCrop) console.log(`  ${row.crop.padEnd(16)} n=${String(row.n).padEnd(4)} ${pct(row.accuracy)}`);
  console.log(`\nAuto-matching is strict substring matching. Review MISS rows in results-${stamp}.csv and fill manual_correct before reporting numbers.`);
  console.log(`Saved to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
