import React from "react";

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <>
          {/* Sun icon for switching to light theme */}
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
          </svg>
          <span>Light Theme</span>
        </>
      ) : (
        <>
          {/* Moon icon for switching to dark theme */}
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
          <span>Dark Theme</span>
        </>
      )}
    </button>
  );
}
