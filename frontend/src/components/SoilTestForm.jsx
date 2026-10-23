import React, { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

const NUTRIENTS = [
  ["nitrogen", "nitrogenRating", "soil.nitrogen"],
  ["phosphorus", "phosphorusRating", "soil.phosphorus"],
  ["potassium", "potassiumRating", "soil.potassium"],
];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

/** Soil Health Card entry: values plus the rating printed on the card (not computed). */
export default function SoilTestForm({ initial = {}, onSubmit, onClear }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(() => ({
    nitrogen: initial?.nitrogen ?? "",
    phosphorus: initial?.phosphorus ?? "",
    potassium: initial?.potassium ?? "",
    nitrogenRating: initial?.nitrogenRating ?? "",
    phosphorusRating: initial?.phosphorusRating ?? "",
    potassiumRating: initial?.potassiumRating ?? "",
    ph: initial?.ph ?? "",
    organicCarbon: initial?.organicCarbon ?? "",
    testedOn: toDateInput(initial?.testedOn),
  }));
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="soil-form">
      <div className="soil-grid">
        {NUTRIENTS.map(([field, ratingField, label]) => (
          <fieldset key={field} className="soil-nutrient">
            <legend>{t(label)}</legend>
            <label htmlFor={`soil-${field}`} className="visually-hidden">{t(label)} ({t("soil.kgha")})</label>
            <div className="input-with-unit">
              <input id={`soil-${field}`} type="number" inputMode="decimal" min="0" max="5000" step="any" value={values[field]} onChange={set(field)} />
              <span aria-hidden="true">{t("soil.kgha")}</span>
            </div>
            <label htmlFor={`soil-${ratingField}`} className="small-label">{t("soil.rating")}</label>
            <select id={`soil-${ratingField}`} value={values[ratingField]} onChange={set(ratingField)}>
              <option value="">{t("soil.ratingNone")}</option>
              <option value="Low">{t("common.low")}</option>
              <option value="Medium">{t("common.medium")}</option>
              <option value="High">{t("common.high")}</option>
            </select>
          </fieldset>
        ))}
        <div className="form-group">
          <label htmlFor="soil-ph">{t("soil.ph")}</label>
          <input id="soil-ph" type="number" inputMode="decimal" min="0" max="14" step="0.1" value={values.ph} onChange={set("ph")} />
        </div>
        <div className="form-group">
          <label htmlFor="soil-oc">{t("soil.oc")} (%)</label>
          <input id="soil-oc" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={values.organicCarbon} onChange={set("organicCarbon")} />
        </div>
        <div className="form-group">
          <label htmlFor="soil-date">{t("soil.testedOn")}</label>
          <input id="soil-date" type="date" value={values.testedOn} onChange={set("testedOn")} />
        </div>
      </div>
      <p className="section-help">{t("soil.note")}</p>
      <div className="button-row">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("common.saving") : t("prof.soilSave")}</button>
        {onClear && <button type="button" className="btn-secondary" onClick={onClear}>{t("prof.soilClear")}</button>}
      </div>
    </form>
  );
}
