export const getRouteStyle = (routeNumberStr) => {
  if (!routeNumberStr) return { backgroundColor: "#e0e0e0", color: "#000000" }; // Default

  const routeUpper = routeNumberStr.toUpperCase();
  let mainNumberPart = routeUpper.match(/\d+/);
  mainNumberPart = mainNumberPart ? mainNumberPart[0] : "";

  if (routeUpper.startsWith("N")) {
    return { backgroundColor: "#000000", color: "#FFFFFF" }; // N-Routes
  }
  if (routeUpper.startsWith("A")) {
    return { backgroundColor: "#003366", color: "#FFCC00" }; // A-Routes (Dark Blue, Yellow Text)
  }
  if (routeUpper.startsWith("E") || routeUpper.startsWith("S")) {
    return { backgroundColor: "#FF8C00", color: "#FFFFFF" }; // E/S-Routes (Orange, White Text)
  }
  if (routeUpper.startsWith("P")) {
    return { backgroundColor: "#B76E79", color: "#FFFFFF" }; // P-Routes (Rose Gold-ish, White Text)
  }

  if (mainNumberPart.length === 3) {
    if (mainNumberPart.startsWith("1") || mainNumberPart.startsWith("3") || mainNumberPart.startsWith("6")) {
      return { backgroundColor: "#CC0000", color: "#FFFFFF" }; // 1xx, 3xx, 6xx (Red, White Text)
    }
    if (mainNumberPart.startsWith("9")) {
      return { backgroundColor: "#008000", color: "#FFFFFF" }; // 9xx (Green, White Text)
    }
  }

  return { backgroundColor: "#e9ecef", color: "#212529" }; // Normal Routes (Light Grey, Black Text)
};
