import { NextResponse } from "next/server";

const invalidJsonResponse = () =>
  NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function parseOptionalJsonObjectBody(request: Request) {
  const text = await request.text();
  if (text.trim() === "") {
    return { body: {} as Record<string, unknown> };
  }

  try {
    const parsed = JSON.parse(text);
    if (!isJsonObject(parsed)) {
      return { error: invalidJsonResponse() };
    }

    return { body: parsed };
  } catch {
    return { error: invalidJsonResponse() };
  }
}

export async function parseRequiredJsonObjectBody(request: Request) {
  try {
    const parsed = await request.json();
    if (!isJsonObject(parsed)) {
      return { error: invalidJsonResponse() };
    }

    return { body: parsed };
  } catch {
    return { error: invalidJsonResponse() };
  }
}
