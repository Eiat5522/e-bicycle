export function isMissingAuthSessionError(error: { message?: string } | null | undefined) {
  return error?.message?.includes("Auth session missing") ?? false;
}
