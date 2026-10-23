import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

const CONTENT = {
  en: {
    title: "About CropMind",
    lead: "CropMind is a farming assistant built as a student capstone project. It brings together your own farm records, local weather data and a generative AI model, so you can get quick, practical guidance and decide what to check with an expert.",
    pillarsTitle: "What it does today",
    pillars: [
      ["Local conditions", "Shows a 3-day rain outlook and modelled soil moisture for your saved district (Open-Meteo weather model, not a sensor in your field)."],
      ["Crop advisor", "Suggests likely causes, treatment and prevention for symptoms you describe or photograph, taking your crop's age, soil test and local weather into account."],
      ["Farm records", "Keeps your crops, sowing dates, area and Soil Health Card values in one private place."],
      ["Sensors and prices", "Accepts readings from your own sensor devices, and shows Agmarknet mandi prices when the server is connected to data.gov.in."],
    ],
    limitsTitle: "What it does not do",
    limits: [
      "It is not a replacement for your Krishi Vigyan Kendra, agriculture officer or a soil testing lab.",
      "AI answers can be wrong. The accuracy of the diagnosis feature has not yet been formally evaluated.",
      "Weather and soil moisture are model estimates for your area, not measurements from your field.",
    ],
    techTitle: "Technology",
    devTitle: "Developer",
    devRole: "Full Stack Developer",
    devBio: "Developed CropMind as an internship capstone project, to explore how software and AI can support everyday farm decisions.",
    github: "GitHub Profile",
    email: "Contact Email",
  },
  hi: {
    title: "CropMind के बारे में",
    lead: "CropMind एक खेती सहायक है, जिसे एक छात्र के कैपस्टोन प्रोजेक्ट के रूप में बनाया गया है। यह आपके खेत के रिकॉर्ड, स्थानीय मौसम डेटा और एक जनरेटिव AI मॉडल को साथ लाता है, ताकि आपको जल्दी व्यावहारिक सलाह मिले और आप तय कर सकें कि किस बात की पुष्टि विशेषज्ञ से करनी है।",
    pillarsTitle: "यह अभी क्या करता है",
    pillars: [
      ["स्थानीय हालात", "आपके सहेजे गए ज़िले के लिए 3 दिन की बारिश की संभावना और अनुमानित मिट्टी की नमी दिखाता है (Open-Meteo मौसम मॉडल, आपके खेत का सेंसर नहीं)।"],
      ["फ़सल सलाहकार", "आपके बताए या फ़ोटो में दिखे लक्षणों के संभावित कारण, इलाज और बचाव बताता है, और फ़सल की उम्र, मिट्टी जाँच व स्थानीय मौसम को ध्यान में रखता है।"],
      ["खेत के रिकॉर्ड", "आपकी फ़सलें, बुवाई की तारीख़, रकबा और मृदा स्वास्थ्य कार्ड के मान एक निजी जगह पर रखता है।"],
      ["सेंसर और भाव", "आपके अपने सेंसर उपकरणों की रीडिंग लेता है, और सर्वर के data.gov.in से जुड़े होने पर एगमार्कनेट मंडी भाव दिखाता है।"],
    ],
    limitsTitle: "यह क्या नहीं करता",
    limits: [
      "यह आपके कृषि विज्ञान केंद्र, कृषि अधिकारी या मिट्टी जाँच लैब की जगह नहीं लेता।",
      "AI के जवाब गलत हो सकते हैं। जाँच (डायग्नोसिस) सुविधा की सटीकता का अभी औपचारिक मूल्यांकन नहीं हुआ है।",
      "मौसम और मिट्टी की नमी आपके इलाके के मॉडल अनुमान हैं, आपके खेत के माप नहीं।",
    ],
    techTitle: "तकनीक",
    devTitle: "डेवलपर",
    devRole: "फ़ुल स्टैक डेवलपर",
    devBio: "CropMind को इंटर्नशिप कैपस्टोन प्रोजेक्ट के रूप में बनाया, यह जानने के लिए कि सॉफ़्टवेयर और AI रोज़ के खेती फ़ैसलों में कैसे मदद कर सकते हैं।",
    github: "GitHub प्रोफ़ाइल",
    email: "ईमेल से संपर्क",
  },
};

const TECH = [["Frontend", "React 19 / Vite"], ["Backend", "Express 5 / Node.js"], ["AI", "Gemini 2.5 Flash"], ["Data", "MongoDB Atlas · Open-Meteo · Agmarknet"]];

export default function About() {
  const { language } = useLanguage();
  const c = CONTENT[language] || CONTENT.en;

  return (
    <div className="page about-page">
      <article className="card about-card">
        <h1>{c.title}</h1>
        <p className="lead">{c.lead}</p>

        <hr className="divider" />
        <h2>{c.pillarsTitle}</h2>
        <div className="features-list-grid">
          {c.pillars.map(([title, text]) => (
            <div key={title} className="feature-item">
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <hr className="divider" />
        <h2>{c.limitsTitle}</h2>
        <ul className="limits-list">
          {c.limits.map((item) => <li key={item}>{item}</li>)}
        </ul>

        <hr className="divider" />
        <h2>{c.techTitle}</h2>
        <div className="project-stats-grid">
          {TECH.map(([label, value]) => (
            <div key={label} className="stat-card">
              <span className="stat-label">{label}</span>
              <span className="stat-value">{value}</span>
            </div>
          ))}
        </div>

        <hr className="divider" />
        <h2>{c.devTitle}</h2>
        <div className="developer-profile-card">
          <div className="developer-avatar-container">
            <div className="developer-avatar" aria-hidden="true"><span>DA</span></div>
          </div>
          <div className="developer-info">
            <h3>Deepanshi Agarwal</h3>
            <p className="developer-title">{c.devRole}</p>
            <p className="developer-bio">{c.devBio}</p>
            <div className="developer-links">
              <a href="https://github.com/deepanshi-code" target="_blank" rel="noopener noreferrer" className="dev-link-btn github">{c.github}</a>
              <a href="mailto:deepanshiagarwal08@gmail.com" className="dev-link-btn email">{c.email}</a>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
