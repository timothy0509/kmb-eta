import React, { useEffect, useRef, useState } from "react";
import SearchBar from "./components/SearchBar";
import ETAList from "./components/ETAList";
import SettingsModal from "./components/SettingsModal";
import { getETAByStopName, fetchStops } from "./api/kmbApi";
import { parseStopName } from "./utils/stopParser";

/**
 * App.jsx
 * - central settings + theme handling (system/light/dark)
 * - central pinned state (persisted)
 * - pinned area shown above results
 * - merged-by-stopName search + background refresh with in-place ETA updates
 */

export default function App() {
  const [results, setResults] = useState([]); // merged results by stop name
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastQuery, setLastQuery] = useState(null);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [highlightMap, setHighlightMap] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const refreshIntervalRef = useRef(null);

  // initial settings (persisted)
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initialSettings = {
    theme: localStorage.getItem("kmb_theme") || "system", // "system" | "dark" | "light"
    language: localStorage.getItem("kmb_lang") || "en", // "en","tc","sc"
    autoRefreshInterval: parseInt(
      localStorage.getItem("kmb_auto_interval") || "30",
      10
    ), // seconds
    defaultCountdown:
      localStorage.getItem("kmb_default_countdown") === "true" || false,
    reducedMotionPreference:
      localStorage.getItem("kmb_reduced_motion") === "true" ||
      prefersReducedMotion,
  };
  const [settings, setSettings] = useState(initialSettings);

  // pinned keys: { [rowKey]: timestamp }
  const [pinnedKeys, setPinnedKeys] = useState(() => {
    try {
      const raw = localStorage.getItem("kmb_pinned_keys");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Theme application
  useEffect(() => {
    const apply = () => {
      const theme = settings.theme || "system";
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      const isDarkSystem = m.matches;
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // system
        if (isDarkSystem) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    };

    apply();

    // if system, listen for changes and update
    let mq;
    if (settings.theme === "system" && window.matchMedia) {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply();
      mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
      return () => {
        mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
      };
    }
  }, [settings.theme]);

  useEffect(() => {
    localStorage.setItem("kmb_theme", settings.theme);
    localStorage.setItem("kmb_lang", settings.language);
    localStorage.setItem("kmb_auto_interval", `${settings.autoRefreshInterval}`);
    localStorage.setItem("kmb_default_countdown", `${settings.defaultCountdown}`);
    localStorage.setItem("kmb_reduced_motion", `${settings.reducedMotionPreference}`);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("kmb_pinned_keys", JSON.stringify(pinnedKeys));
  }, [pinnedKeys]);

  // helper: create row key stable across refreshes
  const makeRowKey = (stopName, route, dest, stopCode) =>
    `${stopName}|${route}|${dest}|${stopCode || ""}`;

  // merge results returned by getETAByStopName into cards by parsed stop name
  const mergeByStopName = (rawArray, lang) => {
    const map = {};
    for (const entry of rawArray) {
      const nameLangValue = entry.stop[`name_${lang}`] || entry.stop.name_en || "";
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

  // perform immediate search
  const doSearch = async (stopName, routes = []) => {
    setLoading(true);
    try {
      const raw = await getETAByStopName(stopName, routes);
      const merged = mergeByStopName(raw, settings.language);
      const sorted = sortMergedByRelevance(merged, stopName);
      setResults(sorted);
      setLastQuery({ stopName, routes });
      setLastRefreshAt(new Date());
      setHighlightMap({});
      // reset auto refresh timer
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

  // background refresh: merge and highlight changes; append new stops
  const backgroundRefresh = async () => {
    if (!lastQuery) return;
    setRefreshing(true);
    try {
      const raw = await getETAByStopName(lastQuery.stopName, lastQuery.routes);
      const mergedNew = mergeByStopName(raw, settings.language);
      const newMap = {};
      for (const m of mergedNew) newMap[m.stopName] = m;

      // build prev/new row times to detect changed rows
      const prevRowTimes = {};
      for (const prev of results) {
        const stopName = prev.stopName;
        for (const e of prev.eta) {
          const dest = e[`dest_${settings.language}`] || e.dest_en || "";
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
          const dest = e[`dest_${settings.language}`] || e.dest_en || "";
          const stopCode = parseStopName(m.nameLangValue).stopCode || "";
          const key = makeRowKey(stopName, e.route, dest, stopCode);
          newRowTimes[key] = newRowTimes[key] || new Set();
          if (e.eta) newRowTimes[key].add(e.eta);
        }
      }

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

      // merge into existing results in-place (keep order)
      const mergedResultsInPlace = results.map((prev) => {
        const match = newMap[prev.stopName];
        if (!match) return prev;
        return { ...prev, eta: match.eta };
      });

      const existingStopNames = new Set(results.map((r) => r.stopName));
      const newStopsToAppend = mergedNew.filter((m) => !existingStopNames.has(m.stopName));
      const finalResults = [...mergedResultsInPlace, ...newStopsToAppend];

      setResults(finalResults);

      setHighlightMap((prev) => {
        const next = { ...prev };
        Object.entries(changedKeys).forEach(([k, ts]) => {
          next[k] = ts;
        });
        return next;
      });

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

  // pinned helpers
  const togglePin = (rowKey) => {
    setPinnedKeys((prev) => {
      const next = { ...prev };
      if (next[rowKey]) delete next[rowKey];
      else next[rowKey] = Date.now();
      return next;
    });
  };

  const getPinnedRows = () => {
    // gather pinned rows data from current results (so pins show up immediately)
    const listed = [];
    for (const card of results) {
      for (const row of card.rows || []) {
        const rowKey = makeRowKey(card.stopName, row.route, row.dest, row.stopCode || "");
        if (pinnedKeys[rowKey]) {
          listed.push({ card, row, rowKey });
        }
      }
    }
    return listed;
  };

  const scrollToRow = (rowKey) => {
    // find element with data-row-key attribute
    const nodes = document.querySelectorAll('[data-row-key]');
    for (const n of nodes) {
      if (n.getAttribute("data-row-key") === rowKey) {
        n.scrollIntoView({ behavior: "smooth", block: "center" });
        // visual focus
        n.classList.add("focus-ring-temp");
        setTimeout(() => n.classList.remove("focus-ring-temp"), 1400);
        break;
      }
    }
  };

  // preload stops in background to speed suggestions
  useEffect(() => {
    fetchStops().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors font-inter">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-100/60 dark:bg-gray-900/60 backdrop-blur-sm shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400">
              KMB ETA Finder
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-300 ml-2 hidden sm:block">
              Real-time arrival information
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
              title="Settings"
            >
              ⚙️ Settings
            </button>

            <button
              onClick={manualRefresh}
              className="px-3 py-1 rounded bg-blue-600 text-white shadow hover:bg-blue-700"
              title="Refresh now"
            >
              Refresh
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              {refreshing ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
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

        <div className="max-w-6xl mx-auto px-4 pb-4">
          <SearchBar onSearch={doSearch} />
        </div>
      </div>

      {/* main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* pinned area */}
        <PinnedArea
          pinnedRows={getPinnedRows()}
          onUnpin={(k) => togglePin(k)}
          onGoto={(k) => scrollToRow(k)}
        />

        {loading && results.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        ) : (
          <ETAList
            results={results}
            language={settings.language}
            highlightMap={highlightMap}
            highlightDuration={settings.reducedMotionPreference ? 0 : 2000}
            reducedMotion={settings.reducedMotionPreference}
            pinnedKeys={pinnedKeys}
            onTogglePin={togglePin}
            useCountdown={settings.defaultCountdown}
            onRowClick={(k) => scrollToRow(k)}
          />
        )}
      </main>

      <SettingsModal
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={(newSettings) => {
          setSettings(newSettings);
          setShowSettings(false);
        }}
      />

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

/* Small pinned area component - inline to keep file count down */
function PinnedArea({ pinnedRows = [], onUnpin, onGoto }) {
  if (!pinnedRows || pinnedRows.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pinned</h3>
      <div className="flex flex-wrap gap-3">
        {pinnedRows.map(({ card, row, rowKey }) => {
          const times = (row.etas || []).slice(0, 3).map((t) => {
            // show raw or formatted if present
            return t.eta || t.raw || "";
          });
          return (
            <div key={rowKey} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded shadow-sm flex items-center gap-3">
              <button
                onClick={() => onGoto(rowKey)}
                className="text-sm font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                title="Go to row"
              >
                {row.route}
              </button>
              <div className="text-xs text-gray-700 dark:text-gray-200">
                <div>{card.stopName} → {row.dest}</div>
                <div className="text-gray-500 dark:text-gray-400">{times.join(" • ")}</div>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <button onClick={() => onUnpin(rowKey)} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  Unpin
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}