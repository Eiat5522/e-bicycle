export function formatRideDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

export function formatRideDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatRideDurationLabel(durationSec: number): string {
  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  return `${totalMinutes} min`;
}
