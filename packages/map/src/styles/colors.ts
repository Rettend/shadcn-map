/**
 * Shadcn-aligned color tokens for map styling
 * Using zinc color palette for consistency with shadcn-svelte
 */
export const colors = {
  // Dark mode colors
  dark: {
    background: '#09090b', // zinc-950
    land: '#0c0c0e',
    water: '#0c1929', // Dark blue
    roadMinor: '#18181b', // zinc-900
    roadMajor: '#27272a', // zinc-800
    roadHighway: '#3f3f46', // zinc-700
    building: '#18181b', // zinc-900
    label: '#71717a', // zinc-500
    labelHalo: '#09090b', // zinc-950
    boundary: '#27272a', // zinc-800
  },
  // Light mode colors
  light: {
    background: '#fafafa', // zinc-50
    land: '#f4f4f5', // zinc-100
    water: '#dbeafe', // Light blue
    roadMinor: '#e4e4e7', // zinc-200
    roadMajor: '#d4d4d8', // zinc-300
    roadHighway: '#a1a1aa', // zinc-400
    building: '#e4e4e7', // zinc-200
    label: '#71717a', // zinc-500
    labelHalo: '#ffffff',
    boundary: '#d4d4d8', // zinc-300
  },
  // Marker variants (matching shadcn button variants)
  marker: {
    default: {
      bg: '#27272a', // zinc-800
      border: '#3f3f46', // zinc-700
      text: '#fafafa', // zinc-50
    },
    primary: {
      bg: '#3b82f6', // blue-500
      border: '#2563eb', // blue-600
      text: '#ffffff',
    },
    destructive: {
      bg: '#ef4444', // red-500
      border: '#dc2626', // red-600
      text: '#ffffff',
    },
    success: {
      bg: '#22c55e', // green-500
      border: '#16a34a', // green-600
      text: '#ffffff',
    },
    warning: {
      bg: '#f59e0b', // amber-500
      border: '#d97706', // amber-600
      text: '#ffffff',
    },
  },
} as const

export type ColorScheme = typeof colors
