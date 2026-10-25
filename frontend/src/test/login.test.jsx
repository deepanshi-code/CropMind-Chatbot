import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./helpers";

const registerUser = vi.fn();
const loginUser = vi.fn();
const refresh = vi.fn();
vi.mock("../services/api", () => ({
  loginUser: (...args) => loginUser(...args),
  registerUser: (...args) => registerUser(...args),
  googleLoginUrl: () => "/api/auth/google",
  errorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: null, refresh }),
}));

const { default: Login } = await import("../pages/Login");

const fillRegister = async ({ email = "farmer@example.com", password = "long-enough-1", consent = true } = {}) => {
  if (email) await userEvent.type(screen.getByLabelText("Email Address"), email);
  if (password) await userEvent.type(screen.getByLabelText("Password"), password);
  if (consent) await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
};

describe("Register", () => {
  beforeEach(() => {
    registerUser.mockReset().mockResolvedValue({});
    loginUser.mockReset().mockResolvedValue({});
    refresh.mockReset().mockResolvedValue();
  });

  it("creates the account and signs the user straight in", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await fillRegister();
    expect(registerUser).toHaveBeenCalledWith("farmer@example.com", "long-enough-1", true);
    expect(refresh).toHaveBeenCalled();
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("shows a visible message (not a hidden browser tooltip) when the privacy box is not ticked", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await fillRegister({ consent: false });
    expect(screen.getByRole("alert")).toHaveTextContent("accept the privacy notice");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("explains a too-short password before sending anything", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await fillRegister({ password: "short" });
    expect(screen.getByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("explains an invalid email", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await fillRegister({ email: "farmer.example.com" });
    expect(screen.getByRole("alert")).toHaveTextContent("valid email");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("shows the server's reason when sign-up is refused", async () => {
    registerUser.mockRejectedValue({ response: { status: 400, data: { message: "Email is already registered." } } });
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    await fillRegister();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email is already registered.");
  });

  it("can show the password while typing", async () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("links the privacy notice from the consent box and the Google button", () => {
    renderWithProviders(<Login />, { route: "/login?mode=register" });
    const links = screen.getAllByRole("link", { name: "privacy notice" });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/privacy"));
  });
});

describe("Login", () => {
  beforeEach(() => {
    loginUser.mockReset().mockResolvedValue({});
    refresh.mockReset().mockResolvedValue();
  });

  it("logs in and loads the session", async () => {
    renderWithProviders(<Login />, { route: "/login" });
    await userEvent.type(screen.getByLabelText("Email Address"), "farmer@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "any-length");
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(loginUser).toHaveBeenCalledWith("farmer@example.com", "any-length");
    expect(refresh).toHaveBeenCalled();
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
