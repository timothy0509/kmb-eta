import React, { useEffect, useRef, useState } from "react";
import { fetchStops } from "../api/kmbApi";
import debounce from "../utils/debounce";
import Suggestions from "./Suggestions";

/**
 * SearchBar.jsx
 * - debounced input (300ms)
 * - suggestions dropdown (local stop list)
 * - keyboard "/" focuses input (App adds listener too)
 * - removed clear button per request
 */

export default function SearchBar({
  onSearch,
  defaultCountdown = false,
  reducedMotion = false,
}) {
  const [stopName, setStopName] = useState("");
  const [routes, setRoutes] = useState("");
  const [stopsCache, setStopsCache] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchStops().then((s) => {
      if (Array.isArray(s)) setStopsCache(s);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/") {
        const el = document.getElementById("stop-input");
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // debounced suggestion builder
  const buildSuggestions = debounce((q) => {
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const s = q.toLowerCase();
    const matches = [];
    for (const st of stopsCache) {
      const name = (st.name_en || "").toLowerCase();
      if (name.startsWith(s)) matches.push(st);
      if (matches.length >= 8) break;
    }
    if (matches.length < 8) {
      for (const st of stopsCache) {
        const name = (st.name_en || "").toLowerCase();
        if (!name.startsWith(s) && name.includes(s)) matches.push(st);
        if (matches.length >= 8) break;
      }
    }
    setSuggestions(matches.slice(0, 8));
    setShowSuggestions(matches.length > 0);
  }, 220);

  const handleStopChange = (v) => {
    setStopName(v);
    buildSuggestions(v);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const routeList = routes
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    onSearch(stopName.trim(), routeList);
    setShowSuggestions(false);
  };

  const handleSuggestionPick = (stop) => {
    const val = stop.name_en || stop.name_tc || stop.name_sc || "";
    setStopName(val);
    setShowSuggestions(false);
    inputRef.current.focus();
    // immediately search
    const routeList = routes
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    onSearch(val.trim(), routeList);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 bg-white dark:bg-gray-800 shadow-lg p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center transform transition-all duration-300"
      role="search"
      aria-label="Search bus stop"
    >
      <div className="relative flex-1 w-full">
        <input
          id="stop-input"
          ref={inputRef}
          value={stopName}
          onChange={(e) => handleStopChange(e.target.value)}
          placeholder="Enter stop name (partial match) — e.g. Sau Mau Ping"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        <Suggestions
          id="search-suggestions"
          visible={showSuggestions}
          items={suggestions}
          onPick={handleSuggestionPick}
        />
      </div>

      <input
        value={routes}
        onChange={(e) => setRoutes(e.target.value)}
        placeholder="Filter by routes (comma separated, optional)"
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-shadow"
        >
          Search
        </button>
      </div>
    </form>
  );
}