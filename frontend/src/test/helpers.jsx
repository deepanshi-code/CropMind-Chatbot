import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../i18n/LanguageContext";

/** Renders inside the router and language provider. Set the language via localStorage first. */
export function renderWithProviders(ui, { language = "en", route = "/" } = {}) {
  localStorage.setItem("cropmind_language", language);
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </LanguageProvider>
  );
}
