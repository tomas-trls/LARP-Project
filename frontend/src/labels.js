// Plain-words names for values the back end sends as short codes.

export const AREA_NAMES = { main: 'Main campus', canary: 'Canary Wharf', other: 'Elsewhere' }

// The back end stores year as 1 to 5, where 5 means postgraduate.
export function yearName(year) {
  if (!year) return ''
  return year === 5 ? 'Postgraduate' : `Year ${year}`
}
