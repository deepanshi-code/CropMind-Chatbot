import React, { useState, useEffect } from "react";
import { getCrops, diagnoseCrop } from "../services/api";

export default function Advisor() {
  const [crops, setCrops] = useState([]);
  const [cropsLoading, setCropsLoading] = useState(false);

  // Form states
  const [selectedCrop, setSelectedCrop] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [soilType, setSoilType] = useState("Loamy");
  const [wateringFrequency, setWateringFrequency] = useState("Medium");

  // Status & Response states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Checked state for treatment plan items
  const [checkedTreatments, setCheckedTreatments] = useState({});

  // Error Toast auto-timer
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchCropsList();
  }, []);

  const fetchCropsList = async () => {
    try {
      setCropsLoading(true);
      const data = await getCrops();
      setCrops(data);
      if (data.length > 0) {
        setSelectedCrop(data[0].name);
      } else {
        setSelectedCrop("other");
      }
    } catch (err) {
      console.error("Failed to load registered crops:", err);
      setSelectedCrop("other");
    } finally {
      setCropsLoading(false);
    }
  };

  // Rotate loading text steps to simulate advanced soil diagnostics
  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "🌾 Compiling Registered Crop parameters & history...",
    "🔬 Cross-referencing leaf symptoms with botanical pathogen models...",
    "🌦 Querying soil irrigation telemetry data...",
    "💡 Generating optimized fertilizer and organic remedy instructions..."
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCropName = selectedCrop === "other" ? customCropName : selectedCrop;

    if (!finalCropName || !finalCropName.trim()) {
      triggerError("Crop name is required. Please select or enter a crop.");
      return;
    }
    if (!symptoms || !symptoms.trim()) {
      triggerError("Please detail the observed symptoms.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCheckedTreatments({});

    try {
      const data = await diagnoseCrop({
        cropName: finalCropName,
        symptoms,
        soilType,
        wateringFrequency
      });
      setResult(data);
    } catch (err) {
      console.error("AI diagnostics error:", err);
      const errMsg = err.response?.data?.message || "Failed to analyze symptoms. Make sure the backend is running.";
      triggerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = (msg) => {
    setError(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 6000);
  };

  const handleToggleTreatment = (index) => {
    setCheckedTreatments((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startNewDiagnosis = () => {
    setResult(null);
    setSymptoms("");
    setCustomCropName("");
    if (crops.length > 0) {
      setSelectedCrop(crops[0].name);
    } else {
      setSelectedCrop("other");
    }
  };

  return (
    <div className="page advisor-page">
      {/* Toast Alert Box */}
      {showToast && (
        <div className="toast-overlay animate-fade-in">
          <div className="toast-card error">
            <div className="toast-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="toast-content">
              <h4>System Diagnostics Error</h4>
              <p>{error}</p>
            </div>
            <button className="toast-close" onClick={() => setShowToast(false)} aria-label="Close Error">
              &times;
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-header animate-fade-in">
        <h1>AI Agronomist & Diagnostic Advisor</h1>
        <p>Analyze crop health, generate localized treatment plans, and inspect soil irrigation guidelines.</p>
      </div>

      <div className="dashboard-content-layout" style={{ marginTop: "24px" }}>
        {/* Left Column: Diagnostics Form */}
        <section className="dashboard-sidebar animate-fade-in-up delay-1">
          <div className="card form-card">
            <h2>Start Crop Diagnosis</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="select-crop">Select Crop to Inspect</label>
                {cropsLoading ? (
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Loading crop catalog...</div>
                ) : (
                  <select
                    id="select-crop"
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                  >
                    {crops.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.season})
                      </option>
                    ))}
                    <option value="other">+ Non-registered Crop</option>
                  </select>
                )}
              </div>

              {selectedCrop === "other" && (
                <div className="form-group animate-fade-in">
                  <label htmlFor="custom-crop">Enter Crop Name</label>
                  <input
                    id="custom-crop"
                    type="text"
                    placeholder="e.g. Cotton, Garlic, Mustard"
                    value={customCropName}
                    onChange={(e) => setCustomCropName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="soil-type">Soil Type</label>
                <select
                  id="soil-type"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                >
                  <option value="Alluvial">Alluvial</option>
                  <option value="Black Cotton">Black / Clayey Cotton Soil</option>
                  <option value="Red Sandy">Red / Sandy</option>
                  <option value="Loamy">Loamy</option>
                  <option value="Laterite">Laterite</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="watering-frequency">Watering / Irrigation</label>
                <select
                  id="watering-frequency"
                  value={wateringFrequency}
                  onChange={(e) => setWateringFrequency(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Twice a week">Twice a week</option>
                  <option value="Once a week">Once a week</option>
                  <option value="Sparse / Irregular">Sparse / Rainfed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="symptoms">Observed Symptoms / Farm Notes</label>
                <textarea
                  id="symptoms"
                  rows="4"
                  placeholder="e.g. Lower leaves turning yellow with brown rings, plant growth is stunted and flowers are dropping."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
                {isLoading ? "Running Diagnostics..." : "Analyze Health & Remedy"}
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Loading or Results */}
        <section className="dashboard-main animate-fade-in-up delay-2">
          {isLoading && (
            <div className="card loading-advisor-card">
              <div className="spinner"></div>
              <h3>AI Diagnostics Running</h3>
              <p className="loading-advisor-text">{loadingMessages[loadingStep]}</p>
              <div className="loading-bar-track">
                <div 
                  className="loading-bar-fill" 
                  style={{ width: `${(loadingStep + 1) * 25}%` }}
                ></div>
              </div>
            </div>
          )}

          {!isLoading && !result && (
            <div className="card empty-advisor-card">
              <div className="empty-icon-container">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.4 1.35-4.7 3.5-6"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3>Advisor Core Idle</h3>
              <p>Fill out the diagnostic panel on the left to request a crop analysis. The AI agronomist will diagnose likely diseases and outline a detailed organic/chemical treatment checklist.</p>
            </div>
          )}

          {!isLoading && result && (
            <div className="advisor-results animate-fade-in">
              {/* Diagnostic Overview */}
              <div className="card result-header-card">
                <div className="result-meta-top">
                  <span className="badge-featured">Diagnosis Report</span>
                  <button className="btn-secondary btn-sm" onClick={startNewDiagnosis} style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}>
                    Start New Analysis
                  </button>
                </div>
                
                <h2>{result.diagnosis}</h2>
                
                <div className="indicators-row">
                  <div className="indicator-pill">
                    <span className="label">Severity</span>
                    <span className={`badge-severity ${result.severity?.toLowerCase() || "medium"}`}>
                      {result.severity}
                    </span>
                  </div>
                  <div className="indicator-pill">
                    <span className="label">AI Confidence</span>
                    <div className="confidence-meter-container">
                      <div className="confidence-track">
                        <div 
                          className="confidence-fill" 
                          style={{ width: `${result.confidence || 50}%` }}
                        ></div>
                      </div>
                      <span className="confidence-value">{result.confidence || 50}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Treatment Checklist Card */}
              <div className="card detail-advisor-card" style={{ marginTop: "24px" }}>
                <div className="card-heading-block">
                  <div className="icon-wrap green">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3>Suggested Treatment Plan</h3>
                </div>
                <p className="card-helper-text">Mark tasks as checked as you complete them on your farm.</p>
                
                <ul className="treatment-checklist">
                  {result.treatment && result.treatment.map((step, idx) => (
                    <li 
                      key={idx} 
                      className={`checklist-item ${checkedTreatments[idx] ? "completed" : ""}`}
                      onClick={() => handleToggleTreatment(idx)}
                    >
                      <div className="check-box">
                        {checkedTreatments[idx] && (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className="step-text">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preventive Measures & Soil Guidance Grid */}
              <div className="grid-2-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
                {/* Preventive Card */}
                <div className="card detail-advisor-card">
                  <div className="card-heading-block">
                    <div className="icon-wrap cyan">
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                    </div>
                    <h3>Preventive Measures</h3>
                  </div>
                  <ul className="info-bullets">
                    {result.prevention && result.prevention.map((bullet, idx) => (
                      <li key={idx}>
                        <span className="bullet-dot"></span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Soil & Irrigation Guidance */}
                <div className="card detail-advisor-card">
                  <div className="card-heading-block">
                    <div className="icon-wrap yellow">
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
                      </svg>
                    </div>
                    <h3>NPK & Water Guidance</h3>
                  </div>
                  <p className="guidance-paragraph">
                    {result.fertilizerIrrigationGuidance}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
