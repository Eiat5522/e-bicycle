import type { Bike, Coordinates } from "@glide/shared";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function sortBikesByDistance(bikes: readonly Bike[], userCoordinates?: Coordinates) {
  if (!userCoordinates) {
    return [...bikes];
  }

  return [...bikes].sort((leftBike, rightBike) => {
    const leftDistance = calculateDistanceKm(userCoordinates, leftBike.coordinates);
    const rightDistance = calculateDistanceKm(userCoordinates, rightBike.coordinates);

    return leftDistance - rightDistance;
  });
}
