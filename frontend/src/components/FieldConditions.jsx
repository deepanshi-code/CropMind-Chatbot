import React, { useCallback, useEffect, useState } from "react";
import { getWeatherInsight, getMandiInsight } from "../services/api";

const LOCATION_KEY = "cropmind_location";
const COMMODITIES = ["Wheat", "Paddy(Dhan)(Common)", "Maize", "Mustard", "Potato", "Onion", "Tomato"];

const readSavedLocation = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCATION_KEY));
    return saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon) ? saved : null;
  } catch {
    return null;
  }
};

const formatDay = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });

// Rough guidance from volumetric soil moisture (m³/m³ as %). Thresholds vary a lot with soil
// texture, so this is a hint, not an irrigation instruction.
const moistureHint = (pct) => {
  if (pct < 15) return "Dry topsoil, check whether irrigation is needed";
  if (pct < 30) return "Moderate moisture";
  return "Moist topsoil, irrigation likely not needed";
};

function WidgetHeader({ title, badge, icon, iconClass = "", dotClass = "" }) {
  return (
    <div className="widget-header">
      <div className="widget-title-block">
        <div className={`widget-icon-container ${iconClass}`}>{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="pulse-container">
        <span className={`pulse-dot ${dotClass}`}></span>
        <span className="pulse-text">{badge}</span>
      </div>
    </div>
  );
}

const dropIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
  </svg>
);
const rainIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path>
    <line x1="8" y1="16" x2="8" y2="22"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="16" y1="16" x2="16" y2="22"></line>
  </svg>
);
const tagIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"></path>
  </svg>
);

export default function FieldConditions() {
  const [location, setLocation] = useState(readSavedLocation);
  const [weather, setWeather] = useState(null);
  const [weatherState, setWeatherState] = useState(location ? "loading" : "needs-location");
  const [weatherError, setWeatherError] = useState("");

  const [commodity, setCommodity] = useState("Wheat");
  const [mandi, setMandi] = useState(null);
  const [mandiState, setMandiState] = useState("loading");
  const [mandiError, setMandiError] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setWeatherState("error");
      setWeatherError("This browser cannot share location.");
      return;
    }
    setWeatherState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Rounded to ~1 km; the exact farm location is never sent or stored.
        const next = { lat: Number(pos.coords.latitude.toFixed(2)), lon: Number(pos.coords.longitude.toFixed(2)) };
        try {
          localStorage.setItem(LOCATION_KEY, JSON.stringify(next));
        } catch {
          // storage unavailable; location still works for this visit
        }
        setLocation(next);
      },
      () => {
        setWeatherState("error");
        setWeatherError("Location permission was denied.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (!location) return;
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
        setWeatherError(err.response?.data?.message || "Weather service is unavailable.");
      });
    return () => { cancelled = true; };
  }, [location]);

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
          setMandiError(err.response?.data?.message || "Mandi price service is unavailable.");
        }
      });
    return () => { cancelled = true; };
  }, [commodity]);

  const nextRain = weather?.rain?.find((day) => day.probabilityPct !== null);

  const renderWeatherBody = (render) => {
    if (weatherState === "needs-location") {
      return (
        <>
          <div className="widget-value muted">Location needed</div>
          <button type="button" className="btn-secondary" onClick={requestLocation} style={{ marginTop: "8px" }}>
            Use my location
          </button>
        </>
      );
    }
    if (weatherState === "loading") return <div className="widget-value muted">Loading...</div>;
    if (weatherState === "error") {
      return (
        <>
          <div className="widget-value muted">Unavailable</div>
          <p className="widget-meta">{weatherError}</p>
          <button type="button" className="btn-secondary" onClick={requestLocation} style={{ marginTop: "8px" }}>
            Try again
          </button>
        </>
      );
    }
    return render();
  };

  return (
    <section className="widgets-grid grid-3">
      {/* Soil Moisture */}
      <div className="card widget-card animate-fade-in-up delay-1">
        <WidgetHeader title="Soil Moisture" badge="Modelled" icon={dropIcon} />
        {renderWeatherBody(() => (
          weather.soilMoisturePct === null ? (
            <div className="widget-value muted">No data</div>
          ) : (
            <>
              <div className="widget-value">{weather.soilMoisturePct}%</div>
              <p className="widget-meta">{moistureHint(weather.soilMoisturePct)}</p>
              <p className="widget-source">3–9 cm layer, Open-Meteo model estimate (not a field sensor)</p>
            </>
          )
        ))}
      </div>

      {/* Rain Probability */}
      <div className="card widget-card animate-fade-in-up delay-2">
        <WidgetHeader title="Rain Probability" badge="Forecast" icon={rainIcon} dotClass="cyan" />
        {renderWeatherBody(() => (
          nextRain ? (
            <>
              <div className="widget-value">{nextRain.probabilityPct}%</div>
              <p className="widget-meta cyan-text">
                {weather.rain.map((day) => `${formatDay(day.date)}: ${day.probabilityPct ?? "–"}%`).join(" · ")}
              </p>
              <p className="widget-source">Max daily probability, Open-Meteo forecast</p>
            </>
          ) : (
            <div className="widget-value muted">No data</div>
          )
        ))}
      </div>

      {/* Mandi Price */}
      <div className="card widget-card animate-fade-in-up delay-3">
        <WidgetHeader
          title="Mandi Price"
          badge={mandiState === "ready" ? "Agmarknet" : "Not live"}
          icon={tagIcon}
          iconClass="emerald-icon"
        />
        <select
          aria-label="Commodity"
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          style={{ marginBottom: "8px" }}
        >
          {COMMODITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {mandiState === "loading" && <div className="widget-value muted">Loading...</div>}
        {mandiState === "not-configured" && (
          <>
            <div className="widget-value muted">Not connected</div>
            <p className="widget-source">Server admin: add a free DATA_GOV_API_KEY from data.gov.in to show live prices.</p>
          </>
        )}
        {mandiState === "error" && (
          <>
            <div className="widget-value muted">Unavailable</div>
            <p className="widget-meta">{mandiError}</p>
          </>
        )}
        {mandiState === "ready" && (
          <>
            <div className="widget-value">
              ₹{mandi.medianModalPrice.toLocaleString("en-IN")} <span className="mandi-unit">/ Q</span>
            </div>
            <p className="widget-meta">
              Median modal price across {mandi.marketsReporting} market{mandi.marketsReporting === 1 ? "" : "s"}
              {mandi.latestArrivalDate ? ` · ${mandi.latestArrivalDate}` : ""}
            </p>
            <p className="widget-source">{mandi.source}</p>
          </>
        )}
      </div>
    </section>
  );
}
