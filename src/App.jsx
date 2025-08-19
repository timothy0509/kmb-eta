import { useState } from "react";
import SearchBar from "./components/SearchBar";
import ETAList from "./components/ETAList";
import { getETAByStopName } from "./api/kmbApi";

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (stopName, routes) => {
    setLoading(true);
    const data = await getETAByStopName(stopName, routes);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        KMB ETA Finder
      </h1>
      <SearchBar onSearch={handleSearch} />
      {loading ? (
        <p className="text-center mt-6 text-gray-600">Loading...</p>
      ) : (
        <ETAList results={results} />
      )}
    </div>
  );
}

export default App;