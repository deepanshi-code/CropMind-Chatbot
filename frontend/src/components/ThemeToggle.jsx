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
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

/** Theme switch; remembers the choice and otherwise follows the device setting. */
export default function ThemeToggle() {
  const { t } = useLanguage();
  const [theme, setTheme] = useState(initialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f8fafc" : "#050b14");
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

  return (
    <button type="button" onClick={toggle} className="theme-toggle" aria-label={isDark ? t("theme.light") : t("theme.dark")}>
      {isDark ? (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>
      )}
      <span>{isDark ? t("theme.light") : t("theme.dark")}</span>
    </button>
  );
}
