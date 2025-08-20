import React, { useEffect, useRef, useState } from "react";
import SearchBar from "./components/SearchBar";
import ETAList from "./components/ETAList";
import SettingsModal from "./components/SettingsModal";
import { getETAByStopName, fetchStops } from "./api/kmbApi";
import { parseStopName } from "./utils/stopParser";

/**
 * App.jsx
 * - sticky header (compact on scroll)
 * - search orchestration & merge-by-stopName (replaces displayed results immediately)
 * - background refresh that merges ETAs in-place and highlights changed rows
 * - settings modal, toast updates, persisted prefs, prefers-reduced-motion handling
 */

export default function App() {
  const [results, setResults] = useState([]); // merged results by stop name
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("kmb_lang") || "en"
  );
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("kmb_dark") === "true" ? true : prefersDark
  );
  const [lastQuery, setLastQuery] = useState(null);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [highlightMap, setHighlightMap] = useState({}); // rowKey -> timestamp
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [compactHeader, setCompactHeader] = useState(false);
  const refreshIntervalRef = useRef(null);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // persisted settings
  const defaultSettings = {
    autoRefreshInterval: parseInt(
      localStorage.getItem("kmb_auto_interval") || "30",
      10
    ), // seconds, 0 = off
    defaultCountdown: localStorage.getItem("kmb_default_countdown") === "true",
    reducedMotionPreference:
      localStorage.getItem("kmb_reduced_motion") === "true" ||
      prefersReduced.current,
  };
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    // sync dark mode
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("kmb_dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("kmb_lang", language);
  }, [language]);

  useEffect(() => {
    // compact header on scroll
    const onScroll = () => {
      setCompactHeader(window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // auto-refresh interval changes
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (settings.autoRefreshInterval > 0 && lastQuery) {
      refreshIntervalRef.current = setInterval(
        () => backgroundRefresh(),
        settings.autoRefreshInterval * 1000
      );
    }
    localStorage.setItem("kmb_auto_interval", `${settings.autoRefreshInterval}`);
    localStorage.setItem(
      "kmb_default_countdown",
      settings.defaultCountdown ? "true" : "false"
    );
    localStorage.setItem(
      "kmb_reduced_motion",
      settings.reducedMotionPreference ? "true" : "false"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, lastQuery]);

  // utility: merge raw API results by parsed stop name
  const mergeByStopName = (rawArray, lang) => {
    const map = {};
    for (const entry of rawArray) {
      const nameLangValue =
        entry.stop[`name_${lang}`] || entry.stop.name_en || "";
      const parsed = parseStopName(nameLangValue);
      const stopNameKey = parsed.name || nameLangValue || entry.stop.stop;

      if (!map[stopNameKey]) {
        map[stopNameKey] = {
          stopRepresentative: entry.stop,
          stopName: stopNameKey,
          nameLangValue,
          parsedStop: parsed,
          eta: [],
        };
      }
      map[stopNameKey].eta.push(...(entry.eta || []));
    }
    return Object.values(map);
  };

  // quick relevance sorting: exact->startsWith->contains->other
  const sortMergedByRelevance = (mergedArray, query) => {
    if (!query) return mergedArray;
    const q = query.trim().toLowerCase();
    const score = (name) => {
      const n = (name || "").toLowerCase();
      if (n === q) return 0;
      if (n.startsWith(q)) return 1;
      if (n.includes(q)) return 2;
      return 3;
    };
    return [...mergedArray].sort((a, b) => score(a.stopName) - score(b.stopName));
  };

  const makeRowKey = (stopName, route, dest, stopCode) =>
    `${stopName}|${route}|${dest}|${stopCode || ""}`;

  // initial search: replace displayed results immediately and sort by relevance
  const doSearch = async (stopName, routes = []) => {
    setLoading(true);
    try {
      const raw = await getETAByStopName(stopName, routes);
      const merged = mergeByStopName(raw, language);
      const sorted = sortMergedByRelevance(merged, stopName);
      setResults(sorted);
      setLastQuery({ stopName, routes });
      setLastRefreshAt(new Date());
      setHighlightMap({});
      // restart auto refresh timer if enabled
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (settings.autoRefreshInterval > 0) {
        refreshIntervalRef.current = setInterval(
          () => backgroundRefresh(),
          settings.autoRefreshInterval * 1000
        );
      }
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoading(false);
    }
  };

  // background refresh merges new ETA data and highlights changed rows
  const backgroundRefresh = async () => {
    if (!lastQuery) return;
    setRefreshing(true);
    try {
      const raw = await getETAByStopName(lastQuery.stopName, lastQuery.routes);
      const mergedNew = mergeByStopName(raw, language);
      const newMap = {};
      for (const m of mergedNew) newMap[m.stopName] = m;

      // build prev and new row times for change detection
      const prevRowTimes = {};
      for (const prev of results) {
        const stopName = prev.stopName;
        for (const e of prev.eta) {
          const dest = e[`dest_${language}`] || e.dest_en || "";
          const stopCode = parseStopName(prev.nameLangValue).stopCode || "";
          const key = makeRowKey(stopName, e.route, dest, stopCode);
          prevRowTimes[key] = prevRowTimes[key] || new Set();
          if (e.eta) prevRowTimes[key].add(e.eta);
        }
      }

      const newRowTimes = {};
      for (const m of mergedNew) {
        const stopName = m.stopName;
        for (const e of m.eta) {
          const dest = e[`dest_${language}`] || e.dest_en || "";
          const stopCode = parseStopName(m.nameLangValue).stopCode || "";
          const key = makeRowKey(stopName, e.route, dest, stopCode);
          newRowTimes[key] = newRowTimes[key] || new Set();
          if (e.eta) newRowTimes[key].add(e.eta);
        }
      }

      // detect changed keys
      const changedKeys = {};
      let changedCount = 0;
      for (const key of Object.keys(newRowTimes)) {
        const prevSet = prevRowTimes[key] || new Set();
        const newSet = newRowTimes[key] || new Set();
        const prevArr = Array.from(prevSet).sort().join("|");
        const newArr = Array.from(newSet).sort().join("|");
        if (prevArr !== newArr) {
          changedKeys[key] = Date.now();
          changedCount++;
        }
      }

      // merge into existing results in-place (keep order), update ETA arrays for matching stop names
      const mergedResultsInPlace = results.map((prev) => {
        const match = newMap[prev.stopName];
        if (!match) return prev;
        return { ...prev, eta: match.eta };
      });

      // append any new stops not already in results
      const existingStopNames = new Set(results.map((r) => r.stopName));
      const newStopsToAppend = mergedNew.filter(
        (m) => !existingStopNames.has(m.stopName)
      );
      const finalResults = [...mergedResultsInPlace, ...newStopsToAppend];

      setResults(finalResults);

      // update highlightMap
      setHighlightMap((prev) => {
        const next = { ...prev };
        Object.entries(changedKeys).forEach(([k, ts]) => {
          next[k] = ts;
        });
        return next;
      });

      // update last refresh and show a tiny toast
      setLastRefreshAt(new Date());
      if (changedCount > 0) {
        setToast({ type: "update", message: `${changedCount} ETA updates` });
        window.setTimeout(() => setToast(null), 2500);
      }
    } catch (err) {
      console.error("Background refresh error", err);
    } finally {
      setRefreshing(false);
    }
  };

  const manualRefresh = async () => {
    await backgroundRefresh();
  };

  useEffect(() => {
    // preload stops for suggestions in background
    fetchStops().catch(() => {
      /* ignore */
    });
  }, []);

  // settings modal handlers
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
  };

  // small aria live updates: announce when new ETAs arrive (polite)
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  useEffect(() => {
    const keys = Object.keys(highlightMap);
    if (keys.length > 0) {
      setAriaAnnouncement(`${keys.length} updated ETA items`);
      window.setTimeout(() => setAriaAnnouncement(""), 2000);
    }
  }, [highlightMap]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors font-inter">
      {/* sticky header */}
      <div
        className={`sticky top-0 z-50 bg-gray-100/60 dark:bg-gray-900/60 backdrop-blur-sm transition-all ${
          compactHeader ? "shadow-lg" : "shadow"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400 transition-transform ${
                compactHeader ? "scale-95" : "scale-100"
              }`}
            >
              KMB ETA Finder
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-300 ml-2">
              <span className="mr-2">•</span>
              <span>Real-time arrival information</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="sr-only">Language</label>
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="en">English</option>
              <option value="tc">繁體中文</option>
              <option value="sc">简体中文</option>
            </select>

            <button
              aria-pressed={darkMode}
              onClick={() => {
                setDarkMode((d) => !d);
                localStorage.setItem("kmb_dark", (!darkMode).toString());
              }}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
              title="Toggle dark mode"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>

            <button
              onClick={manualRefresh}
              className="px-3 py-1 rounded bg-blue-600 text-white shadow hover:bg-blue-700"
              title="Refresh now"
            >
              Refresh
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
              title="Open settings"
            >
              ⚙️
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              {refreshing ? (
                <svg
                  className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-300"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 100 8v4a8 8 0 01-8-8z"
                  />
                </svg>
              ) : null}
              <div>
                <div className="text-xs">Last refresh</div>
                <div className="text-sm font-medium">
                  {lastRefreshAt
                    ? lastRefreshAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* search bar */}
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <SearchBar
            onSearch={doSearch}
            defaultCountdown={settings.defaultCountdown}
            reducedMotion={settings.reducedMotionPreference}
          />
        </div>
      </div>

      {/* content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div aria-live="polite" className="sr-only">
          {ariaAnnouncement}
        </div>

        {loading && results.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-300">
            Loading...
          </div>
        ) : (
          <ETAList
            results={results}
            language={language}
            highlightMap={highlightMap}
            highlightDuration={settings.reducedMotionPreference ? 0 : 2000}
            reducedMotion={settings.reducedMotionPreference}
            onPinChange={(pinnedEntries) =>
              localStorage.setItem("kmb_pinned", JSON.stringify(pinnedEntries))
            }
          />
        )}
      </main>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={save => saveSettings(save)}
      />

      {/* toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-60">
          <div className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}