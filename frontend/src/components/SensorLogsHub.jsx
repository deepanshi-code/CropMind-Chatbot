import React, { useState, useEffect, useRef } from "react";
import { getTelemetryLogs } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";

const MAX_VISIBLE_LOGS = 50;
const REFRESH_MS = 30000;

// Demo events, shown only when the user turns the demo stream on.
// They stay in the browser and are never written to the database.
const SIMULATED_EVENTS = [
  { type: "info", text: "Node-2 (Soil): Nitrogen telemetry level verified at 65%." },
  { type: "warning", text: "Node-1 (Thermal): Ambient temperature warning: 38.8°C." },
  { type: "info", text: "Node-3 (Hydrology): Irrigation flow valve checked - closed." },
  { type: "warning", text: "Node-4 (Moisture): Low soil hydration threshold warning (45%)." },
];

const nowTime = () => new Date().toTimeString().split(" ")[0];

const logClass = (type) => (type === "warning" ? "log-warn" : type === "success" ? "log-success" : "log-info");

/** Sensor log: real readings from the user's devices, plus an optional clearly-marked demo stream. */
export default function SensorLogsHub({ showDemo = false }) {
  const { t } = useLanguage();
  const [realLogs, setRealLogs] = useState(null);
  const [demoLogs, setDemoLogs] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => getTelemetryLogs()
      .then((data) => { if (!cancelled) setRealLogs(data); })
      .catch(() => { if (!cancelled) setRealLogs((prev) => prev || []); });
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!showDemo) {
      setDemoLogs([]);
      return undefined;
    }
    let counter = 0;
    const interval = setInterval(() => {
      counter += 1;
      const event = SIMULATED_EVENTS[Math.floor(Math.random() * SIMULATED_EVENTS.length)];
      setDemoLogs((prev) => [...prev, { id: `sim-${Date.now()}-${counter}`, time: nowTime(), ...event, simulated: true }].slice(-MAX_VISIBLE_LOGS));
    }, 5000);
    return () => clearInterval(interval);
  }, [showDemo]);

  const logs = [...(realLogs || []), ...demoLogs].slice(-MAX_VISIBLE_LOGS);

  useEffect(() => {
    // Scroll only the terminal, not the whole page.
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [logs.length]);

  return (
    <div className="card terminal-card">
      <div className="terminal-header">
        <div className="terminal-dots" aria-hidden="true">
          <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
        </div>
        <span className="terminal-title">{t("tele.logsTitle")}</span>
      </div>
      {showDemo && <p className="demo-note" role="note">{t("tele.demoNote")}</p>}
      <div className="terminal-body" ref={bodyRef} aria-live="polite">
        {realLogs === null ? (
          <p className="log-text">{t("common.loading")}</p>
        ) : logs.length === 0 ? (
          <div className="terminal-empty">
            <p className="log-text"><strong>{t("tele.empty")}</strong></p>
            <p className="log-text">{t("tele.emptyText")}</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-line">
              <span className="log-time">[{log.time}]</span>
              <span className={`log-badge ${logClass(log.type)}`}>{log.simulated ? `demo·${log.type}` : log.type}</span>
              {log.source && <span className="log-source">{log.source}:</span>}
              <span className="log-text">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
