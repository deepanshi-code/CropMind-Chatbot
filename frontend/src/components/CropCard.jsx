import React, { useState, memo } from "react";
import { Link } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import CropFields from "./CropFields";
import { useLanguage } from "../i18n/LanguageContext";

const DAY_MS = 24 * 3600 * 1000;

const seasonClass = (season) => {
  const s = (season || "").toLowerCase();
  if (s.includes("rabi")) return "rabi";
  if (s.includes("kharif")) return "kharif";
  if (s.includes("zaid")) return "zaid";
  return "other";
};

const toForm = (crop) => ({
  name: crop.name,
  season: crop.season,
  water: crop.water,
  sowingDate: crop.sowingDate ? new Date(crop.sowingDate).toISOString().slice(0, 10) : "",
  areaAcres: crop.areaAcres ?? "",
  notes: crop.notes ?? "",
});

const CropCard = memo(function CropCard({ crop, onDelete, onUpdate }) {
  const { t, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(crop));
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const kind = seasonClass(crop.season);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const ok = await onUpdate?.(crop.id, { ...form, name: form.name.trim() });
    if (ok !== false) setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`card crop-card edit-mode badge-${kind}-active`}>
        <form onSubmit={handleSave} aria-label={`${t("common.edit")} ${crop.name}`}>
          <CropFields values={form} onChange={setForm} idPrefix={`edit-${crop.id}`} compact />
          <div className="button-row">
            <button type="submit" className="btn-primary">{t("common.save")}</button>
            <button type="button" className="btn-secondary" onClick={() => { setForm(toForm(crop)); setIsEditing(false); }}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  let sownText = null;
  if (crop.sowingDate) {
    const date = new Date(crop.sowingDate);
    const days = Math.floor((Date.now() - date.getTime()) / DAY_MS);
    const formatted = date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
    sownText = days >= 0 ? `${formatted} (${t("crop.daysAgo", { days })})` : `${formatted} (${t("crop.planned")})`;
  }

  return (
    <>
      <article className={`card crop-card badge-${kind}-active`}>
        <div className="crop-card-header">
          <h3>{crop.name}</h3>
          <span className={`badge badge-${kind}`}>{t(`season.${crop.season}`)}</span>
        </div>
        <dl className="crop-card-body crop-facts">
          <div><dt>{t("crop.water")}</dt><dd>{t(`common.${crop.water.toLowerCase()}`)}</dd></div>
          {sownText && <div><dt>{t("crop.sown")}</dt><dd>{sownText}</dd></div>}
          {crop.areaAcres !== undefined && crop.areaAcres !== null && (
            <div><dt>{t("crop.area")}</dt><dd>{t("crop.acres", { value: crop.areaAcres })}</dd></div>
          )}
          {crop.notes && <div className="crop-notes"><dt className="visually-hidden">{t("dash.notes")}</dt><dd>{crop.notes}</dd></div>}
        </dl>
        <div className="crop-card-footer">
          <Link to={`/advisor?crop=${encodeURIComponent(crop.id)}`} className="text-link">
            {t("crop.askAdvisor")} <span aria-hidden="true">→</span>
          </Link>
          <div className="crop-card-icons">
            <button type="button" onClick={() => setIsEditing(true)} className="icon-button" aria-label={`${t("common.edit")} ${crop.name}`} title={t("common.edit")}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
            </button>
            {onDelete && (
              <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="icon-button danger" aria-label={`${t("common.remove")} ${crop.name}`} title={t("common.remove")}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"></path></svg>
              </button>
            )}
          </div>
        </div>
      </article>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={t("crop.confirmTitle")}
        message={t("crop.confirmText", { name: crop.name })}
        confirmText={t("common.remove")}
        cancelText={t("common.cancel")}
        onConfirm={async () => { setIsDeleteModalOpen(false); await onDelete?.(crop.id); }}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDanger={true}
      />
    </>
  );
});

export default CropCard;
