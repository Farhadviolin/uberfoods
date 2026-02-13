/**
 * Geometry Utilities
 * For geometric calculations
 */

interface Point {
  lat: number;
  lng: number;
}

/**
 * Calculates distance between two points (Haversine formula)
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates bearing between two points
 */
export function calculateBearing(point1: Point, point2: Point): number {
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return (toDeg(bearing) + 360) % 360;
}

/**
 * Converts radians to degrees
 */
function toDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Checks if point is within a circle
 */
export function isPointInCircle(point: Point, center: Point, radiusKm: number): boolean {
  return calculateDistance(point, center) <= radiusKm;
}

/**
 * Checks if point is within a rectangle
 */
export function isPointInRectangle(
  point: Point,
  topLeft: Point,
  bottomRight: Point
): boolean {
  return (
    point.lat >= bottomRight.lat &&
    point.lat <= topLeft.lat &&
    point.lng >= topLeft.lng &&
    point.lng <= bottomRight.lng
  );
}

/**
 * Calculates midpoint between two points
 */
export function calculateMidpoint(point1: Point, point2: Point): Point {
  return {
    lat: (point1.lat + point2.lat) / 2,
    lng: (point1.lng + point2.lng) / 2,
  };
}

