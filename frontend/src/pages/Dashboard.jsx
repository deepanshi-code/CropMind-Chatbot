import React, { useState, useEffect, useCallback } from "react";
import { getCrops, createCrop, deleteCrop, updateCrop, getProfile, errorMessage } from "../services/api";
import CropCard from "../components/CropCard";
import CropFields, { EMPTY_CROP } from "../components/CropFields";
import FieldConditions from "../components/FieldConditions";
import SoilCard from "../components/SoilCard";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

// Optional fields are sent only when filled in, so the server never receives "" for a date or number.
const cleanCrop = (values) => Object.fromEntries(
  Object.entries({ ...values, name: values.name.trim(), notes: values.notes?.trim() })
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
);

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [crops, setCrops] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(EMPTY_CROP);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile({}));
    getCrops()
      .then(setCrops)
      .catch((err) => notify("error", t("dash.toast.loadError"), errorMessage(err, t("common.error"))))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddCrop = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setIsSubmitting(true);
      const newCrop = await createCrop(cleanCrop(form));
      setCrops((prev) => [newCrop, ...prev]);
      setForm(EMPTY_CROP);
      notify("success", t("dash.toast.added"), t("dash.toast.addedText", { name: newCrop.name }));
    } catch (err) {
      notify("error", t("dash.toast.actionError"), errorMessage(err, t("common.error")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCrop = useCallback(async (id) => {
    try {
      await deleteCrop(id);
      setCrops((prev) => prev.filter((crop) => crop.id !== id));
      notify("success", t("dash.toast.removed"), "");
    } catch (err) {
      notify("error", t("dash.toast.actionError"), errorMessage(err, t("common.error")));
    }
  }, [notify, t]);

  const handleUpdateCrop = useCallback(async (id, values) => {
    try {
      const updated = await updateCrop(id, cleanCrop(values));
      setCrops((prev) => prev.map((crop) => (crop.id === id ? updated : crop)));
      notify("success", t("dash.toast.updated"), updated.name);
      return true;
    } catch (err) {
      notify("error", t("dash.toast.actionError"), errorMessage(err, t("common.error")));
      return false;
    }
  }, [notify, t]);

  const displayName = user?.name || user?.email || "";

  return (
    <div className="page dashboard-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="dashboard-header">
        <div className="dashboard-title-row">
          <div className="dashboard-title-col">
            <h1>{t("dash.title")}</h1>
            <p>{t("dash.subtitle")}</p>
          </div>
          {displayName && (
            <div className="user-profile-card-header">
              <div className="user-profile-avatar" aria-hidden="true">{displayName.substring(0, 2).toUpperCase()}</div>
              <div className="user-profile-info">
                <span className="user-profile-label">{t("dash.loggedInAs")}</span>
                <span className="user-profile-email">{displayName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile ? (
        <FieldConditions location={profile.location} onLocationChange={setProfile} />
      ) : (
        <Loader text={t("common.loading")} />
      )}

      <div className="dashboard-content-layout">
        <section className="dashboard-sidebar" aria-labelledby="add-crop-title">
          <div className="card form-card">
            <h2 id="add-crop-title">{t("dash.addCrop")}</h2>
            <form onSubmit={handleAddCrop}>
              <CropFields values={form} onChange={setForm} idPrefix="new-crop" />
              <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? t("dash.adding") : t("dash.addButton")}
              </button>
            </form>
          </div>
          <div className="spacer-24" />
          {profile && <SoilCard soilTest={profile.soilTest} />}
        </section>

        <section className="dashboard-main" aria-labelledby="my-crops-title">
          <div className="main-section-header">
            <h2 id="my-crops-title">{t("dash.myCrops")}</h2>
            {crops.length > 0 && <span className="registry-count">{t("dash.cropCount", { count: crops.length })}</span>}
          </div>

          {loading ? (
            <Loader text={t("dash.loadingCrops")} />
          ) : crops.length === 0 ? (
            <EmptyState title={t("dash.noCrops")} message={t("dash.noCropsText")} />
          ) : (
            <div className="crops-grid">
              {crops.map((crop) => (
                <CropCard key={crop.id} crop={crop} onDelete={handleDeleteCrop} onUpdate={handleUpdateCrop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
