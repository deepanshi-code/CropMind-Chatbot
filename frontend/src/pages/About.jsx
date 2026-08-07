import React from "react";

export default function About() {
  return (
    <div className="page about-page">
      <div className="card about-card animate-fade-in-up">
        <h1>About CropMind</h1>
        <p className="lead">
          CropMind is an advanced smart agricultural intelligence platform designed to 
          empower modern farming decisions with technology. By connecting real-time local telemetry 
          with state-of-the-art Generative AI models, we deliver actionable insights directly to the fields.
        </p>

        <hr className="divider" />

        <h2>Core Intelligence Pillars</h2>
        <div className="features-list-grid">
          <div className="feature-item animate-fade-in-up delay-1">
            <div className="feature-item-header">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41"></path>
                <path d="M15.3 14.8A6 6 0 1 1 10 4.2a6 6 0 0 1 5.3 10.6Z"></path>
              </svg>
              <h3>Weather-Aware Planning</h3>
            </div>
            <p>Go beyond general weather forecasts. Get precise windows for planting, spraying, fertilizing, and harvesting based on local microclimate predictions.</p>
          </div>

          <div className="feature-item animate-fade-in-up delay-2">
            <div className="feature-item-header">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M7 20h10M12 20V10M12 10a6 6 0 0 1 6-6M12 10a6 6 0 0 0-6-6"></path>
              </svg>
              <h3>Crop Diagnostic Advisory</h3>
            </div>
            <p>Consult CropMind AI on disease symptoms, weed management, and soil imbalances. Receive instant guidance on safe, ecological, and chemical interventions.</p>
          </div>

          <div className="feature-item animate-fade-in-up delay-3">
            <div className="feature-item-header">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
              </svg>
              <h3>Hydro-Efficiency</h3>
            </div>
            <p>Track soil moisture levels and calculate exact irrigation frequencies to conserve groundwater while optimizing crop hydration levels.</p>
          </div>

          <div className="feature-item animate-fade-in-up delay-4">
            <div className="feature-item-header">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              <h3>Market Valuation Insights</h3>
            </div>
            <p>Track wholesale crop pricing trends in nearby agricultural markets, helping you determine the absolute best timing to sell your yields.</p>
          </div>
        </div>

        <hr className="divider" />

        <h2>Our Vision</h2>
        <p className="vision-text">
          We aim to bridge the gap between traditional agricultural wisdom and modern deep tech. 
          By making artificial intelligence accessible, conversational, and practical, we strive to 
          improve crop yields, lower input costs, and enhance the livelihoods of farmers worldwide.
        </p>

        <hr className="divider" />

        <h2>Project Telemetry & Stats</h2>
        <div className="project-stats-grid">
          <div className="stat-card animate-fade-in-up delay-1">
            <span className="stat-label">Project Version</span>
            <span className="stat-value">v1.0.0</span>
          </div>
          <div className="stat-card animate-fade-in-up delay-2">
            <span className="stat-label">Frameworks</span>
            <span className="stat-value">React 19 / Express 5</span>
          </div>
          <div className="stat-card animate-fade-in-up delay-3">
            <span className="stat-label">AI Engine</span>
            <span className="stat-value">Gemini 2.5 Flash</span>
          </div>
          <div className="stat-card animate-fade-in-up delay-4">
            <span className="stat-label">Database</span>
            <span className="stat-value">MongoDB Atlas</span>
          </div>
        </div>

        <hr className="divider" />

        <h2>Meet the Developer</h2>
        <div className="developer-profile-card animate-fade-in-up delay-2">
          <div className="developer-avatar-container">
            <div className="developer-avatar">
              <span>DA</span>
            </div>
          </div>
          <div className="developer-info">
            <h3>Deepanshi Agarwal</h3>
            <p className="developer-title">Full Stack Developer & AI Solutions Engineer</p>
            <p className="developer-bio">
              Passionate about leveraging modern software engineering, web technologies, and artificial intelligence
              to solve real-world problems. Developed CropMind as an internship capstone project to empower farmers
              with smart, data-driven agricultural advisory tools.
            </p>
            <div className="developer-links">
              <a href="https://github.com/deepanshi-code" target="_blank" rel="noopener noreferrer" className="dev-link-btn github">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
                GitHub Profile
              </a>
              <a href="mailto:deepanshiagarwal08@gmail.com" className="dev-link-btn email">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Contact Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
