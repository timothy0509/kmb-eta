import React from "react";
import styles from "./RouteTag.module.css";

// This function determines the CSS class for route coloring
// It should match the classes defined in ETATable.module.css or global.css
export const getRouteColorClass = (routeStr) => {
    if (!routeStr) return styles.routeNormal; // Default class
    const route = routeStr.toUpperCase();

    if (route.startsWith('A')) return styles.routeA;
    if (route.startsWith('E') || route.startsWith('S')) return styles.routeES;
    if (route.startsWith('P')) return styles.routeP;
    // Ensure N-routes are not also NA, NE, NP which might have different colors
    if (route.startsWith('N') && !(route.startsWith('NA') || route.startsWith('NE') || route.startsWith('NP'))) return styles.routeN;

    const numericMatch = route.match(/^[A-Z]*(\d+)[A-Z]*$/);
    if (numericMatch) {
        const coreNumericPart = numericMatch[1];
        if (coreNumericPart.length === 3) {
            const firstDigit = coreNumericPart.charAt(0);
            if (['1', '3', '6'].includes(firstDigit)) return styles.route136xx;
            if (firstDigit === '9') return styles.route9xx;
        }
    }
    return styles.routeNormal; // Fallback
};

const RouteTag = ({ routeNumber }) => {
  const colorClass = getRouteColorClass(routeNumber);
  return (
    <span className={`${styles.routeTagSpan} ${colorClass}`}>
      {routeNumber}
    </span>
  );
};

export default RouteTag;
