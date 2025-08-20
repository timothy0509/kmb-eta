// src/utils/stopParser.js

export function parseStopName(name) {
  let platform = null;
  let stopCode = null;
  let cleanName = name;

  // Match platform (e.g. (A12), (B3))
  const platformMatch = name.match(/\(([A-Z]\d{1,2})\)/);
  if (platformMatch) {
    platform = platformMatch[1];
    cleanName = cleanName.replace(platformMatch[0], "").trim();
  }

  // Match stop code (e.g. (AB123))
  const stopCodeMatch = name.match(/\(([A-Z]{2}\d{3})\)/);
  if (stopCodeMatch) {
    stopCode = stopCodeMatch[1];
    cleanName = cleanName.replace(stopCodeMatch[0], "").trim();
  }

  return {
    name: cleanName,
    platform,
    stopCode,
  };
}