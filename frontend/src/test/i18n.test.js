import { describe, expect, it } from "vitest";
import { STRINGS } from "../i18n/strings";
import { translate } from "../i18n/LanguageContext";

const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();

describe("translations", () => {
  it("has a Hindi string for every English key", () => {
    const missing = Object.keys(STRINGS.en).filter((key) => !(key in STRINGS.hi));
    expect(missing).toEqual([]);
  });

  it("has no Hindi keys that English lacks (typos)", () => {
    const extra = Object.keys(STRINGS.hi).filter((key) => !(key in STRINGS.en));
    expect(extra).toEqual([]);
  });

  it("keeps the same {placeholders} in both languages", () => {
    const mismatched = Object.keys(STRINGS.en).filter(
      (key) => key in STRINGS.hi && placeholders(STRINGS.en[key]).join() !== placeholders(STRINGS.hi[key]).join()
    );
    expect(mismatched).toEqual([]);
  });

  it("fills placeholders and falls back to English, then to the key", () => {
    expect(translate("en", "dash.cropCount", { count: 3 })).toBe("3 crops");
    expect(translate("hi", "dash.cropCount", { count: 3 })).toBe("3 फ़सलें");
    expect(translate("hi", "no.such.key")).toBe("no.such.key");
  });
});
