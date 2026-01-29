export default function normalizeTypes(arr) {
  const list = Array.isArray(arr) ? arr.filter(Boolean) : []
  const unique = Array.from(new Set(list))
  const others = unique.filter(t => t && (String(t).toLowerCase() === 'other' || String(t).toLowerCase() === 'others'))
  const rest = unique.filter(t => !(t && (String(t).toLowerCase() === 'other' || String(t).toLowerCase() === 'others')))
  rest.sort((a,b) => String(a).localeCompare(String(b)))
  return [...rest, ...others]
}
