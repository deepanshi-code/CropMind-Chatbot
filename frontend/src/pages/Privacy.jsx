import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

const UPDATED = "23 October 2026";
const CONTACT = "deepanshiagarwal08@gmail.com";

// Plain-language notice. This is a student project; the notice was written to be accurate about
// what the code does, but it has not been reviewed by a lawyer.
const CONTENT = {
  en: {
    title: "Privacy Notice",
    updated: `Last updated: ${UPDATED}`,
    intro: "CropMind is a student capstone project. This notice explains, in plain language, what the app stores about you, why, who else processes it, and how you can see or delete it. It is written with India's Digital Personal Data Protection Act, 2023 in mind.",
    sections: [
      ["What we store", [
        "Account: your email address, a securely hashed password (never the password itself), and the date you accepted this notice. If you sign in with Google, we use only your email address.",
        "Farm profile, only if you enter it: your name, an approximate farm location (rounded to about 1 km), Soil Health Card values, language preference.",
        "Your crops, your chat messages with the AI, and the results of crop checks. Photos you upload are sent to the AI for that one check and are not stored.",
        "Sensor devices you register (name and a hashed key) and the readings they send.",
      ]],
      ["Why", [
        "To run the features you use: showing your crops and local weather, and giving advice that fits your farm.",
        "To keep the service safe: your IP address is used briefly to limit repeated login attempts and abuse. Rate-limit records expire automatically within an hour.",
        "We do not sell your data, show ads, or use it for anything else.",
      ]],
      ["Who else processes it", [
        "Google (Gemini API) receives your questions, crop details, farm profile summary and any photo, to generate answers. Google's own terms apply to that processing.",
        "Open-Meteo receives your approximate coordinates to return weather. No name or email is sent.",
        "MongoDB Atlas stores the database; Render and Vercel host the app.",
        "Google Sign-In, if you choose it, confirms your email address.",
      ]],
      ["Cookies and local storage", [
        "One essential cookie keeps you logged in (httpOnly, so page scripts cannot read it). There are no advertising or tracking cookies.",
        "Your browser also remembers your language and theme choices on your device.",
      ]],
      ["How long", [
        "Your data is kept until you delete it or delete your account. Deleting your account removes your profile, crops, soil test, chats, checks, devices and sensor readings.",
      ]],
      ["Your choices", [
        "See, correct and download your data from My Farm → Your data.",
        "Delete individual crops, checks, chats or devices at any time, or delete your whole account from My Farm.",
        `Questions or requests: ${CONTACT}.`,
      ]],
      ["Important", [
        "AI advice can be wrong. Always confirm important decisions, especially pesticide or chemical use, with your local Krishi Vigyan Kendra or agriculture officer.",
      ]],
    ],
  },
  hi: {
    title: "गोपनीयता सूचना",
    updated: `अंतिम अपडेट: ${UPDATED}`,
    intro: "CropMind एक छात्र का कैपस्टोन प्रोजेक्ट है। यह सूचना सरल भाषा में बताती है कि ऐप आपके बारे में क्या सहेजता है, क्यों, और कौन-सी दूसरी सेवाएँ इसे इस्तेमाल करती हैं, और आप इसे कैसे देख या मिटा सकते हैं। इसे भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 को ध्यान में रखकर लिखा गया है।",
    sections: [
      ["हम क्या सहेजते हैं", [
        "खाता: आपका ईमेल पता, सुरक्षित रूप से हैश किया गया पासवर्ड (असली पासवर्ड कभी नहीं), और यह सूचना स्वीकार करने की तारीख़। Google से लॉगिन करने पर हम सिर्फ़ आपके ईमेल का इस्तेमाल करते हैं।",
        "खेत प्रोफ़ाइल, सिर्फ़ अगर आप भरें: आपका नाम, खेत का अनुमानित स्थान (लगभग 1 किमी तक), मृदा स्वास्थ्य कार्ड के मान, भाषा।",
        "आपकी फ़सलें, AI के साथ आपकी चैट, और फ़सल जाँच के नतीजे। आपकी अपलोड की गई फ़ोटो सिर्फ़ उस जाँच के लिए AI को भेजी जाती है और सहेजी नहीं जाती।",
        "आपके जोड़े गए सेंसर उपकरण (नाम और हैश की गई कुंजी) और उनकी भेजी रीडिंग।",
      ]],
      ["क्यों", [
        "आपके इस्तेमाल की सुविधाएँ चलाने के लिए: आपकी फ़सलें और स्थानीय मौसम दिखाना, और आपके खेत के हिसाब से सलाह देना।",
        "सेवा सुरक्षित रखने के लिए: बार-बार लॉगिन की कोशिश और दुरुपयोग रोकने के लिए आपका IP पता थोड़े समय के लिए इस्तेमाल होता है; ये रिकॉर्ड एक घंटे के भीतर अपने-आप मिट जाते हैं।",
        "हम आपका डेटा बेचते नहीं, विज्ञापन नहीं दिखाते, और किसी और काम में इस्तेमाल नहीं करते।",
      ]],
      ["और कौन इसे इस्तेमाल करता है", [
        "Google (Gemini API) जवाब बनाने के लिए आपके सवाल, फ़सल की जानकारी, खेत प्रोफ़ाइल का सार और फ़ोटो पाता है। उस पर Google की अपनी शर्तें लागू होती हैं।",
        "Open-Meteo मौसम बताने के लिए आपके अनुमानित निर्देशांक पाता है; नाम या ईमेल नहीं भेजा जाता।",
        "MongoDB Atlas डेटाबेस रखता है; Render और Vercel ऐप चलाते हैं।",
        "Google लॉगिन चुनने पर Google आपके ईमेल की पुष्टि करता है।",
      ]],
      ["कुकी और लोकल स्टोरेज", [
        "एक ज़रूरी कुकी आपको लॉगिन रखती है (httpOnly, इसलिए पेज की स्क्रिप्ट इसे पढ़ नहीं सकती)। कोई विज्ञापन या ट्रैकिंग कुकी नहीं है।",
        "आपका ब्राउज़र आपकी भाषा और थीम की पसंद आपके उपकरण पर याद रखता है।",
      ]],
      ["कितने समय तक", [
        "आपका डेटा तब तक रहता है जब तक आप उसे या अपना खाता न मिटाएँ। खाता मिटाने पर प्रोफ़ाइल, फ़सलें, मिट्टी जाँच, चैट, जाँचें, उपकरण और सेंसर रीडिंग सब मिट जाते हैं।",
      ]],
      ["आपके विकल्प", [
        "\"मेरा खेत → आपका डेटा\" में अपना डेटा देखें, ठीक करें और डाउनलोड करें।",
        "कभी भी अलग-अलग फ़सलें, जाँचें, चैट या उपकरण मिटाएँ, या \"मेरा खेत\" से पूरा खाता मिटाएँ।",
        `सवाल या अनुरोध: ${CONTACT}`,
      ]],
      ["ज़रूरी", [
        "AI की सलाह गलत हो सकती है। ज़रूरी फ़ैसलों, ख़ासकर कीटनाशक या रसायनों के इस्तेमाल की पुष्टि हमेशा अपने कृषि विज्ञान केंद्र या कृषि अधिकारी से करें।",
      ]],
    ],
  },
};

export default function Privacy() {
  const { language } = useLanguage();
  const c = CONTENT[language] || CONTENT.en;

  return (
    <div className="page about-page">
      <article className="card about-card privacy-card">
        <h1>{c.title}</h1>
        <p className="section-help">{c.updated}</p>
        <p className="lead">{c.intro}</p>
        {c.sections.map(([heading, items]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <ul className="limits-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
        <p><Link to="/profile">→ {language === "hi" ? "मेरा खेत" : "My Farm"}</Link></p>
      </article>
    </div>
  );
}
