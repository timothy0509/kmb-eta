import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/layout/Layout";
import MainPage from "./pages/MainPage";
import PakHungHousePage from "./pages/PakHungHousePage";
import SettingsPage from "./pages/SettingsPage"; // Import
import { useTheme } from "./hooks/useTheme";

function App() {
  const { theme } = useTheme();
  const location = useLocation();

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Set document title based on route
  React.useEffect(() => {
    let title = "KMB Real-Time ETA";
    if (location.pathname === "/") {
      title = "Search ETA - KMB";
    } else if (location.pathname === "/singyin") {
      title = "Pak Hung House ETA - KMB";
    } else if (location.pathname === "/settings") {
      title = "Settings - KMB ETA";
    }
    document.title = title;
  }, [location.pathname]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/singyin" element={<PakHungHousePage />} /> {/* Updated path */}
        <Route path="/settings" element={<SettingsPage />} /> {/* New route */}
      </Routes>
    </Layout>
  );
}

export default App;
