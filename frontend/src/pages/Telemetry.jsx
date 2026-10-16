import React from "react";
import SensorLogsHub from "../components/SensorLogsHub";
import NPKBarGauge from "../components/NPKBarGauge";

export default function Telemetry() {
  return (
    <div className="page telemetry-page">
      <div className="dashboard-header animate-fade-in">
        <h1>IoT Telemetry Logs & Soil Chemistry</h1>
        <p>Real-time analytics and detailed diagnostics from farm telemetry nodes.</p>
      </div>

      <div className="dashboard-content-layout" style={{ marginTop: "24px" }}>
        <section className="dashboard-sidebar animate-fade-in-up delay-1">
          <NPKBarGauge />
        </section>
        
        <section className="dashboard-main animate-fade-in-up delay-2">
          <SensorLogsHub />
        </section>
      </div>
    </div>
  );
}
