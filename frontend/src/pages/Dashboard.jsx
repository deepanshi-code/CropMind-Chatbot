import React, { useState, useEffect, useCallback } from "react";
import { getCrops, createCrop, deleteCrop, updateCrop } from "../services/api";
import CropCard from "../components/CropCard";
import SensorLogsHub from "../components/SensorLogsHub";
import FieldConditions from "../components/FieldConditions";
import NPKBarGauge from "../components/NPKBarGauge";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form states for creating new crop
  const [name, setName] = useState("");
  const [season, setSeason] = useState("Kharif");
  const [water, setWater] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const userEmail = user?.email || "";

  const showNotification = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const data = await getCrops();
      setCrops(data);
    } catch (err) {
      console.error(err);
      showNotification("error", "Catalog Loading Error", "Failed to load crops registry. Make sure backend service is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = useCallback(async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotification("error", "Validation Error", "Please provide a valid crop name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newCrop = await createCrop({ name: trimmedName, season, water });
      setCrops((prev) => [newCrop, ...prev]);
      setName("");
      setSeason("Kharif");
      setWater("Medium");
      showNotification("success", "Crop Registered", `Successfully added "${newCrop.name}" to registry.`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Action Failed", "Failed to register new crop. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, season, water]);

  const handleDeleteCrop = useCallback(async (id) => {
    const targetCrop = crops.find(c => c.id === id);
    try {
      await deleteCrop(id);
      setCrops((prev) => prev.filter((crop) => crop.id !== id));
      showNotification("success", "Crop Removed", `Successfully removed "${targetCrop?.name || 'crop'}" from catalog.`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Deletion Failed", "Failed to delete crop record.");
    }
  }, [crops]);

  const handleUpdateCrop = useCallback(async (id, updatedData) => {
    try {
      const updatedCrop = await updateCrop(id, updatedData);
      setCrops((prev) => prev.map((crop) => (crop.id === id ? updatedCrop : crop)));
      showNotification("success", "Crop Updated", `Updated details for "${updatedCrop.name}".`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Update Failed", "Failed to update crop record.");
    }
  }, []);

  return (
    <div className="page dashboard-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title-row">
          <div className="dashboard-title-col">
            <h1>Smart Farming Dashboard</h1>
            <p>Your registered crops catalog. Field conditions come from Open-Meteo forecasts and Agmarknet mandi data.</p>
          </div>
          {userEmail && (
            <div className="user-profile-card-header animate-fade-in-up">
              <div className="user-profile-avatar">
                {userEmail.substring(0, 2).toUpperCase()}
              </div>
              <div className="user-profile-info">
                <span className="user-profile-label">Logged in as</span>
                <span className="user-profile-email">{userEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live field conditions: modelled weather/soil data and mandi prices */}
      <FieldConditions />

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

        {/* Right Side: Crops List & Simulated IoT Telemetry Terminal Logs */}
        <section className="dashboard-main animate-fade-in-up delay-2">
          <div className="main-section-header">
            <h2>Registered Crop Registry</h2>
            {crops.length > 0 && <span className="registry-count">{crops.length} Crops</span>}
          </div>

          {loading ? (
            <Loader text="Loading crop catalog from database..." />
          ) : crops.length === 0 ? (
            <EmptyState
              title="No Crops Registered Yet"
              message="Your crop catalog is currently empty. Use the sidebar form on the left to add your first crop!"
            />
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
