export interface Ride {
  id: string;
  date: Date;
  name: string;
  distance: number; // km
  duration: number; // seconds
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  elevation: number; // meters
  calories: number;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export const mockRides: Ride[] = [
  {
    id: "1",
    date: hoursAgo(2),
    name: "Morning Commute",
    distance: 12.4,
    duration: 2520,
    avgSpeed: 17.7,
    maxSpeed: 28.3,
    elevation: 45,
    calories: 210,
  },
  {
    id: "2",
    date: hoursAgo(26),
    name: "Evening Loop",
    distance: 22.1,
    duration: 4800,
    avgSpeed: 16.6,
    maxSpeed: 32.1,
    elevation: 120,
    calories: 380,
  },
  {
    id: "3",
    date: hoursAgo(50),
    name: "Weekend Ride",
    distance: 45.3,
    duration: 9600,
    avgSpeed: 17.0,
    maxSpeed: 35.8,
    elevation: 310,
    calories: 820,
  },
  {
    id: "4",
    date: hoursAgo(75),
    name: "City Exploration",
    distance: 18.7,
    duration: 3960,
    avgSpeed: 17.0,
    maxSpeed: 29.5,
    elevation: 75,
    calories: 330,
  },
  {
    id: "5",
    date: hoursAgo(100),
    name: "Park Circuit",
    distance: 8.2,
    duration: 1980,
    avgSpeed: 14.9,
    maxSpeed: 24.0,
    elevation: 20,
    calories: 140,
  },
  {
    id: "6",
    date: hoursAgo(150),
    name: "Coastal Path",
    distance: 31.6,
    duration: 6900,
    avgSpeed: 16.5,
    maxSpeed: 38.2,
    elevation: 180,
    calories: 560,
  },
  {
    id: "7",
    date: hoursAgo(200),
    name: "Hill Challenge",
    distance: 15.9,
    duration: 4200,
    avgSpeed: 13.6,
    maxSpeed: 42.1,
    elevation: 480,
    calories: 450,
  },
  {
    id: "8",
    date: hoursAgo(260),
    name: "Commute + Errands",
    distance: 9.5,
    duration: 2100,
    avgSpeed: 16.3,
    maxSpeed: 26.7,
    elevation: 30,
    calories: 165,
  },
  {
    id: "9",
    date: hoursAgo(320),
    name: "Sunrise Ride",
    distance: 28.4,
    duration: 5700,
    avgSpeed: 17.9,
    maxSpeed: 36.4,
    elevation: 210,
    calories: 490,
  },
  {
    id: "10",
    date: hoursAgo(400),
    name: "Sunday Gravel",
    distance: 38.7,
    duration: 8400,
    avgSpeed: 16.6,
    maxSpeed: 31.0,
    elevation: 420,
    calories: 710,
  },
  {
    id: "11",
    date: hoursAgo(500),
    name: "Quick Lunch Loop",
    distance: 5.3,
    duration: 1260,
    avgSpeed: 15.1,
    maxSpeed: 22.8,
    elevation: 15,
    calories: 90,
  },
  {
    id: "12",
    date: hoursAgo(600),
    name: "Night Cruise",
    distance: 17.2,
    duration: 3600,
    avgSpeed: 17.2,
    maxSpeed: 33.5,
    elevation: 55,
    calories: 295,
  },
];

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const bikeStats = {
  batteryPercent: 78,
  currentSpeed: 0,
  rangeKm: 62,
  totalDistanceKm: mockRides.reduce((sum, r) => sum + r.distance, 0),
  ridesCount: mockRides.length,
};
