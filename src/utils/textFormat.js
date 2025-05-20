// src/utils/textFormat.js
const OVERRIDE_WORDS_UPPER = new Set([ // Store them in uppercase for easier matching
  "KMB", "LWB", "MTR", "BBI", "PTI", "MCDONALD'S", "HSBC",
  "NT", "KLN", "HK", "FEHD", "LCSD",
  "(N)", "(S)", "(E)", "(W)" // Keep brackets for these specific overrides
]);

// Roman numerals that should be uppercase
const ROMAN_NUMERALS = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);

export function toTitleCase(str) {
  if (!str) return "";

  // Handle specific bracketed terms first if they are in OVERRIDE_WORDS_UPPER
  const overrideMatch = Array.from(OVERRIDE_WORDS_UPPER).find(override => str.toUpperCase().includes(override) && override.startsWith("(") && override.endsWith(")"));
  if (overrideMatch) {
    // This is tricky if the override is part of a larger string.
    // For simplicity, if the whole string largely matches an override with brackets, we might return it as is.
    // This part needs careful thought if overrides are substrings.
    // For now, let's assume overrides are mostly standalone or clearly separated.
  }


  // First, replace BBI- and 轉車站- to ensure proper spacing before title casing
  let processedStr = str.replace(/(BBI)-/gi, "$1 - ").replace(/(轉車站)-/g, "$1 - ");

  return processedStr.replace(/\b(\w(?:'\w)?\w*)\b/g, (txt) => { // Match words, including those with apostrophes
    const upperTxt = txt.toUpperCase();

    if (OVERRIDE_WORDS_UPPER.has(upperTxt)) {
      return txt; // Return original casing if it's an override (e.g. McDonald's)
    }
    if (ROMAN_NUMERALS.has(upperTxt)) {
        return upperTxt; // Keep Roman numerals uppercase
    }
    // Standard title case: first letter uppercase, rest lowercase
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
