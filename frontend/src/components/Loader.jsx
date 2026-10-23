import React from "react";

export default function Loader({ text = "Loading data..." }) {
  return (
    <div className="loader-container" role="status">
      <div className="spinner" aria-hidden="true"></div>
      <p className="loader-text">{text}</p>
    </div>
  );
}
