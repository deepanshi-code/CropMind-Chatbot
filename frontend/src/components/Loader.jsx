import React from "react";

export default function Loader({ text = "Loading data..." }) {
  return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p className="loader-text">{text}</p>
    </div>
  );
}
