import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWeatherInsight, getMandiInsight, updateProfile } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";

// Agmarknet commodity names as used by the data.gov.in mandi price dataset.
const COMMODITIES = [
  ["Wheat", "Wheat / गेहूँ"],
  ["Paddy(Dhan)(Common)", "Paddy / धान"],
  ["Maize", "Maize / मक्का"],
  ["Mustard", "Mustard / सरसों"],
  ["Potato", "Potato / आलू"],
  ["Onion", "Onion / प्याज़"],
  ["Tomato", "Tomato / टमाटर"],
];

const formatDay = (isoDate, language) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric" });

// Rough guidance from volumetric soil moisture. Thresholds vary a lot with soil texture,
// so this is a hint, not an irrigation instruction.
const moistureHintKey = (pct) => (pct < 15 ? "field.moistDry" : pct < 30 ? "field.moistMid" : "field.moistWet");

function WidgetHeader({ title, badge, icon, iconClass = "", dotClass = "" }) {
  return (
    <div className="widget-header">
      <div className="widget-title-block">
        <div className={`widget-icon-container ${iconClass}`} aria-hidden="true">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="pulse-container">
        <span className={`pulse-dot ${dotClass}`} aria-hidden="true"></span>
        <span className="pulse-text">{badge}</span>
      </div>
    </div>
  );
}

const icon = (d) => (
  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none"><path d={d}></path></svg>
);
const dropIcon = icon("M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z");
const rainIcon = icon("M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 16v6M12 18v4M16 16v6");
const tagIcon = icon("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01");

/**
 * Weather, soil moisture and mandi widgets.
 * @param {{ location?: {name: string, lat: number, lon: number}, onLocationChange?: (profile) => void }} props
 */
export default function FieldConditions({ location, onLocationChange }) {
  const { t, language } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [weatherState, setWeatherState] = useState(location ? "loading" : "needs-location");
  const [weatherError, setWeatherError] = useState("");

  const [commodity, setCommodity] = useState("Wheat");
  const [mandi, setMandi] = useState(null);
  const [mandiState, setMandiState] = useState("loading");
  const [mandiError, setMandiError] = useState("");

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setWeatherState("error");
      setWeatherError(t("common.error"));
      return;
    }
    setWeatherState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Rounded to ~1 km; the exact farm position is never sent or stored.
        const lat = Number(pos.coords.latitude.toFixed(2));
        const lon = Number(pos.coords.longitude.toFixed(2));
        try {
          const profile = await updateProfile({ location: { name: `${t("prof.myLocation")} (${lat}, ${lon})`, lat, lon } });
          onLocationChange?.(profile);
        } catch {
          setWeatherState("error");
          setWeatherError(t("common.error"));
        }
      },
      () => {
        setWeatherState("needs-location");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60 * 60 * 1000 }
    );
  };

  useEffect(() => {
    if (!location) {
      setWeatherState("needs-location");
      return undefined;
    }
    let cancelled = false;
    setWeatherState("loading");
    getWeatherInsight(location.lat, location.lon)
      .then((data) => {
        if (cancelled) return;
        setWeather(data);
        setWeatherState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setWeatherState("error");
        setWeatherError(err.response?.data?.message || t("common.error"));
      });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setMandiState("loading");
    getMandiInsight(commodity)
      .then((data) => {
        if (cancelled) return;
        setMandi(data);
        setMandiState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 503 && err.response.data?.configured === false) {
          setMandiState("not-configured");
        } else {
          setMandiState("error");
          setMandiError(err.response?.data?.message || t("common.error"));
        }
      });
    return () => { cancelled = true; };
  }, [commodity]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRain = weather?.rain?.find((day) => day.probabilityPct !== null);

  const renderWeatherBody = (render) => {
    if (weatherState === "needs-location") {
      return (
        <>
          <div className="widget-value muted">{t("field.locationNeeded")}</div>
          <div className="button-row">
            <Link to="/profile#location" className="btn-secondary">{t("field.setLocation")}</Link>
            <button type="button" className="btn-secondary" onClick={useBrowserLocation}>{t("field.useMyLocation")}</button>
          </div>
        </>
      );
    }
    if (weatherState === "loading") return <div className="widget-value muted">{t("common.loading")}</div>;
    if (weatherState === "error") {
      return (
        <>
          <div className="widget-value muted">{t("field.unavailable")}</div>
          <p className="widget-meta">{weatherError}</p>
        </>
      );
    }
    return render();
  };

  return (
    <section className="widgets-grid grid-3" aria-label={t("field.soilMoisture")}>
      <div className="card widget-card">
        <WidgetHeader title={t("field.soilMoisture")} badge={t("field.badgeModelled")} icon={dropIcon} />
        {renderWeatherBody(() => (
          weather.soilMoisturePct === null ? (
            <div className="widget-value muted">{t("field.noData")}</div>
          ) : (
            <>
              <div className="widget-value">{weather.soilMoisturePct}%</div>
              <p className="widget-meta">{t(moistureHintKey(weather.soilMoisturePct))}</p>
              <p className="widget-source">{t("field.for", { place: location.name })} · {t("field.moistureSource")}</p>
            </>
          )
        ))}
      </div>

      <div className="card widget-card">
        <WidgetHeader title={t("field.rain")} badge={t("field.badgeForecast")} icon={rainIcon} dotClass="cyan" />
        {renderWeatherBody(() => (
          nextRain ? (
            <>
              <div className="widget-value">{nextRain.probabilityPct}%</div>
              <p className="widget-meta cyan-text">
                {weather.rain.map((day) => `${formatDay(day.date, language)}: ${day.probabilityPct ?? "–"}%`).join(" · ")}
              </p>
              <p className="widget-source">{t("field.rainSource")}</p>
            </>
          ) : (
            <div className="widget-value muted">{t("field.noData")}</div>
          )
        ))}
      </div>

      <div className="card widget-card">
        <WidgetHeader
          title={t("field.mandi")}
          badge={mandiState === "ready" ? t("field.badgeLive") : t("field.badgeNotLive")}
          icon={tagIcon}
          iconClass="emerald-icon"
        />
        <label htmlFor="mandi-commodity" className="visually-hidden">{t("field.commodity")}</label>
        <select id="mandi-commodity" value={commodity} onChange={(e) => setCommodity(e.target.value)} className="compact-select">
          {COMMODITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {mandiState === "loading" && <div className="widget-value muted">{t("common.loading")}</div>}
        {mandiState === "not-configured" && (
          <>
            <div className="widget-value muted">{t("field.mandiNotConnected")}</div>
            <p className="widget-source">{t("field.mandiAdmin")}</p>
          </>
        )}
        {mandiState === "error" && (
          <>
            <div className="widget-value muted">{t("field.unavailable")}</div>
            <p className="widget-meta">{mandiError}</p>
          </>
        )}
        {mandiState === "ready" && (
          <>
            <div className="widget-value">
              ₹{mandi.medianModalPrice.toLocaleString("en-IN")} <span className="mandi-unit">/ Q</span>
            </div>
            <p className="widget-meta">
              {t("field.mandiMedian", { count: mandi.marketsReporting })}
              {mandi.latestArrivalDate ? ` · ${mandi.latestArrivalDate}` : ""}
            </p>
            <p className="widget-source">{mandi.source}</p>
          </>
        )}
      </div>
    </section>
  );
}
