import React from "react";
import RouteTag from "../ui/RouteTag";
import Countdown from "../ui/Countdown";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./ETATable.module.css";

const getLangField = (item, fieldPrefix, lang) => {
  if (!item) return "";
  if (lang === "tc" && item[`${fieldPrefix}_tc`]) return item[`${fieldPrefix}_tc`];
  if (lang === "sc" && item[`${fieldPrefix}_sc`]) return item[`${fieldPrefix}_sc`];
  return item[`${fieldPrefix}_en`] || item[`${fieldPrefix}_tc`] || item[`${fieldPrefix}_sc`] || "";
};

const S_TABLE_TEXTS = {
    route: { en: "Rt.", tc: "路線", sc: "路线" },
    platform: { en: "Plat.", tc: "月台", sc: "月台" },
    destination: { en: "Destination", tc: "目的地", sc: "目的地" },
    eta1: { en: "ETA 1", tc: "預計1", sc: "预计1" },
    eta2: { en: "ETA 2", tc: "預計2", sc: "预计2" },
    eta3: { en: "ETA 3", tc: "預計3", sc: "预计3" },
    remarks: { en: "Remarks", tc: "備註", sc: "备注" },
    noArrivals: { en: "No ETA data available for this stop/filter at the moment.", tc: "暫無此站/篩選的到站時間資料。", sc: "暂无此站/筛选的到站时间资料。" },
};

const ETATable = ({ stopName, etas: consolidatedEtasFromMainPage, showPlatformCol }) => {
  const { language } = useSettings();
  const sTable = (key) => S_TABLE_TEXTS[key]?.[language] || S_TABLE_TEXTS[key]?.en;
  const remarkSymbols = ['*', '!', '^', '#', '$', '%'];

  if (!consolidatedEtasFromMainPage || consolidatedEtasFromMainPage.length === 0) {
    return (
      <div className={`${styles.etaTableContainer} fade-in-slide-up`}>
        {/*<h3>{stopName}</h3> ETATable no longer renders its own H3 title */}
        <p>{sTable("noArrivals")}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.etaTableContainer} fade-in-slide-up`}>
      <div className={styles.tableScrollWrapper}>
        <table className={styles.etaResultsTable}>
          <thead>
            <tr>
              <th>{sTable("route")}</th>
              {showPlatformCol && <th>{sTable("platform")}</th>}
              <th>{sTable("destination")}</th>
              <th>{sTable("eta1")}</th>
              <th>{sTable("eta2")}</th>
              <th>{sTable("eta3")}</th>
              <th>{sTable("remarks")}</th>
            </tr>
          </thead>
          <tbody>
            {consolidatedEtasFromMainPage.map((routeEntry, entryIndex) => {
              // routeEntry is an object like:
              // { route: '1A', dest_en: 'Star Ferry', etas: [ {eta: '...', rmk_*: '...'}, ... ], platform_display_name_for_column: 'P1', isErrorEntry?: boolean }

              if (routeEntry.isErrorEntry) {
                return (
                    <tr key={`error-${entryIndex}-${routeEntry.route}`} className={styles.errorRow}>
                        <td><RouteTag routeNumber={routeEntry.route || "Error"} /></td>
                        {showPlatformCol && <td>{routeEntry.platform_display_name_for_column || '-'}</td>}
                        <td colSpan={showPlatformCol ? 5 : 4}> {/* Adjusted colspan */}
                            Error: {routeEntry.dest_en /* This holds the error message */}
                        </td>
                    </tr>
                );
              }

              const timedEtasForDisplay = routeEntry.etas || []; // These are the actual up to 3 arrival objects
              const generalRouteRemark = getLangField(routeEntry, 'rmk', language); // General remark for the route itself

              // Case 1: Only a general remark for the route, no timed ETAs in its 'etas' array
              if (timedEtasForDisplay.length === 0 && generalRouteRemark) {
                return (
                  <tr key={`${routeEntry.route}-${entryIndex}-remarkonly`} className={styles.remarkOnlyRowFull}>
                    <td><RouteTag routeNumber={routeEntry.route} /></td>
                    {showPlatformCol && <td>{routeEntry.platform_display_name_for_column || '-'}</td>}
                    <td className={styles.destinationCell}>{getLangField(routeEntry, 'dest', language)}</td>
                    <td colSpan="4" className={styles.fullWidthRemarkText}>
                        {generalRouteRemark}
                    </td>
                  </tr>
                );
              }
              
              // If no timed ETAs and no general remark, don't render the row (should be filtered by MainPage)
              if (timedEtasForDisplay.length === 0) return null;


              // Case 2: Has timed ETAs (and potentially specific remarks on those ETAs)
              const allRemarksForDisplay = new Map();
              let remarkSymbolIndex = 0;
              timedEtasForDisplay.forEach(etaArr => {
                const remarkText = getLangField(etaArr, 'rmk', language);
                // Only add distinct, non-"Scheduled Bus" remarks to the map for symbol assignment
                const isScheduledOnlyRemark = remarkText === "Scheduled Bus" || remarkText === "原定班次";
                if (remarkText && !isScheduledOnlyRemark && !allRemarksForDisplay.has(remarkText)) {
                    allRemarksForDisplay.set(remarkText, remarkSymbols[remarkSymbolIndex % remarkSymbols.length]);
                    remarkSymbolIndex++;
                }
              });

              return (
                <tr key={`${routeEntry.route}-${getLangField(routeEntry, 'dest', 'en')}-${entryIndex}`}>
                  <td><RouteTag routeNumber={routeEntry.route} /></td>
                  {showPlatformCol && <td>{routeEntry.platform_display_name_for_column || '-'}</td>}
                  <td className={styles.destinationCell}>{getLangField(routeEntry, 'dest', language)}</td>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <td key={i}>
                      {timedEtasForDisplay[i] && timedEtasForDisplay[i].eta ? (
                        <Countdown
                          etaTimestamp={timedEtasForDisplay[i].eta}
                          remark={getLangField(timedEtasForDisplay[i], 'rmk', language)} // Pass full remark to Countdown
                          hasSpecificRemark={ // True if this ETA has a remark that's not just "Scheduled Bus" and is in our map
                              !!getLangField(timedEtasForDisplay[i], 'rmk', language) &&
                              !(getLangField(timedEtasForDisplay[i], 'rmk', language) === "Scheduled Bus" || getLangField(timedEtasForDisplay[i], 'rmk', language) === "原定班次") &&
                              allRemarksForDisplay.has(getLangField(timedEtasForDisplay[i], 'rmk', language))
                          }
                        />
                      ) : "-"}
                    </td>
                  ))}
                  <td className={styles.remarksCell}>
                    {Array.from(allRemarksForDisplay.entries()).map(([text, symbol]) => (
                      <p key={text} className={styles.remarkEntry}>
                        <span className={styles.remarkSymbol}>{symbol}</span> {text}
                      </p>
                    ))}
                    {allRemarksForDisplay.size === 0 && "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ETATable;
