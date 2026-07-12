import React, { useState, useEffect, useCallback } from "react";
import { getCrops, createCrop, deleteCrop, updateCrop } from "../services/api";
import CropCard from "../components/CropCard";
import SensorLogsHub from "../components/SensorLogsHub";
import PriceSparkline from "../components/PriceSparkline";
import NPKBarGauge from "../components/NPKBarGauge";

export default function Dashboard() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for creating new crop
  const [name, setName] = useState("");
  const [season, setSeason] = useState("Kharif");
  const [water, setWater] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const data = await getCrops();
      setCrops(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load crops registry. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const newCrop = await createCrop({ name, season, water });
      setCrops((prev) => [newCrop, ...prev]);
      setName("");
      setSeason("Kharif");
      setWater("Medium");
    } catch (err) {
      console.error(err);
      alert("Failed to add crop. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, season, water]);

  const handleDeleteCrop = useCallback(async (id) => {
    try {
      await deleteCrop(id);
      setCrops((prev) => prev.filter((crop) => crop.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete crop. Please try again.");
    }
  }, []);

  const handleUpdateCrop = useCallback(async (id, updatedData) => {
    try {
      const updatedCrop = await updateCrop(id, updatedData);
      setCrops((prev) => prev.map((crop) => (crop.id === id ? updatedCrop : crop)));
    } catch (err) {
      console.error(err);
      alert("Failed to update crop. Please try again.");
    }
  }, []);


  return (
    <div className="page dashboard-page">
      <div className="dashboard-header animate-fade-in">
        <h1>Smart Farming Dashboard</h1>
        <p>Real-time telemetry indicators and registered crops catalog.</p>
      </div>

      {/* Analytics / Metric Widgets */}
      <section className="widgets-grid grid-3">
        {/* Soil Moisture */}
        <div className="card widget-card animate-fade-in-up delay-1">
          <div className="widget-header">
            <div className="widget-title-block">
              <div className="widget-icon-container">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
                </svg>
              </div>
              <h3>Soil Moisture</h3>
            </div>
            <div className="pulse-container">
              <span className="pulse-dot"></span>
              <span className="pulse-text">Active</span>
            </div>
          </div>
          <div className="widget-value">72%</div>
          <p className="widget-meta">Optimal levels for Rabi wheat</p>
        </div>

        {/* Rain Probability */}
        <div className="card widget-card animate-fade-in-up delay-2">
          <div className="widget-header">
            <div className="widget-title-block">
              <div className="widget-icon-container">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path>
                  <line x1="8" y1="16" x2="8" y2="22"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="16" y1="16" x2="16" y2="22"></line>
                </svg>
              </div>
              <h3>Rain Probability</h3>
            </div>
            <div className="pulse-container">
              <span className="pulse-dot cyan"></span>
              <span className="pulse-text">Predictive</span>
            </div>
          </div>
          <div className="widget-value">40%</div>
          <p className="widget-meta cyan-text">Light showers expected in 2 days</p>
        </div>

        {/* Wheat Mandi Price */}
        <div className="card widget-card animate-fade-in-up delay-3">
          <div className="widget-header">
            <div className="widget-title-block">
              <div className="widget-icon-container emerald-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"></path>
                </svg>
              </div>
              <h3>Wheat Mandi Price</h3>
            </div>
            <div className="pulse-container">
              <span className="pulse-dot"></span>
              <span className="pulse-text">Market Live</span>
            </div>
          </div>
          <div className="widget-price-block">
            <div className="widget-value">₹2,450 <span className="mandi-unit">/ Q</span></div>
            <PriceSparkline />
          </div>
          <p className="widget-meta">+1.2% increase from yesterday</p>
        </div>
      </section>

      <div className="dashboard-content-layout">
        {/* Left Side: Register New Crop Form & NPK Soil Chemistry stats */}
        <section className="dashboard-sidebar animate-fade-in-up delay-1">
          <div className="card form-card">
            <h2>Register New Crop</h2>
            <form onSubmit={handleAddCrop}>
              <div className="form-group">
                <label htmlFor="crop-name" style={{ display: "flex", alignItems: "center" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: "6px", strokeWidth: "2.5" }}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"></path>
                  </svg>
                  Crop Name
                </label>
                <input
                  id="crop-name"
                  type="text"
                  placeholder="e.g. Cotton, Barley"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="crop-season" style={{ display: "flex", alignItems: "center" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: "6px", strokeWidth: "2.5" }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Growing Season
                </label>
                <select
                  id="crop-season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                >
                  <option value="Kharif">Kharif (Monsoon)</option>
                  <option value="Rabi">Rabi (Winter)</option>
                  <option value="Zaid">Zaid (Summer)</option>
                  <option value="Annual">Annual / Perennial</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="crop-water" style={{ display: "flex", alignItems: "center" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: "6px", strokeWidth: "2.5" }}>
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
                  </svg>
                  Water Requirement
                </label>
                <select
                  id="crop-water"
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? "Registering..." : "Add Crop to Registry"}
              </button>
            </form>
          </div>
          
          <div style={{ height: "24px" }} />
          <NPKBarGauge />
        </section>

        {/* Right Side: Crops List & Live IoT Telemetry Terminal Logs */}
        <section className="dashboard-main animate-fade-in-up delay-2">
          <div className="main-section-header">
            <h2>Registered Crop Registry</h2>
            {crops.length > 0 && <span className="registry-count">{crops.length} Crops</span>}
          </div>

          {loading ? (
            <div className="state-message">Loading crops registry...</div>
          ) : error ? (
            <div className="state-message error-message">{error}</div>
          ) : crops.length === 0 ? (
            <div className="state-message empty-message">
              No crops registered. Use the sidebar form to add your first crop!
            </div>
          ) : (
            <div className="crops-grid">
              {crops.map((crop) => (
                <CropCard key={crop.id} crop={crop} onDelete={handleDeleteCrop} onUpdate={handleUpdateCrop} />
              ))}
            </div>
          )}

          <div style={{ height: "32px" }} />
          <SensorLogsHub />
        </section>
      </div>
    </div>
  );
}
