import React from "react";

export default function Loader({ text = "Fetching real-time telemetry data..." }) {
  return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p className="loader-text">{text}</p>
    </div>
  );
}
