import React from "react";
import { useTheme } from "../hooks/useTheme";
import { useSettings } from "../contexts/SettingsContext";
import styles from "./SettingsPage.module.css"; // We'll update this

// S_TEXTS from previous response (keep this)
const S_TEXTS = {
  title: { en: "Settings", tc: "設定", sc: "设定" },
  appearance: { en: "Appearance", tc: "外觀", sc: "外观" },
  darkMode: { en: "Dark Mode", tc: "深色模式", sc: "深色模式" },
  etaDisplay: { en: "ETA Display", tc: "到站時間顯示", sc: "到站时间显示" },
  countdown: { en: "Countdown", tc: "倒數計時", sc: "倒数计时" },
  exactTime: { en: "Exact Time", tc: "準確時間", sc: "准确时间" },
  language: { en: "Language", tc: "語言", sc: "语言" },
  english: { en: "English", tc: "英文", sc: "英文" },
  tradChinese: { en: "Traditional Chinese", tc: "繁體中文", sc: "繁体中文" },
  simChinese: { en: "Simplified Chinese", tc: "簡體中文", sc: "简体中文" },
};

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    etaDisplayMode,
    setEtaDisplayMode,
    language,
    setLanguage,
  } = useSettings();

  const s = (key) => S_TEXTS[key]?.[language] || S_TEXTS[key]?.en;

  return (
    <div className="app-container"> {/* Use the main app container for consistent padding/max-width */}
      <div className={`${styles.settingsContent} fade-in-slide-up`}>
        <h1 className={styles.pageTitle}>{s("title")}</h1>

        <section className={`${styles.settingsSectionCard}`}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-outlined">visibility</span>
            {s("appearance")}
          </h2>
          <div className={styles.settingItem}>
            <label htmlFor="darkModeToggleSetting" className={styles.settingLabel}>{s("darkMode")}</label>
            <div className={styles.themeSwitchWrapper}> {/* Re-using theme switch style */}
              <label className={styles.themeSwitch} htmlFor="darkModeToggleSetting">
                <input
                  type="checkbox"
                  id="darkModeToggleSetting"
                  checked={theme === "dark"}
                  onChange={toggleTheme}
                />
                <span className={`${styles.slider} ${styles.round}`}></span>
              </label>
            </div>
          </div>
        </section>

        <section className={`${styles.settingsSectionCard}`}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-outlined">timer</span>
            {s("etaDisplay")}
          </h2>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>{/* Intentionally blank or add a sub-label */}</span>
            <div className={styles.radioGroup}>
              <label className={`${styles.radioLabel} ${etaDisplayMode === 'countdown' ? styles.radioSelected : ''}`}>
                <input
                  type="radio"
                  name="etaDisplayMode"
                  value="countdown"
                  checked={etaDisplayMode === "countdown"}
                  onChange={(e) => setEtaDisplayMode(e.target.value)}
                />
                <span className="material-symbols-outlined">hourglass_empty</span>
                {s("countdown")}
              </label>
              <label className={`${styles.radioLabel} ${etaDisplayMode === 'exact' ? styles.radioSelected : ''}`}>
                <input
                  type="radio"
                  name="etaDisplayMode"
                  value="exact"
                  checked={etaDisplayMode === "exact"}
                  onChange={(e) => setEtaDisplayMode(e.target.value)}
                />
                <span className="material-symbols-outlined">schedule</span>
                {s("exactTime")}
              </label>
            </div>
          </div>
        </section>

        <section className={`${styles.settingsSectionCard}`}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-outlined">language</span>
            {s("language")}
          </h2>
          <div className={styles.settingItem}>
            <label htmlFor="languageSelectSetting" className={styles.settingLabel}>{s("language")}</label>
            <select
              id="languageSelectSetting"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={styles.languageSelect}
            >
              <option value="en">{s("english")}</option>
              <option value="tc">{s("tradChinese")}</option>
              <option value="sc">{s("simChinese")}</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
