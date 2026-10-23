import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

const SEASONS = ["Kharif", "Rabi", "Zaid", "Annual"];
const WATER = ["Low", "Medium", "High"];

export const EMPTY_CROP = { name: "", season: "Kharif", water: "Medium", sowingDate: "", areaAcres: "", notes: "" };

/** Crop form fields shared by the "add crop" form and the inline edit form. */
export default function CropFields({ values, onChange, idPrefix = "crop", compact = false }) {
  const { t } = useLanguage();
  const set = (field) => (e) => onChange({ ...values, [field]: e.target.value });
  const id = (field) => `${idPrefix}-${field}`;

  return (
    <div className={compact ? "crop-fields compact" : "crop-fields"}>
      <div className="form-group">
        <label htmlFor={id("name")}>{t("dash.cropName")}</label>
        <input id={id("name")} value={values.name} onChange={set("name")} placeholder={t("dash.cropNamePh")} maxLength={60} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={id("season")}>{t("dash.season")}</label>
          <select id={id("season")} value={values.season} onChange={set("season")}>
            {SEASONS.map((s) => <option key={s} value={s}>{t(`season.${s}`)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={id("water")}>{t("dash.water")}</label>
          <select id={id("water")} value={values.water} onChange={set("water")}>
            {WATER.map((w) => <option key={w} value={w}>{t(`common.${w.toLowerCase()}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={id("sowing")}>{t("dash.sowingDate")} <span className="optional">({t("common.optional")})</span></label>
          <input id={id("sowing")} type="date" value={values.sowingDate} onChange={set("sowingDate")} />
        </div>
        <div className="form-group">
          <label htmlFor={id("area")}>{t("dash.area")} <span className="optional">({t("common.optional")})</span></label>
          <input id={id("area")} type="number" inputMode="decimal" min="0" step="any" value={values.areaAcres} onChange={set("areaAcres")} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={id("notes")}>{t("dash.notes")} <span className="optional">({t("common.optional")})</span></label>
        <input id={id("notes")} value={values.notes} onChange={set("notes")} placeholder={t("dash.notesPh")} maxLength={300} />
      </div>
    </div>
  );
}
