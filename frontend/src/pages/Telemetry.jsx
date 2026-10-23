import React, { useState } from "react";
import { Link } from "react-router-dom";
import SensorLogsHub from "../components/SensorLogsHub";
import { useLanguage } from "../i18n/LanguageContext";

const EXAMPLE = `curl -X POST https://crop-mind-chatbot-frontend.vercel.app/api/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Key: cmd_YOUR_DEVICE_KEY" \\
  -d '{"time":"06:00:00","type":"info","text":"Soil moisture 31%"}'`;

export default function Telemetry() {
  const { t } = useLanguage();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="page telemetry-page">
      <div className="dashboard-header">
        <h1>{t("tele.title")}</h1>
        <p>{t("tele.subtitle")}</p>
      </div>

      <div className="dashboard-content-layout">
        <section className="dashboard-sidebar" aria-labelledby="connect-title">
          <div className="card">
            <h2 id="connect-title">{t("tele.connectTitle")}</h2>
            <p className="section-help">{t("tele.connectText")}</p>
            <pre className="code-block"><code>{EXAMPLE}</code></pre>
            <p className="section-help">
              <code>type</code>: info · success · warning · system. <code>text</code>: up to 300 characters.
            </p>
            <Link to="/profile#devices" className="btn-secondary">{t("tele.goProfile")}</Link>
          </div>
        </section>

        <section className="dashboard-main" aria-label={t("tele.logsTitle")}>
          <label className="toggle-row">
            <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} />
            {t("tele.demoToggle")}
          </label>
          <SensorLogsHub showDemo={showDemo} />
        </section>
      </div>
    </div>
  );
}
