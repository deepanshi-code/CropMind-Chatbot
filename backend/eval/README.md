# Evaluating the crop diagnosis feature

This folder measures how often `/api/ai/diagnose` names the right problem. It runs the
same prompt and parsing code as the live app (`services/diagnosis.js`).

Nothing here is pre-filled. **The case file must come from real, citable sources.** A test
set with labels you invented or wrote from memory measures nothing, and presenting it as
an evaluation would be misleading.

## 1. Build the case file

```bash
cp eval/cases.template.csv eval/cases.csv
```

One row per case:

| Column | Meaning |
|---|---|
| `id` | Unique id, e.g. `rice-blast-01` |
| `crop` | Crop name as a farmer would type it |
| `symptoms` | Symptom description **in the source's own observable terms** (what is seen, not the disease name) |
| `soil_type`, `watering` | Optional, only if the source states them |
| `expected_diagnosis` | The label the source gives |
| `accepted_aliases` | Other names for the same problem, separated by `|` (e.g. `Leaf blast|Magnaporthe oryzae`) |
| `source` | Where the label comes from: URL, publication, or expert name + date. **Required** |

Good sources:
- ICAR institute and state agricultural university crop-protection pages and extension bulletins
- TNAU Agritech Portal crop-protection pages
- Advisories confirmed by a Krishi Vigyan Kendra (KVK) scientist
- For photo diagnosis later: labelled image datasets such as PlantVillage (cite the dataset and licence)

Guidelines:
- Aim for 30–50 cases first, across several crops and both disease and non-disease
  problems (nutrient deficiency, water stress, pests).
- Write symptoms without the disease name in them, otherwise the test leaks the answer.
- Have a second person (ideally an agronomy faculty member) check the labels.
- Keep the file under version control so results are reproducible.

## 2. Run it

```bash
node eval/run-eval.js --cases eval/cases.csv --delay 4000
```

Options: `--limit N` (first N cases), `--delay ms` (pause between calls, to respect quota),
`--out dir` (default `eval/results`). Every case calls the real Gemini API.

## 3. Read the results

The script prints and saves (`eval/results/`):

- **Top-1 accuracy with a 95% confidence interval.** With 40 cases the interval is wide
  (often ±15 points), so report the interval, not just the number.
- **Majority baseline:** the accuracy of always guessing the most common label. The model
  must clearly beat this to be useful.
- **Accuracy by self-reported confidence:** shows whether the model's `confidence` number
  means anything. If accuracy doesn't rise with confidence, don't show that number to farmers as reliable.
- **Per-crop accuracy:** finds crops where the model is weak.
- **`results-*.csv`:** automatic matching is strict substring matching, so open it, check every
  `MISS` row by hand, and fill `manual_correct`. Report the manually reviewed figure.

Useful failure analysis for a report: group the misses by type (wrong disease, right disease
with wrong name, deficiency confused with disease, refusal).
