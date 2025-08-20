import React, { useEffect, useRef, useState } from "react";
import SearchBar from "./components/SearchBar";
import ETAList from "./components/ETAList";
import { getETAByStopName } from "./api/kmbApi";
import { parseStopName } from "./utils/stopParser";

/**
 * App.jsx
 * - removed clear button support on SearchBar
 * - added searchVersion so new searches animate cards in
 * - retains background refresh + highlight map behavior
 */

export default function App() {
  const [results, setResults] = useState([]); // merged results by stop name
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState("en");
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ? true : prefersDark
  );
  const [lastQuery, setLastQuery] = useState(null);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [highlightMap, setHighlightMap] = useState({}); // { rowKey: timestamp }
  const refreshIntervalRef = useRef(null);
  const [searchVersion, setSearchVersion] = useState(0);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

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
      setSearchVersion((v) => v + 1);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = setInterval(() => {
        backgroundRefresh();
      }, 30000);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoading(false);
    }
  };

  const backgroundRefresh = async () => {
    if (!lastQuery) return;
    setRefreshing(true);
    try {
      const raw = await getETAByStopName(lastQuery.stopName, lastQuery.routes);
      const mergedNew = mergeByStopName(raw, language);
      const newMap = {};
      for (const m of mergedNew) newMap[m.stopName] = m;

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

      const changedKeys = {};
      for (const key of Object.keys(newRowTimes)) {
        const prevSet = prevRowTimes[key] || new Set();
        const newSet = newRowTimes[key] || new Set();
        const prevArr = Array.from(prevSet).sort().join("|");
        const newArr = Array.from(newSet).sort().join("|");
        if (prevArr !== newArr) changedKeys[key] = Date.now();
      }

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
    } catch (err) {
      console.error("Background refresh error", err);
    } finally {
      setRefreshing(false);
    }
  };

  const manualRefresh = async () => {
    await backgroundRefresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors font-inter">
      <div className="sticky top-0 z-50 bg-gray-100 dark:bg-gray-900 shadow-md backdrop-blur-sm transition-shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400">
            KMB ETA Finder
          </h1>

          <div className="flex items-center gap-3">
            <label className="sr-only">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="en">English</option>
              <option value="tc">繁體中文</option>
              <option value="sc">简体中文</option>
            </select>

            <button
              onClick={() => setDarkMode((d) => !d)}
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

        <div className="max-w-6xl mx-auto px-4 pb-4">
          <SearchBar onSearch={doSearch} />
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Legend:</span>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded bg-black text-white text-xs">
                  N
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-yellow-300 text-xs">
                  A
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-xs">
                  E
                </span>
                <span className="px-2 py-0.5 rounded bg-white text-sky-500 border text-xs">
                  HK
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-400 text-white text-xs">
                  P≥900
                </span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-xs">
                  1xx/3xx/6xx
                </span>
                <span className="px-2 py-0.5 rounded bg-green-600 text-white text-xs">
                  9xx
                </span>
              </div>
            </div>

            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              Press "/" to focus search
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading && results.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        ) : (
          <ETAList
            key={searchVersion} /* triggers entrance animation on new searches */
            results={results}
            language={language}
            highlightMap={highlightMap}
            highlightDuration={2000}
          />
        )}
      </main>
    </div>
  );
}