import React, { useState, useEffect, useRef } from "react";

export default function SensorLogsHub() {
  const [logs, setLogs] = useState([
    { id: 1, time: "20:40:01", type: "system", text: "Sensor logs initialized." },
    { id: 2, time: "20:40:15", type: "info", text: "Database: Registered crops catalog synced successfully." },
    { id: 3, time: "20:41:00", type: "success", text: "Node-2 (Soil): Moisture telemetry steady at 72%." }
  ]);

  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    const mockEvents = [
      { type: "info", text: "APMC Mandi: Wheat wholesale valuation refreshed (+₹30/Q)." },
      { type: "warning", text: "Node-1 (Thermal): Ambient temperature warning: 38.8°C." },
      { type: "success", text: "AI Engine: Hyperlocal weather advisory computed." },
      { type: "info", text: "Node-3 (Hydrology): Irrigation flow valve checked - closed." },
      { type: "success", text: "System: Local SQLite database backup complete." },
      { type: "info", text: "Node-2 (Soil): Nitrogen telemetry level verified at 65%." },
      { type: "warning", text: "Node-4 (Moisture): Low soil hydration threshold warning (45%)." }
    ];

    const interval = setInterval(() => {
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          time: timeStr,
          type: randomEvent.type,
          text: randomEvent.text
        }
      ]);
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
        <span className="terminal-title">IoT Telemetry Terminal Logs</span>
      </div>
      <div className="terminal-body">
        {logs.map((log) => (
          <div key={log.id} className="log-line">
            <span className="log-time">[{log.time}]</span>
            <span className={`log-badge ${getLogTypeClass(log.type)}`}>{log.type}</span>
            <span className="log-text">{log.text}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
