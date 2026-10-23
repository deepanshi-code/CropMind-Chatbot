import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./helpers";

const registerUser = vi.fn();
vi.mock("../services/api", () => ({
  loginUser: vi.fn(),
  registerUser: (...args) => registerUser(...args),
  googleLoginUrl: () => "/api/auth/google",
  errorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: null, refresh: vi.fn() }),
}));

const { default: Login } = await import("../pages/Login");

describe("Login / register", () => {
  beforeEach(() => registerUser.mockReset().mockResolvedValue({}));

  it("requires accepting the privacy notice before registering", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await userEvent.type(screen.getByLabelText("Email Address"), "farmer@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "long-enough-1");

    const consent = screen.getByRole("checkbox");
    expect(consent).toBeRequired();
    // One link next to the consent checkbox, one under the Google button.
    const links = screen.getAllByRole("link", { name: "privacy notice" });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/privacy"));

    await userEvent.click(consent);
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(registerUser).toHaveBeenCalledWith("farmer@example.com", "long-enough-1", true);
    expect(await screen.findByText("Account created. You can log in now.")).toBeInTheDocument();
  });

  it("shows a friendly, translated message for OAuth errors", () => {
    renderWithProviders(<Login />, { route: "/login?error=SessionExpired", language: "hi" });
    expect(screen.getByRole("alert")).toHaveTextContent("आपका सत्र समाप्त हो गया");
  });

  it("does not echo unknown error codes from the URL", () => {
    renderWithProviders(<Login />, { route: "/login?error=%3Cscript%3Ealert(1)%3C/script%3E" });
    expect(screen.getByRole("alert")).toHaveTextContent("Login failed. Please try again.");
  });
});
