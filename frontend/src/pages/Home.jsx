import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

const FEATURES = [
  ["home.f1", "M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 16v6M12 18v4M16 16v6"],
  ["home.f2", "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM9 12l2 2 4-4"],
  ["home.f3", "M3 20h18M5 20c0-6 3-10 7-10s7 4 7 10M12 10V4"],
];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const notice = location.state?.notice;

  return (
    <div className="home-container">
      {notice && <p className="state-message success-message page-notice" role="status">{notice}</p>}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <span className="badge-featured">{t("home.badge")}</span>
          <h1 id="hero-title">{t("home.title")}</h1>
          <p>{t("home.subtitle")}</p>
          <div className="hero-actions">
            <button type="button" onClick={() => navigate("/dashboard")} className="btn-primary">{t("home.launch")}</button>
            <button type="button" onClick={() => navigate("/about")} className="btn-secondary">{t("home.learn")}</button>
          </div>
        </div>
      </section>

      <section className="features-section" aria-labelledby="features-title">
        <div className="section-header">
          <h2 id="features-title">{t("home.featuresTitle")}</h2>
          <p>{t("home.featuresSub")}</p>
        </div>
        <div className="cards grid-3">
          {FEATURES.map(([key, path]) => (
            <div key={key} className="card feature-card">
              <div className="feature-icon-container" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none"><path d={path}></path></svg>
              </div>
              <h3>{t(`${key}.title`)}</h3>
              <p>{t(`${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
