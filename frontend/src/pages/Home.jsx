import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-content animate-fade-in-up">
          <span className="badge-featured">AI-Powered Farming Intelligence</span>
          <h1>Empower Your Fields with CropMind</h1>
          <p>
            Get real-time insights on crop health, weather forecasts, and market trends
            using next-generation generative AI.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate("/dashboard")} className="btn-primary">
              Launch Dashboard
            </button>
            <button onClick={() => navigate("/about")} className="btn-secondary">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-header animate-fade-in">
          <h2>Farming Capabilities</h2>
          <p>Tools designed to increase yield, conserve water, and boost profits.</p>
        </div>

        <div className="cards grid-3">
          <div className="card feature-card animate-fade-in-up delay-1">
            <div className="feature-icon-container">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M18.61 21.28A6 6 0 1 0 6 20h12a4 4 0 0 0 .61-.72z"></path>
                <path d="M12 2v2M4.93 4.93l1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                <path d="M22 22a8 8 0 0 0-16 0"></path>
              </svg>
            </div>
            <h3>Weather Forecast</h3>
            <p>7-day hyperlocal forecast tailored specifically for farm planning and harvesting schedules.</p>
          </div>

          <div className="card feature-card animate-fade-in-up delay-2">
            <div className="feature-icon-container">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M7 20h10M12 20V10M12 10a6 6 0 0 1 6-6M12 10a6 6 0 0 0-6-6"></path>
              </svg>
            </div>
            <h3>Crop Advisories</h3>
            <p>Get instant recommendations on fertilizer usage, pest control, and soil enrichment.</p>
          </div>

          <div className="card feature-card animate-fade-in-up delay-3">
            <div className="feature-icon-container">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <h3>Market Prices</h3>
            <p>Stay ahead of fluctuations with live crop market prices across APMC mandis in India.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
