import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getCrops, diagnoseCrop, getDiagnoses, deleteDiagnosis, errorMessage } from "../services/api";
import Toast from "../components/Toast";
import { useLanguage } from "../i18n/LanguageContext";

const MAX_PHOTO_DIMENSION = 1280;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OTHER = "other";
const SOIL_TYPES = [["Alluvial", "soilType.Alluvial"], ["Black Cotton", "soilType.Black"], ["Red Sandy", "soilType.Red"], ["Loamy", "soilType.Loamy"], ["Laterite", "soilType.Laterite"]];
const WATERING = [["Daily", "watering.Daily"], ["Twice a week", "watering.Twice"], ["Once a week", "watering.Weekly"], ["Rainfed / irregular", "watering.Rainfed"]];

// Downscale and re-encode as JPEG in the browser: keeps uploads small on rural mobile data,
// and re-encoding drops EXIF metadata such as the GPS location of the farm.
const preparePhoto = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    resolve({ preview: dataUrl, mimeType: "image/jpeg", data: dataUrl.split(",")[1] });
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("unreadable"));
  };
  img.src = url;
});

function ResultView({ result, onNew }) {
  const { t } = useLanguage();
  const [done, setDone] = useState({});
  const severityKey = { High: "common.high", Medium: "common.medium", Low: "common.low" }[result.severity] || "common.medium";

  return (
    <div className="advisor-results" aria-live="polite">
      <div className="card result-header-card">
        <div className="result-meta-top">
          <span className="badge-featured">{t("adv.title")}</span>
          <button type="button" className="btn-secondary" onClick={onNew}>{t("adv.newCheck")}</button>
        </div>
        <h2>{result.diagnosis}</h2>
        <div className="indicators-row">
          <div className="indicator-pill">
            <span className="label">{t("adv.severity")}</span>
            <span className={`badge-severity ${(result.severity || "medium").toLowerCase()}`}>{t(severityKey)}</span>
          </div>
          {typeof result.confidence === "number" && result.confidence > 0 && (
            <div className="indicator-pill">
              <span className="label" title={t("adv.modelGuessHelp")}>{t("adv.modelGuess", { value: result.confidence })}</span>
            </div>
          )}
        </div>
        {result.usedFarmProfile && <p className="section-help">✓ {t("adv.usedProfile")}</p>}
        <p className="advice-disclaimer" role="note">⚠ {t("adv.disclaimer")}</p>
      </div>

      {result.treatment?.length > 0 && (
        <div className="card detail-advisor-card">
          <h3>{t("adv.treatment")}</h3>
          <ul className="treatment-checklist">
            {result.treatment.map((step, idx) => (
              <li key={idx} className={`checklist-item ${done[idx] ? "completed" : ""}`}>
                <label>
                  <input type="checkbox" checked={!!done[idx]} onChange={() => setDone((prev) => ({ ...prev, [idx]: !prev[idx] }))} />
                  <span className="step-text">{step}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-2-layout grid-2">
        {result.prevention?.length > 0 && (
          <div className="card detail-advisor-card">
            <h3>{t("adv.prevention")}</h3>
            <ul className="info-bullets">
              {result.prevention.map((bullet, idx) => <li key={idx}><span className="bullet-dot" aria-hidden="true"></span><span>{bullet}</span></li>)}
            </ul>
          </div>
        )}
        {result.fertilizerIrrigationGuidance && (
          <div className="card detail-advisor-card">
            <h3>{t("adv.guidance")}</h3>
            <p className="guidance-paragraph">{result.fertilizerIrrigationGuidance}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Advisor() {
  const { t, language: uiLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const [crops, setCrops] = useState([]);
  const [cropChoice, setCropChoice] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [soilType, setSoilType] = useState("Loamy");
  const [wateringFrequency, setWateringFrequency] = useState("Twice a week");
  const [language, setLanguage] = useState(uiLanguage);
  const [photo, setPhoto] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const showError = (title, message) => {
    setToast({ type: "error", title, message });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    const wanted = searchParams.get("crop");
    getCrops()
      .then((data) => {
        setCrops(data);
        setCropChoice(data.some((c) => c.id === wanted) ? wanted : data[0]?.id || OTHER);
      })
      .catch(() => setCropChoice(OTHER));
    getDiagnoses().then(setHistory).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setLanguage(uiLanguage); }, [uiLanguage]);

  useEffect(() => {
    if (!isLoading) return undefined;
    setLoadingStep(0);
    const interval = setInterval(() => setLoadingStep((prev) => Math.min(prev + 1, 2)), 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      showError(t("adv.photo"), t("adv.photoType"));
      return;
    }
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      showError(t("adv.photo"), t("adv.photoError"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fromCatalog = crops.find((c) => c.id === cropChoice);
    const cropName = fromCatalog ? fromCatalog.name : customCropName.trim();
    if (!cropName) return showError(t("adv.formTitle"), t("adv.needCrop"));
    if (!symptoms.trim() && !photo) return showError(t("adv.formTitle"), t("adv.needInput"));

    setIsLoading(true);
    setResult(null);
    try {
      const data = await diagnoseCrop({
        ...(fromCatalog ? { cropId: fromCatalog.id } : {}),
        cropName,
        symptoms: symptoms.trim(),
        soilType,
        wateringFrequency,
        language,
        ...(photo ? { image: { mimeType: photo.mimeType, data: photo.data } } : {}),
      });
      setResult(data);
      getDiagnoses().then(setHistory).catch(() => {});
    } catch (err) {
      showError(t("adv.title"), errorMessage(err, t("common.error")));
    } finally {
      setIsLoading(false);
    }
  };

  const startNew = () => {
    setResult(null);
    setSymptoms("");
    setPhoto(null);
  };

  const removeHistory = async (id) => {
    try {
      await deleteDiagnosis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      showError(t("adv.history"), errorMessage(err, t("common.error")));
    }
  };

  return (
    <div className="page advisor-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="dashboard-header">
        <h1>{t("adv.title")}</h1>
        <p>{t("adv.subtitle")}</p>
      </div>

      <div className="dashboard-content-layout">
        <section className="dashboard-sidebar" aria-labelledby="adv-form-title">
          <div className="card form-card">
            <h2 id="adv-form-title">{t("adv.formTitle")}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="select-crop">{t("adv.crop")}</label>
                <select id="select-crop" value={cropChoice} onChange={(e) => setCropChoice(e.target.value)}>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.name} – {t(`season.${c.season}`)}</option>)}
                  <option value={OTHER}>{t("adv.otherCrop")}</option>
                </select>
              </div>

              {cropChoice === OTHER && (
                <div className="form-group">
                  <label htmlFor="custom-crop">{t("adv.cropName")}</label>
                  <input id="custom-crop" value={customCropName} maxLength={60} required placeholder={t("dash.cropNamePh")} onChange={(e) => setCustomCropName(e.target.value)} />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="soil-type">{t("adv.soilType")}</label>
                  <select id="soil-type" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                    {SOIL_TYPES.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="watering-frequency">{t("adv.watering")}</label>
                  <select id="watering-frequency" value={wateringFrequency} onChange={(e) => setWateringFrequency(e.target.value)}>
                    {WATERING.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="symptoms">{t("adv.symptoms")}</label>
                <textarea id="symptoms" rows="4" maxLength={1500} placeholder={t("adv.symptomsPh")} value={symptoms} onChange={(e) => setSymptoms(e.target.value)}></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="crop-photo">{t("adv.photo")} <span className="optional">({t("common.optional")})</span></label>
                <div className="photo-upload">
                  <input id="crop-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} aria-describedby="photo-help" />
                  {photo && (
                    <>
                      <img src={photo.preview} alt="" className="photo-preview" />
                      <button type="button" className="photo-remove-btn" onClick={() => setPhoto(null)}>{t("adv.removePhoto")}</button>
                    </>
                  )}
                </div>
                <p id="photo-help" className="section-help">{t("adv.photoHelp")}</p>
              </div>

              <div className="form-group">
                <label htmlFor="advice-language">{t("adv.language")}</label>
                <select id="advice-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
                {isLoading ? t("adv.submitting") : t("adv.submit")}
              </button>
            </form>
          </div>
        </section>

        <section className="dashboard-main" aria-label={t("adv.title")}>
          {isLoading && (
            <div className="card loading-advisor-card" role="status">
              <div className="spinner" aria-hidden="true"></div>
              <p className="loading-advisor-text">{t(`adv.loading${loadingStep + 1}`)}</p>
            </div>
          )}

          {!isLoading && !result && (
            <div className="card empty-advisor-card">
              <h3>{t("adv.idleTitle")}</h3>
              <p>{t("adv.idleText")}</p>
            </div>
          )}

          {!isLoading && result && <ResultView result={result} onNew={startNew} />}

          <div className="card history-card">
            <h2>{t("adv.history")}</h2>
            {history.length === 0 ? (
              <p className="section-help">{t("adv.historyEmpty")}</p>
            ) : (
              <ul className="history-list">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" className="history-open" onClick={() => setResult({ ...h.result, usedFarmProfile: false })}>
                      <strong>{h.cropName}</strong>: {h.result?.diagnosis}
                      <span className="muted"> · {new Date(h.createdAt).toLocaleDateString()}{h.hadPhoto ? ` · ${t("adv.withPhoto")}` : ""}</span>
                    </button>
                    <button type="button" className="link-danger" onClick={() => removeHistory(h.id)} aria-label={t("adv.deleteCheck")}>
                      {t("common.delete")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
