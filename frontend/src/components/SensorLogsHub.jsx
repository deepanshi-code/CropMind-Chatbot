import React, { useState, useEffect, useRef } from "react";
import { getTelemetryLogs } from "../services/api";

const MAX_VISIBLE_LOGS = 50;

// Demo events shown until real sensor nodes post to /api/telemetry.
// They stay in the browser only and are never written to the database.
const SIMULATED_EVENTS = [
  { type: "info", text: "APMC Mandi: Wheat wholesale valuation refreshed (+₹30/Q)." },
  { type: "warning", text: "Node-1 (Thermal): Ambient temperature warning: 38.8°C." },
  { type: "success", text: "AI Engine: Hyperlocal weather advisory computed." },
  { type: "info", text: "Node-3 (Hydrology): Irrigation flow valve checked - closed." },
  { type: "info", text: "Node-2 (Soil): Nitrogen telemetry level verified at 65%." },
  { type: "warning", text: "Node-4 (Moisture): Low soil hydration threshold warning (45%)." }
];

const nowTime = () => new Date().toTimeString().split(" ")[0];

export default function SensorLogsHub() {
  const [logs, setLogs] = useState([
    { id: "sim-start", time: nowTime(), type: "system", text: "Simulated sensor stream started (demo data, not from real devices).", simulated: true }
  ]);

  const terminalBodyRef = useRef(null);

  useEffect(() => {
    // Scroll only the terminal, not the whole page.
    const body = terminalBodyRef.current;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // Load real logs recorded for this user, if any
    getTelemetryLogs()
      .then((data) => {
        if (data && data.length > 0) {
          setLogs((prev) => [...data, ...prev].slice(-MAX_VISIBLE_LOGS));
        }
      })
      .catch((err) => {
        console.error("Failed to load telemetry logs:", err);
      });
  }, []);

  useEffect(() => {
    let counter = 0;
    const interval = setInterval(() => {
      const event = SIMULATED_EVENTS[Math.floor(Math.random() * SIMULATED_EVENTS.length)];
      counter += 1;
      setLogs((prev) => [
        ...prev,
        { id: `sim-${Date.now()}-${counter}`, time: nowTime(), ...event, simulated: true }
      ].slice(-MAX_VISIBLE_LOGS));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getLogTypeClass = (type) => {
    if (type === "warning") return "log-warn";
    if (type === "success") return "log-success";
    return "log-info";
  };

  return (
    <div className="card terminal-card animate-fade-in-up">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <span className="terminal-title">IoT Telemetry Terminal Logs (simulated)</span>
      </div>
      <div className="terminal-body" ref={terminalBodyRef}>
        {logs.map((log) => (
          <div key={log.id} className="log-line">
            <span className="log-time">[{log.time}]</span>
            <span className={`log-badge ${getLogTypeClass(log.type)}`}>{log.simulated ? `sim·${log.type}` : log.type}</span>
            <span className="log-text">{log.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
