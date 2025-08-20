export function parseRoute(route) {
  // Match prefix (letters), number, suffix (letters)
  const match = route.match(/^([A-Z]*)(\d+)([A-Z]*)$/i);
  if (!match) return { prefix: "", number: NaN, suffix: "", raw: route };

  const [, prefix, num, suffix] = match;
  return {
    prefix: prefix.toUpperCase(),
    number: parseInt(num, 10),
    suffix: suffix.toUpperCase(),
    raw: route,
  };
}

export function getRouteStyle({ prefix, number, suffix }) {
  // Special cases first
  if (prefix === "NA") return "bg-black text-yellow-400";
  if (prefix === "N") return "bg-black text-white";
  if (prefix === "A") return "bg-blue-600 text-yellow-300";
  if (prefix === "E") return "bg-orange-500 text-white";
  if (prefix === "HK") return "bg-white text-sky-500 border border-sky-500";
  if (prefix === "P" && number >= 900) return "bg-rose-400 text-white";
  if (prefix === "SP" && number === 10) return "bg-red-600 text-white";

  // Hundreds digit rules
  const hundreds = Math.floor(number / 100);
  if ([1, 3, 6].includes(hundreds)) return "bg-red-600 text-white";
  if (hundreds === 9) return "bg-green-600 text-white";

  // Default
  return "bg-white text-black border border-gray-400";
}