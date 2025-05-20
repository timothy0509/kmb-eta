import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchStopList, fetchStopEta } from "../services/kmbApi"; // Ensure processRawEtaData is used by fetchStopEta
import ETATable from "../components/eta/ETATable";
import { useSettings } from "../contexts/SettingsContext";
import { useTheme } from "../hooks/useTheme";
import styles from "./MainPage.module.css";

// Helper for language-specific fields
const getLangField = (item, fieldPrefix, lang) => {
  if (!item) return "";
  if (lang === "tc" && item[`${fieldPrefix}_tc`]) return item[`${fieldPrefix}_tc`];
  if (lang === "sc" && item[`${fieldPrefix}_sc`]) return item[`${fieldPrefix}_sc`];
  return item[`${fieldPrefix}_en`] || item[`${fieldPrefix}_tc`] || item[`${fieldPrefix}_sc`] || "";
};

const S_MAIN_TEXTS = {
  mainTitle: { en: "KMB Real-Time Bus ETA", tc: "九巴實時到站時間", sc: "九巴实时到站时间" },
  darkModeLabel: { en: "Dark Mode", tc: "深色模式", sc: "深色模式" },
  etaCountdownLabel: { en: "ETA Countdown", tc: "到站時間倒數", sc: "到站时间倒数" },
  settingsTitle: { en: "Settings", tc: "設定", sc: "设定" },
  stopNameLabel: { en: "Bus Stop Name (EN/CN):", tc: "巴士站名稱 (中/英):", sc: "巴士站名称 (中/英):" },
  stopNamePlaceholder: { en: "e.g., Tsim Sha Tsui or 尖沙咀", tc: "例如: 旺角 或 Mong Kok", sc: "例如: 旺角 或 Mong Kok" },
  filterRoutesLabel: { en: "Filter Routes (optional):", tc: "篩選路線 (可選):", sc: "筛选路线 (可选):" },
  filterRoutesPlaceholder: { en: "e.g., 1A, 271", tc: "例如: 1A, 968", sc: "例如: 1A, 968" },
  smartGroupingLabel: { en: "Smart Grouping", tc: "智能分組", sc: "智能分组" },
  searchButton: { en: "Search ETAs", tc: "搜尋到站時間", sc: "搜寻到站时间" },
  searchingButton: { en: "Searching...", tc: "搜尋中...", sc: "搜寻中..." },
  enterStopNameToBegin: { en: "Enter a stop name to begin.", tc: "請輸入巴士站名稱以開始搜尋。", sc: "请输入巴士站名称以开始搜寻。" },
  legendTitle: { en: "Legend:", tc: "圖例:", sc: "图例:" },
  legendScheduled: { en: "Grey Text / Italic: Scheduled Bus", tc: "灰色文字 / 斜體: 預定班次", sc: "灰色文字 / 斜体: 预定班次" },
  legendAsterisk: { en: "* (next to ETA): Remark applies to this specific arrival. See details in Remarks column.", tc: "* (於預計到達時間旁): 備註適用於此特定班次。詳情請見「備註」欄。", sc: "* (于预计到达时间旁): 备注适用于此特定班次。详情请见“备注”栏。" },
  legendRouteColors: { en: "Route colors indicate service type (e.g., Overnight, Airport).", tc: "路線顏色標示服務類型 (例如: 通宵線, 機場線)。", sc: "路线颜色标示服务类型 (例如: 通宵线, 机场线)。" },
  errorNoStopsFound: { en: "No stops found matching", tc: "找不到符合的巴士站", sc: "找不到符合的巴士站" },
  errorTooManyStops: { en: "Over 20 stops found for", tc: "找到超過20個相關巴士站", sc: "找到超过20个相关巴士站" }, // You can adjust this limit
  errorPleaseBeSpecific: { en: "Please be more specific.", tc: "請提供更詳細的名稱。", sc: "请提供更详细的名称。" },
  errorFailedToLoadStops: { en: "Failed to load bus stop list. Please try refreshing.", tc: "載入巴士站列表失敗，請刷新頁面再試。", sc: "载入巴士站列表失败，请刷新页面再试。" },
  errorFetchingEtas: { en: "An error occurred while fetching ETAs.", tc: "擷取到站時間時發生錯誤。", sc: "撷取到站时间时发生错误。" },
  errorStopListNotLoaded: { en: "Stop list not loaded yet. Please wait or try refreshing.", tc: "巴士站列表尚未載入，請稍候或刷新頁面。", sc: "巴士站列表尚未载入，请稍候或刷新页面。" },
  loadingResults: { en: "Loading results...", tc: "載入結果中...", sc: "载入结果中..." },
  noEtasFoundForQuery: { en: "No ETAs found for", tc: "找不到到站時間", sc: "找不到到站时间" },
  withRoutes: { en: "with routes", tc: "，路線", sc: "，路线" },
};

const MainPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, etaDisplayMode, setEtaDisplayMode } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const sMain = (key) => S_MAIN_TEXTS[key]?.[language] || S_MAIN_TEXTS[key]?.en;

  const [stopQuery, setStopQuery] = useState("");
  const [routeQuery, setRouteQuery] = useState("");
  const [smartGrouping, setSmartGrouping] = useState(true);

  const [allStops, setAllStops] = useState([]);
  const [searchResults, setSearchResults] = useState([]); // Array of groups for ETATable
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(sMain("enterStopNameToBegin"));
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    setStatusMessage(sMain("enterStopNameToBegin"));
  }, [language, sMain]);

  useEffect(() => {
    const loadStops = async () => {
      try {
        const cachedStops = localStorage.getItem("kmb-all-stops");
        const cacheTime = localStorage.getItem("kmb-all-stops-time");
        const ONE_DAY_MS = 23 * 60 * 60 * 1000;

        if (cachedStops && cacheTime && (Date.now() - parseInt(cacheTime)) < ONE_DAY_MS) {
          setAllStops(JSON.parse(cachedStops));
        } else {
          const stops = await fetchStopList();
          setAllStops(stops);
          localStorage.setItem("kmb-all-stops", JSON.stringify(stops));
          localStorage.setItem("kmb-all-stops-time", Date.now().toString());
        }
      } catch (e) {
        setStatusMessage(sMain("errorFailedToLoadStops"));
        setMessageType("error");
      }
    };
    loadStops();
  }, [sMain]);

  const parseQueryFromURL = (qParam) => {
    if (!qParam) return { routes: "", stop: "" };
    const parts = qParam.split("%20@%20");
    if (parts.length === 2) {
      return { routes: decodeURIComponent(parts[0]), stop: decodeURIComponent(parts[1]) };
    } else if (qParam.includes("%20@%20")) { // Only stop name after @
      return { routes: "", stop: decodeURIComponent(parts[0]) };
    }
     // If no "@" assume it's a stop name or route
    if (/^[A-Za-z0-9,]+$/.test(qParam) && !/[\u4e00-\u9fa5]/.test(qParam) && !qParam.includes(" ")) {
        return { routes: decodeURIComponent(qParam), stop: "" };
    }
    return { routes: "", stop: decodeURIComponent(qParam) };
  };

  const getSmartGroupName = (stopNameInput) => {
    if (!stopNameInput) return "Unknown Stop";
    const stopName = String(stopNameInput);
    return stopName.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*（.*?）\s*/g, "").trim() || "Unnamed Stop Group";
  };

  const getPlatformDisplayFromStop = (stopInfo, groupNameKey) => {
    const originalName = getLangField(stopInfo, 'name', language); // Use current display language
    const groupNameForDisplay = getSmartGroupName(originalName); // Get group name in current display language

    // If the display group name matches the key (which was derived from EN/TC/SC),
    // then extract the platform part from the original display name.
    if (groupNameForDisplay.toLowerCase() === groupNameKey.toLowerCase() || groupNameKey.includes(groupNameForDisplay)) {
        let platformPart = originalName.replace(groupNameForDisplay, "").trim();
        platformPart = platformPart.replace(/^\((.*)\)$/, "$1").replace(/^（(.*)）$/, "$1").trim();
        return platformPart || null;
    }
    // Fallback if names don't align perfectly (e.g. language mismatch in grouping key vs display)
    return originalName.includes("(") ? originalName.substring(originalName.indexOf("(")) : null;
  };

  const handleSearch = useCallback(async (event, initialStopQuery = stopQuery, initialRouteQuery = routeQuery) => {
    if (event) event.preventDefault();
    if (!initialStopQuery.trim()) {
      setStatusMessage(sMain("enterStopNameToBegin"));
      setMessageType("info");
      setSearchResults([]);
      return;
    }
    if (allStops.length === 0) {
        setStatusMessage(sMain("errorStopListNotLoaded"));
        setMessageType("error");
        return;
    }

    setLoading(true);
    setStatusMessage(sMain("searchingButton"));
    setMessageType("loading");
    setSearchResults([]);

    const newSearchParams = new URLSearchParams();
    let qValue = "";
    if (initialRouteQuery.trim() && initialStopQuery.trim()) {
        qValue = `${encodeURIComponent(initialRouteQuery.trim())}%20@%20${encodeURIComponent(initialStopQuery.trim())}`;
    } else if (initialStopQuery.trim()) {
        qValue = encodeURIComponent(initialStopQuery.trim());
    }
    if (qValue) newSearchParams.set("q", qValue);
    navigate(`?${newSearchParams.toString()}`, { replace: true });

    const queryLower = initialStopQuery.toLowerCase();
    let filteredStops = allStops.filter(
        (stop) =>
        stop.name_en?.toLowerCase().includes(queryLower) ||
        stop.name_tc?.includes(initialStopQuery) ||
        stop.name_sc?.includes(initialStopQuery)
    );

    if (filteredStops.length === 0) {
      setStatusMessage(`${sMain("errorNoStopsFound")} "${initialStopQuery}".`);
      setMessageType("error");
      setLoading(false);
      return;
    }
    if (filteredStops.length > 20) { // Example limit
        setStatusMessage(`${sMain("errorTooManyStops")} "${initialStopQuery}". ${sMain("errorPleaseBeSpecific")}`);
        setMessageType("error");
        setLoading(false);
        return;
    }

    try {
      const resultsPromises = filteredStops.map(async (stop) => {
        try {
          let etas = await fetchStopEta(stop.stop); // fetchStopEta returns processed ETAs
          if (initialRouteQuery.trim()) {
            const searchRoutes = initialRouteQuery.split(",").map(r => r.trim().toUpperCase());
            etas = etas.filter(etaGroup => searchRoutes.includes(etaGroup.route.toUpperCase()));
          }
          return { stopInfo: stop, processedEtas: etas, error: null }; // Store processed ETAs
        } catch (e) {
          return { stopInfo: stop, processedEtas: [], error: e.message };
        }
      });

      let resultsWithEtas = (await Promise.all(resultsPromises))
                             .filter(r => r.processedEtas.length > 0 || r.error);

      if (resultsWithEtas.length === 0 && filteredStops.length > 0) {
        setStatusMessage(`${sMain("noEtasFoundForQuery")} "${initialStopQuery}"` + (initialRouteQuery.trim() ? ` ${sMain("withRoutes")} "${initialRouteQuery}"` : "") + ".");
        setMessageType("info");
      } else if (resultsWithEtas.length > 0) {
        setStatusMessage("");
      }

      if (smartGrouping) {
        const groupedStopsByName = {};
        resultsWithEtas.forEach(res => {
            const groupNameKey = getSmartGroupName(res.stopInfo.name_en || res.stopInfo.name_tc || res.stopInfo.name_sc);
            const displayGroupName = getSmartGroupName(getLangField(res.stopInfo, 'name', language));

            if (!groupedStopsByName[groupNameKey]) {
                groupedStopsByName[groupNameKey] = {
                    groupNameForDisplay: displayGroupName,
                    platformsData: [],
                };
            }
            groupedStopsByName[groupNameKey].platformsData.push({
                stopInfo: res.stopInfo,
                processedEtas: res.processedEtas, // Already processed
                platformForColumnDisplay: getPlatformDisplayFromStop(res.stopInfo, groupNameKey),
                error: res.error,
            });
        });

        const finalGroupedResults = Object.values(groupedStopsByName).map(group => {
            const distinctPlatforms = new Set(
                group.platformsData.map(p => p.platformForColumnDisplay).filter(Boolean)
            );
            const showPlatformCol = distinctPlatforms.size > 1;

            // Consolidate all ETAs from all platforms within this smart group
            const allEtasForGroupTable = group.platformsData.reduce((acc, platform) => {
                if (platform.processedEtas && platform.processedEtas.length > 0) {
                    platform.processedEtas.forEach(routeEtaGroup => {
                        acc.push({
                            ...routeEtaGroup,
                            platform_display_name_for_column: showPlatformCol ? (platform.platformForColumnDisplay || getLangField(platform.stopInfo, 'name', language)) : null
                        });
                    });
                } else if (platform.error) {
                    acc.push({
                        route: `Error: ${platform.platformForColumnDisplay || getLangField(platform.stopInfo, 'name', language)}`,
                        dest_en: platform.error.substring(0, 50) + "...",
                        etas: [],
                        isErrorEntry: true,
                        platform_display_name_for_column: showPlatformCol ? (platform.platformForColumnDisplay || getLangField(platform.stopInfo, 'name', language)) : null
                    });
                }
                return acc;
            }, []);
            // Re-sort consolidated ETAs if needed (processRawEtaData already sorts by route)
            allEtasForGroupTable.sort((a, b) => { /* ... your preferred sorting ... */
                if (a.isErrorEntry && !b.isErrorEntry) return 1;
                if (!a.isErrorEntry && b.isErrorEntry) return -1;
                if (a.isErrorEntry && b.isErrorEntry) return 0;
                // Add more sorting logic if needed, e.g. by route, then platform
                return (a.route || "").localeCompare(b.route || "", undefined, {numeric: true});
            });


            return {
                groupName: group.groupNameForDisplay,
                consolidatedEtas: allEtasForGroupTable,
                showPlatformCol: showPlatformCol,
            };
        }).filter(g => g.consolidatedEtas.length > 0); // Only keep groups with something to show
        setSearchResults(finalGroupedResults);

      } else { // No smart grouping
        setSearchResults(resultsWithEtas.map(r => ({
            groupName: getLangField(r.stopInfo, 'name', language),
            consolidatedEtas: r.processedEtas.map(etaGroup => ({...etaGroup, platform_display_name_for_column: null })), // Add null platform
            showPlatformCol: false,
        })).filter(g => g.consolidatedEtas.length > 0));
      }

    } catch (e) {
      setStatusMessage(sMain("errorFetchingEtas"));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [allStops, stopQuery, routeQuery, smartGrouping, navigate, language, sMain]);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && allStops.length > 0) {
      const { routes, stop } = parseQueryFromURL(qParam);
      setRouteQuery(routes);
      setStopQuery(stop);
      handleSearch(null, stop, routes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allStops]); // handleSearch removed

  const goToSettings = () => navigate("/settings");

  return (
    <div className="app-container">
      <div className={styles.headerControls}>
        <h1>{sMain("mainTitle")}</h1>
        <div className={styles.toggleContainer}>
          <div className={styles.themeSwitchWrapper}>
            <label className={styles.themeSwitch} htmlFor="darkModeToggle">
              <input type="checkbox" id="darkModeToggle" checked={theme === "dark"} onChange={toggleTheme} />
              <span className={`${styles.slider} ${styles.round}`}></span>
            </label>
            <span className={styles.themeLabel}>{sMain("darkModeLabel")}</span>
          </div>
          <div className={styles.themeSwitchWrapper}>
            <label className={styles.themeSwitch} htmlFor="countdownToggle">
              <input type="checkbox" id="countdownToggle" checked={etaDisplayMode === "countdown"} onChange={() => setEtaDisplayMode(etaDisplayMode === "countdown" ? "exact" : "countdown")} />
              <span className={`${styles.slider} ${styles.round}`}></span>
            </label>
            <span className={styles.themeLabel}>{sMain("etaCountdownLabel")}</span>
          </div>
          <button onClick={goToSettings} className={styles.settingsPageButton} aria-label={sMain("settingsTitle")} title={sMain("settingsTitle")}>
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className={styles.controlsForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="stop-name-input">{sMain("stopNameLabel")}</label>
          <input type="text" id="stop-name-input" value={stopQuery} onChange={(e) => setStopQuery(e.target.value)} placeholder={sMain("stopNamePlaceholder")} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="route-filter-input">{sMain("filterRoutesLabel")}</label>
          <input type="text" id="route-filter-input" value={routeQuery} onChange={(e) => setRouteQuery(e.target.value)} placeholder={sMain("filterRoutesPlaceholder")} />
        </div>
        <div className={styles.groupingControl}>
          <input type="checkbox" id="smart-grouping-checkbox" checked={smartGrouping} onChange={(e) => setSmartGrouping(e.target.checked)} />
          <label htmlFor="smart-grouping-checkbox">{sMain("smartGroupingLabel")}</label>
        </div>
        <button type="submit" disabled={loading || allStops.length === 0}>
          {loading ? sMain("searchingButton") : sMain("searchButton")}
        </button>
      </form>

      {statusMessage && (
        <div className={`${styles.statusMessages} ${styles[`status-${messageType}`]} ${statusMessage ? styles.statusVisible : ''}`}>
          {statusMessage}
        </div>
      )}

      <div className={styles.etaResultsArea}>
        {searchResults.map((group, groupIndex) => (
            group.consolidatedEtas.length > 0 ? // Only render if there's something to show for the group
            <div key={group.groupName + groupIndex} className="fade-in-slide-up">
                <h2 className={styles.groupTitle}>{group.groupName}</h2>
                <ETATable
                    stopName={group.groupName} // The ETATable title is the smart group name
                    etas={group.consolidatedEtas} // Pass the already processed and annotated ETAs
                    showPlatformCol={group.showPlatformCol}
                />
            </div>
            : null
        ))}
      </div>

      <div className={styles.legend}>
        <p><strong>{sMain("legendTitle")}</strong></p>
        <p><span className={styles.scheduledEtaLegend}>{sMain("legendScheduled")}</span></p>
        <p>{sMain("legendAsterisk")}</p>
        <p>{sMain("legendRouteColors")}</p>
      </div>
    </div>
  );
};

export default MainPage;
