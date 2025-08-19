export default function ETAList({ results }) {
  if (results.length === 0) {
    return <p className="text-gray-500 mt-6">No results found.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {results.map(({ stop, eta }) => (
        <div
          key={stop.stop}
          className="bg-white shadow-md rounded-xl p-4 border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-800">
            {stop.name_en} ({stop.name_tc})
          </h2>
          <p className="text-sm text-gray-500">
            Lat: {stop.lat}, Lng: {stop.long}
          </p>
          <ul className="mt-3 space-y-2">
            {eta.length > 0 ? (
              eta.map((e, idx) => (
                <li
                  key={idx}
                  className="flex justify-between bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span className="font-medium text-blue-600">
                    Route {e.route} → {e.dest_en}
                  </span>
                  <span className="text-gray-700">
                    {e.eta
                      ? new Date(e.eta).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "No ETA"}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No ETA available</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}