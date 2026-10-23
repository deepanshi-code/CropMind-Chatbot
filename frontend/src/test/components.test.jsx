import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./helpers";
import SoilCard from "../components/SoilCard";
import CropFields, { EMPTY_CROP } from "../components/CropFields";
import SoilTestForm from "../components/SoilTestForm";
import ConfirmModal from "../components/ConfirmModal";

describe("SoilCard", () => {
  it("shows an empty state instead of made-up numbers when no soil test is saved", () => {
    renderWithProviders(<SoilCard soilTest={undefined} />);
    expect(screen.getByText("No soil test saved yet")).toBeInTheDocument();
    expect(screen.queryByText(/kg\/ha/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add soil test" })).toHaveAttribute("href", "/profile#soil");
  });

  it("shows the user's own values and the rating from their card", () => {
    renderWithProviders(<SoilCard soilTest={{ nitrogen: 245, nitrogenRating: "Low", ph: 7.8 }} />);
    const nitrogenRow = screen.getByText("Nitrogen (N)").closest(".soil-row");
    expect(within(nitrogenRow).getByText(/245 kg\/ha/)).toBeInTheDocument();
    expect(within(nitrogenRow).getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("pH 7.8 (Alkaline)")).toBeInTheDocument();
  });

  it("is translated to Hindi", () => {
    renderWithProviders(<SoilCard soilTest={undefined} />, { language: "hi" });
    expect(screen.getByText("मृदा स्वास्थ्य कार्ड")).toBeInTheDocument();
  });
});

describe("CropFields", () => {
  function Harness({ onSnapshot }) {
    const [values, setValues] = useState(EMPTY_CROP);
    onSnapshot(values);
    return <CropFields values={values} onChange={setValues} idPrefix="t" />;
  }

  it("has a label for every field and updates values", async () => {
    let latest;
    renderWithProviders(<Harness onSnapshot={(v) => { latest = v; }} />);
    await userEvent.type(screen.getByLabelText("Crop name"), "Mustard");
    await userEvent.selectOptions(screen.getByLabelText("Growing season"), "Rabi");
    await userEvent.type(screen.getByLabelText(/Area \(acres\)/), "2.5");
    expect(screen.getByLabelText(/Sowing date/)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    expect(latest).toMatchObject({ name: "Mustard", season: "Rabi", areaAcres: "2.5" });
  });
});

describe("SoilTestForm", () => {
  it("submits values and the ratings chosen from the card", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    renderWithProviders(<SoilTestForm initial={{}} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Nitrogen (N) (kg/ha)"), "300");
    await userEvent.selectOptions(screen.getAllByLabelText("Rating on card")[0], "Medium");
    await userEvent.type(screen.getByLabelText("pH"), "6.9");
    await userEvent.click(screen.getByRole("button", { name: "Save soil test" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ nitrogen: "300", nitrogenRating: "Medium", ph: "6.9" }));
  });
});

describe("ConfirmModal", () => {
  it("focuses Cancel, and Escape cancels", async () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <ConfirmModal isOpen title="Remove crop?" message="Sure?" confirmText="Remove" cancelText="Cancel" onConfirm={() => {}} onCancel={onCancel} />
    );
    expect(screen.getByRole("alertdialog", { name: "Remove crop?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});
