import React, { useState, useRef, useEffect } from "react";

/**
 * SearchBar.jsx
 * - stop input has id="stop-input" for keyboard shortcut focusing
 * - exposes onSearch(stopName, routeArray) and onClear
 * - improved styles for dark mode and sticky header
 */

export default function SearchBar({ onSearch, onClear }) {
  const [stopName, setStopName] = useState("");
  const [routes, setRoutes] = useState("");
  const stopInputRef = useRef(null);

  // focus input on mount for convenience (optional)
  useEffect(() => {
    // do not autofocus to avoid accessibility issues; left commented
    // stopInputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const routeList = routes
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    onSearch(stopName.trim(), routeList);
  };

  const handleClear = () => {
    setStopName("");
    setRoutes("");
    if (onClear) onClear();
    // focus back to input
    stopInputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 bg-white dark:bg-gray-800 shadow-lg p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center"
    >
      <input
        id="stop-input"
        ref={stopInputRef}
        value={stopName}
        onChange={(e) => setStopName(e.target.value)}
        placeholder="Enter stop name (partial match) — e.g. Sau Mau Ping"
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <input
        value={routes}
        onChange={(e) => setRoutes(e.target.value)}
        placeholder="Filter by routes (comma separated, optional)"
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
        >
          Clear
        </button>
      </div>
    </form>
  );
}