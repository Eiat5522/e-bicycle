import { validateBikeForm } from "./validation";

function createBikeFormData(overrides?: Record<string, string>) {
  const formData = new FormData();

  formData.set("bikeId", "g-701");
  formData.set("model", "Glide Sprint");
  formData.set("rideClass", "Urban");
  formData.set("pricingLabel", "$1.10 / 10 min");
  formData.set("status", "available");
  formData.set("location", "Central World");
  formData.set("estimatedRangeKm", "40");
  formData.set("topSpeedKmh", "25");
  formData.set("latitude", "13.7466");
  formData.set("longitude", "100.5393");

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

describe("validateBikeForm", () => {
  it("normalizes and validates valid bicycle input", () => {
    expect(validateBikeForm(createBikeFormData())).toEqual({
      bikeId: "G-701",
      estimatedRangeKm: 40,
      latitude: 13.7466,
      location: "Central World",
      longitude: 100.5393,
      model: "Glide Sprint",
      pricingLabel: "$1.10 / 10 min",
      rideClass: "Urban",
      status: "available",
      topSpeedKmh: 25
    });
  });

  it("rejects invalid bike status values", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          status: "offline"
        })
      )
    ).toThrow("Bike status is invalid.");
  });
});
