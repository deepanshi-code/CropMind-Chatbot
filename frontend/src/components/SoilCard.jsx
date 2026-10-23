import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

const RATING_CLASS = { Low: "rating-low", Medium: "rating-medium", High: "rating-high" };
const RATING_KEY = { Low: "common.low", Medium: "common.medium", High: "common.high" };

// pH bands used on Indian Soil Health Cards: below 6.5 acidic, 6.5-7.5 neutral, above 7.5 alkaline.
const phBand = (ph) => (ph < 6.5 ? "soil.phAcidic" : ph <= 7.5 ? "soil.phNeutral" : "soil.phAlkaline");

/** The user's own Soil Health Card values (no made-up numbers). */
export default function SoilCard({ soilTest }) {
  const { t } = useLanguage();
  const hasData = soilTest && Object.keys(soilTest).length > 0;

  return (
    <div className="card npk-card">
      <div className="npk-header">
        <div className="npk-title-block">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--accent-green)" strokeWidth="2.5" fill="none" aria-hidden="true">
            <path d="M3 20h18M5 20c0-6 3-10 7-10s7 4 7 10M12 10V4M9 6l3-2 3 2"></path>
          </svg>
          <h3>{t("soil.title")}</h3>
        </div>
        {hasData && soilTest.ph !== undefined && (
          <span className="ph-badge">{t("soil.ph")} {soilTest.ph} ({t(phBand(soilTest.ph))})</span>
        )}
      </div>

      {!hasData ? (
        <div className="soil-empty">
          <p><strong>{t("soil.empty")}</strong></p>
          <p className="section-help">{t("soil.emptyText")}</p>
          <Link to="/profile#soil" className="btn-secondary">{t("soil.addButton")}</Link>
        </div>
      ) : (
        <>
          <dl className="soil-values">
            {[
              ["soil.nitrogen", soilTest.nitrogen, soilTest.nitrogenRating],
              ["soil.phosphorus", soilTest.phosphorus, soilTest.phosphorusRating],
              ["soil.potassium", soilTest.potassium, soilTest.potassiumRating],
            ].map(([label, value, rating]) => (
              <div key={label} className="soil-row">
                <dt>{t(label)}</dt>
                <dd>
                  {value !== undefined ? `${value} ${t("soil.kgha")}` : "–"}
                  {rating && <span className={`rating-pill ${RATING_CLASS[rating]}`}>{t(RATING_KEY[rating])}</span>}
                </dd>
              </div>
            ))}
            {soilTest.organicCarbon !== undefined && (
              <div className="soil-row">
                <dt>{t("soil.oc")}</dt>
                <dd>{soilTest.organicCarbon}%</dd>
              </div>
            )}
          </dl>
          <p className="widget-source">
            {soilTest.testedOn ? `${t("soil.testedOn")}: ${new Date(soilTest.testedOn).toLocaleDateString()} · ` : ""}
            <Link to="/profile#soil">{t("soil.editButton")}</Link>
          </p>
        </>
      )}
    </div>
  );
}
