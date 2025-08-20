import React, { useEffect, useMemo, useState } from "react";
import { parseStopName } from "../utils/stopParser";
import { parseRoute, getRouteStyle } from "../utils/routeParser";

/**
 * ETAList.jsx (updated)
 * - uses useCountdown prop (global default from Settings)
 * - consumes pinnedKeys and onTogglePin from App
 * - rows include data-row-key attribute to allow scroll-to-row
 * - removed header countdown toggle (moved to Settings)
 */

export default function ETAList({
  results = [],
  language = "en",
  highlightMap = {},
  highlightDuration = 2000,
  reducedMotion = false,
  pinnedKeys = {},
  onTogglePin = () => {},
  useCountdown = false,
  onRowClick = () => {},
}) {
  const [now, setNow] = useState(new Date());
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatETAObject = (etaStr) => {
    if (!etaStr) return { text: "—", expired: true, raw: null };
    const etaDate = new Date(etaStr);
    const diff = etaDate - now;
    const expired = diff <= 0;
    if (useCountdown) {
      if (expired) return { text: "Expired", expired: true, raw: etaStr };
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return { text: `${mins}m ${secs}s`, expired: false, raw: etaStr };
    } else {
      return {
        text: etaDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        expired,
        raw: etaStr,
      };
    }
  };

  const grouped = useMemo(() => {
    return (results || []).map((entry) => {
      const rowsByKey = {};
      (entry.eta || []).forEach((e) => {
        const dest = e[`dest_${language}`] || e.dest_en || "";
        const parsed = parseStopName(entry.nameLangValue || "");
        const stopCode = parsed.stopCode || "";
        const key = `${e.route}|${dest}|${stopCode}`;
        if (!rowsByKey[key]) {
          rowsByKey[key] = {
            key,
            route: e.route,
            parsedRoute: parseRoute(e.route),
            dest,
            platform: parsed.platform,
            stopCode: parsed.stopCode,
            rawTimes: [],
            remarks: [],
            dataTimestamps: [],
          };
        }
        if (e.eta) {
          rowsByKey[key].rawTimes.push(e.eta);
          rowsByKey[key].dataTimestamps.push(new Date(e.data_timestamp).getTime());
        } else {
          const remark = e[`rmk_${language}`] || e.rmk_en || "";
          if (remark) rowsByKey[key].remarks.push(remark);
        }
      });

      const rows = Object.values(rowsByKey).map((r) => {
        const uniqueTimes = Array.from(new Set(r.rawTimes)).sort();
        return {
          ...r,
          etas: uniqueTimes.map((t) => formatETAObject(t)),
          lastTimestamp: r.dataTimestamps.length ? Math.max(...r.dataTimestamps) : null,
        };
      });

      return {
        stopRepresentative: entry.stopRepresentative,
        stopName: entry.stopName,
        nameLangValue: entry.nameLangValue,
        parsedStop: entry.parsedStop,
        rows,
      };
    });
  }, [results, language, now, useCountdown]);

  const isHighlighted = (rowKey) => {
    const ts = highlightMap[rowKey];
    if (!ts) return false;
    return Date.now() - ts < highlightDuration;
  };

  if (!results || results.length === 0) {
    return <p className="text-gray-500 mt-6">No results found.</p>;
  }

  return (
    <div className="space-y-6">
      {grouped.map((card, cardIndex) => {
        const stopKey = card.stopName || card.stopRepresentative.stop;
        const lastUpdated =
          card.rows && card.rows.length > 0
            ? new Date(Math.max(...card.rows.map((r) => r.lastTimestamp || 0)))
            : null;
        const collapsedState = !!collapsed[stopKey];

        return (
          <div
            key={stopKey}
            className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-out"
            style={{ animationDelay: `${cardIndex * 30}ms` }}
            id={`card-${encodeURIComponent(stopKey)}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {card.parsedStop.name}
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}`
                    : ""}
                </div>
                <button
                  onClick={() => setCollapsed((p) => ({ ...p, [stopKey]: !collapsedState }))}
                  className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700"
                >
                  {collapsedState ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedState ? "max-h-0 opacity-40" : "max-h-[2000px] opacity-100"}`}>
              <ul className="mt-3 space-y-2">
                {card.rows
                  .sort((a, b) => {
                    const pa = a.parsedRoute;
                    const pb = b.parsedRoute;
                    if (pa.prefix !== pb.prefix) {
                      if (!pa.prefix) return -1;
                      if (!pb.prefix) return 1;
                      return pa.prefix.localeCompare(pb.prefix);
                    }
                    if (pa.number !== pb.number) return pa.number - pb.number;
                    if (pa.suffix !== pb.suffix) {
                      if (!pa.suffix) return -1;
                      if (!pb.suffix) return 1;
                      return pa.suffix.localeCompare(pb.suffix);
                    }
                    return 0;
                  })
                  .sort((a, b) => {
                    if ((!a.etas || a.etas.length === 0) && (b.etas && b.etas.length > 0)) return 1;
                    if ((a.etas && a.etas.length > 0) && (!b.etas || b.etas.length === 0)) return -1;
                    return 0;
                  })
                  .map((row, rowIndex) => {
                    const rowKey = `${card.stopName}|${row.route}|${row.dest}|${row.stopCode || ""}`;
                    const highlight = isHighlighted(rowKey);
                    const pinned = !!pinnedKeys[rowKey];

                    return (
                      <li
                        key={row.key}
                        data-row-key={rowKey}
                        className={`grid grid-cols-12 items-center bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg transition-colors ${highlight ? "row-change" : ""}`}
                        style={{ animationDelay: `${rowIndex * 18}ms` }}
                        onClick={() => onRowClick(rowKey)}
                      >
                        {/* route badge */}
                        <div className="col-span-2 flex justify-start">
                          <span className={`px-2 py-1 rounded text-sm font-bold inline-flex items-center justify-center transform transition-transform duration-150 hover:scale-105 ${getRouteStyle(row.parsedRoute)}`}>
                            {row.route}
                          </span>
                        </div>

                        {/* destination + platform */}
                        <div className="col-span-6 flex flex-col">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              {row.dest}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onTogglePin(rowKey); }}
                              className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600"
                            >
                              {pinned ? "📌" : "pin"}
                            </button>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {row.platform ? `Platform: ${row.platform}` : ""}
                            {row.platform && row.stopCode ? " · " : ""}
                            {row.stopCode ? `Stop Code: ${row.stopCode}` : ""}
                          </span>
                        </div>

                        {/* ETAs */}
                        <div className="col-span-4 flex justify-end space-x-3">
                          {row.etas && row.etas.length > 0 ? (
                            row.etas.map((etaObj, idx) => {
                              const changed = highlightMap[rowKey];
                              const isChanged = changed && Date.now() - changed < 1500;
                              return (
                                <span
                                  key={idx}
                                  className={`whitespace-nowrap inline-block px-2 py-0.5 rounded text-sm transition transform hover:scale-105 ${etaObj.expired ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"} ${isChanged ? "updated-token" : ""}`}
                                  title={etaObj.raw || ""}
                                >
                                  {etaObj.text}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-red-500 dark:text-red-400 text-sm">
                              {row.remarks && row.remarks.length > 0 ? row.remarks.join(", ") : "No ETA"}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}