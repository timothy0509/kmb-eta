import React, { useState, useEffect, useCallback } from "react";
import {
  fetchStopEta,
  PAK_HUNG_HOUSE_STOP_GROUPS,
} from "../services/kmbApi";
import ETATable from "../components/eta/ETATable";
import { useTheme } from "../hooks/useTheme";
import styles from "./PakHungHousePage.module.css";

const PakHungHousePage = () => {
  const [etaData, setEtaData] = useState({}); // { EASTBOUND: [], WESTBOUND: [] }
  const [loading, setLoading] = useState({}); // { EASTBOUND: false, WESTBOUND: false }
  const [error, setError] = useState({}); // { EASTBOUND: null, WESTBOUND: null }
  const { theme, toggleTheme } = useTheme(); // Access theme context

  // Force dark mode for this page on initial load if not already dark
  useEffect(() => {
    if (theme !== "dark") {
      // This will also update localStorage and html attribute via ThemeProvider
      // toggleTheme(); // Uncomment if you want to force toggle
      // OR, just apply a class to the page wrapper if ThemeProvider handles global theme
      document.documentElement.setAttribute("data-theme", "dark");
    }
    // Cleanup function to reset theme if user navigates away
    return () => {
        // If you want to revert to user's preference when leaving this page:
        // const storedTheme = localStorage.getItem("kmb-app-theme") || "light";
        // document.documentElement.setAttribute("data-theme", storedTheme);
    };
  }, [theme, toggleTheme]);


  const fetchGroupEtas = useCallback(async (groupKey, stops) => {
    setLoading((prev) => ({ ...prev, [groupKey]: true }));
    setError((prev) => ({ ...prev, [groupKey]: null }));
    try {
      const promises = stops.map((stop) =>
        fetchStopEta(stop.kmb_id).then((etas) =>
          etas.map((eta) => ({ ...eta, platform_code_display: stop.platform_code })) // Add platform code for display
        ).catch(e => {
            console.warn(`Failed to fetch ETA for ${stop.platform_code} (${stop.kmb_id}):`, e.message);
            return [{ route: `Error ${stop.platform_code}`, dest_tc: e.message.substring(0,50), etas:[] }]; // Return an error structure
        })
      );
      const results = await Promise.all(promises);
      // Flatten results and combine ETAs for the same route/dest across platforms if needed,
      // or simply display them per platform. For now, we'll keep them separate per platform.
      // The ETATable will be called for each stop's data.
      // So, etaData will store an array of { stopInfo, etas }
      const processedGroupData = results.map((platformEtas, index) => ({
        stopInfo: stops[index],
        etas: platformEtas,
      }));

      setEtaData((prev) => ({ ...prev, [groupKey]: processedGroupData }));
    } catch (e) {
      console.error(`Error fetching ETAs for ${groupKey}:`, e);
      setError((prev) => ({ ...prev, [groupKey]: e.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [groupKey]: false }));
    }
  }, []);

  useEffect(() => {
    Object.keys(PAK_HUNG_HOUSE_STOP_GROUPS).forEach((groupKey) => {
      fetchGroupEtas(groupKey, PAK_HUNG_HOUSE_STOP_GROUPS[groupKey]);
    });

    const intervalId = setInterval(() => {
      Object.keys(PAK_HUNG_HOUSE_STOP_GROUPS).forEach((groupKey) => {
        fetchGroupEtas(groupKey, PAK_HUNG_HOUSE_STOP_GROUPS[groupKey]);
      });
    }, 60000); // Refresh every 1 minute

    return () => clearInterval(intervalId);
  }, [fetchGroupEtas]);

  return (
    <div className={styles.pakHungHousePage}>
      <h1 className="text-center">Pak Hung House Bus ETA</h1>
      {Object.keys(PAK_HUNG_HOUSE_STOP_GROUPS).map((groupKey) => (
        <section key={groupKey} className={styles.groupSection}>
          <h2>{PAK_HUNG_HOUSE_STOP_GROUPS[groupKey][0].name}</h2> {/* Use name from first stop in group */}
          {loading[groupKey] && <p>Loading {groupKey.toLowerCase()} ETAs...</p>}
          {error[groupKey] && <p className={styles.error}>Error: {error[groupKey]}</p>}
          {etaData[groupKey] &&
            etaData[groupKey].map((platformData, index) => (
              <ETATable
                key={`${groupKey}-${platformData.stopInfo.platform_code}-${index}`}
                stopName={`${platformData.stopInfo.name.replace(/\s*\(.*?\)\s*/, "")}`} // Cleaned name
                platformCode={platformData.stopInfo.platform_code} // Pass platform code
                etas={platformData.etas}
                showPlatformCol={false} // Platform is in the title for this page
              />
            ))}
        </section>
      ))}
       <p className={styles.notice}>
        Note: KMB Stop IDs for Pak Hung House platforms are placeholders.
        Replace them in `src/services/kmbApi.js` with actual 16-character IDs.
        ETAs refresh automatically every minute.
      </p>
    </div>
  );
};

export default PakHungHousePage;
