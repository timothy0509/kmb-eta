import { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [stopName, setStopName] = useState("");
  const [routes, setRoutes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const routeList = routes
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter((r) => r.length > 0);
    onSearch(stopName, routeList);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col md:flex-row gap-4 items-center bg-white shadow-lg p-6 rounded-xl"
    >
      <input
        type="text"
        placeholder="Enter stop name (e.g. Sau Mau Ping)"
        value={stopName}
        onChange={(e) => setStopName(e.target.value)}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        required
      />
      <input
        type="text"
        placeholder="Filter by routes (comma separated, optional)"
        value={routes}
        onChange={(e) => setRoutes(e.target.value)}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
      >
        Search
      </button>
    </form>
  );
}