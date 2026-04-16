export function isMissingAuthSessionError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const code = error?.code?.toLowerCase() ?? "";

  return (
    message.includes("auth session missing") ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    code === "refresh_token_not_found"
  );
}
