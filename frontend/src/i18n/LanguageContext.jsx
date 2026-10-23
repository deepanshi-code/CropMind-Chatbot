import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "./strings";

const STORAGE_KEY = "cropmind_language";

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") return saved;
  } catch {
    // storage unavailable
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en";
};

/** Replaces {name} placeholders. */
const fill = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? String(vars[key]) : match)) : text;

export const translate = (language, key, vars) => fill(STRINGS[language]?.[key] ?? STRINGS.en[key] ?? key, vars);

const LanguageContext = createContext({ language: "en", setLanguage: () => {}, t: (key, vars) => translate("en", key, vars) });

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readSaved);

  const setLanguage = useCallback((next) => {
    if (next !== "en" && next !== "hi") return;
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable; the choice still applies for this visit
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key, vars) => translate(language, key, vars),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
