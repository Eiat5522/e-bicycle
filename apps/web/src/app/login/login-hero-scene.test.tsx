import { render, screen } from "@testing-library/react";

import { LoginHeroScene } from "./login-hero-scene";

jest.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="hero-scene-canvas" />,
  useFrame: jest.fn()
}));

jest.mock("three/examples/jsm/loaders/MTLLoader.js", () => ({
  MTLLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn()
  }))
}));

jest.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    setMaterials: jest.fn()
  }))
}));

describe("LoginHeroScene", () => {
  it("presents the 3D bicycle as a premium interactive showcase", () => {
    render(<LoginHeroScene />);

    expect(
      screen.getByLabelText("Premium interactive 3D bicycle showcase")
    ).toBeInTheDocument();
    expect(screen.getByText("Drag to inspect")).toBeInTheDocument();
    expect(screen.getByTestId("hero-scene-canvas")).toBeInTheDocument();
  });
});
