import React, { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

const STORAGE_KEY = "cropmind_theme";

const initialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/** Icon button that switches light/dark; remembers the choice, otherwise follows the device. */
export default function ThemeToggle() {
  const { t } = useLanguage();
  const [theme, setTheme] = useState(initialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0f1712" : "#f6f5ef");
  }, [theme]);

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable; the choice still applies for this visit
    }
  };

  const label = isDark ? t("theme.light") : t("theme.dark");
  return (
    <button type="button" onClick={toggle} className="icon-button theme-toggle" aria-label={label} title={label}>
      {isDark ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
        </svg>
      )}
      <span className="theme-toggle-text">{label}</span>
    </button>
  );
}
