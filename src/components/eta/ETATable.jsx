import React from "react";
import RouteTag from "../ui/RouteTag";
import Countdown from "../ui/Countdown";
import { useSettings } from "../../contexts/SettingsContext"; // Import
import styles from "./ETATable.module.css";

// Helper for language-specific fields
const getLangField = (item, fieldPrefix, lang) => {
  if (!item) return "";
  if (lang === "tc" && item[`${fieldPrefix}_tc`]) return item[`${fieldPrefix}_tc`];
  if (lang === "sc" && item[`${fieldPrefix}_sc`]) return item[`${fieldPrefix}_sc`];
  return item[`${fieldPrefix}_en`] || item[`${fieldPrefix}_tc`] || item[`${fieldPrefix}_sc`] || ""; // Fallback chain
};

const S_TABLE_TEXTS = {
    route: { en: "Route", tc: "路線", sc: "路线" },
    destination: { en: "Destination", tc: "目的地", sc: "目的地" },
    platform: { en: "Plat.", tc: "月台", sc: "月台" },
    eta1: { en: "ETA 1", tc: "預計到達 1", sc: "预计到达 1" },
    eta2: { en: "ETA 2", tc: "預計到達 2", sc: "预计到达 2" },
    eta3: { en: "ETA 3", tc: "預計到達 3", sc: "预计到达 3" },
    remarks: { en: "Remarks", tc: "備註", sc: "备注" },
    noArrivals: { en: "No upcoming bus arrivals or service information.", tc: "沒有即將到達的巴士或服務資訊。", sc: "没有即将到达的巴士或服务信息。" },
};


const ETATable = ({ stopName, etas, showPlatformCol, platformCode }) => {
  const { language } = useSettings(); // Get language
  const sTable = (key) => S_TABLE_TEXTS[key]?.[language] || S_TABLE_TEXTS[key]?.en;


  if (!etas || etas.length === 0) {
    return (
      <div className={`${styles.etaTableCard} card fade-in-slide-up`}>
        <h3>{stopName} {platformCode && `(${platformCode})`}</h3>
        <p>{sTable("noArrivals")}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.etaTableCard} card fade-in-slide-up`}>
      <h3>{stopName} {platformCode && `(${platformCode})`}</h3>
      <div className={styles.tableWrapper}> {/* Wrapper for responsive scroll */}
        <table className={styles.etaTable}>
          <thead>
            <tr>
              <th>{sTable("route")}</th>
              <th>{sTable("destination")}</th>
              {showPlatformCol && !platformCode && <th>{sTable("platform")}</th>}
              <th>{sTable("eta1")}</th>
              <th>{sTable("eta2")}</th>
              <th>{sTable("eta3")}</th>
              <th>{sTable("remarks")}</th>
            </tr>
          </thead>
          <tbody>
            {etas.map((routeEta, index) => (
              <tr key={`${routeEta.route}-${routeEta.dir}-${index}`}>
                <td>
                  <RouteTag routeNumber={routeEta.route} />
                </td>
                <td>{getLangField(routeEta, 'dest', language)}</td>
                {showPlatformCol && !platformCode && <td>{routeEta.platform_code_display || 'N/A'}</td>}
                <td>
                  {routeEta.etas[0] ? (
                    <Countdown etaTimestamp={routeEta.etas[0].eta} remark={getLangField(routeEta.etas[0], 'rmk', language)} />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {routeEta.etas[1] ? (
                    <Countdown etaTimestamp={routeEta.etas[1].eta} remark={getLangField(routeEta.etas[1], 'rmk', language)} />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {routeEta.etas[2] ? (
                    <Countdown etaTimestamp={routeEta.etas[2].eta} remark={getLangField(routeEta.etas[2], 'rmk', language)} />
                  ) : (
                    "-"
                  )}
                </td>
                <td className={styles.remarks}>
                  {routeEta.etas[0] && getLangField(routeEta.etas[0], 'rmk', language)}
                  {!routeEta.etas[0] && routeEta.etas.length > 0 && getLangField(routeEta.etas[0], 'rmk', language)} {/* For remark-only entries */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ETATable;
