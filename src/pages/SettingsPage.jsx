import React from "react";
import { useTheme } from "../hooks/useTheme";
import { useSettings } from "../contexts/SettingsContext";
import styles from "./SettingsPage.module.css";

// Basic i18n object for labels, can be expanded
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


  const handleRipple = (event) => {
    const button = event.currentTarget;
    // Simple ripple, can be extracted to a util
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    const existingRipple = button.querySelector(".ripple");
    if (existingRipple) existingRipple.remove();
    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };


  return (
    <div className={`${styles.settingsPage} fade-in-slide-up`}>
      <h1>{s("title")}</h1>

      <section className={`${styles.settingsSection} card`}>
        <h2>{s("appearance")}</h2>
        <div className={styles.settingItem}>
          <span>{s("darkMode")}</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </section>

      <section className={`${styles.settingsSection} card`}>
        <h2>{s("etaDisplay")}</h2>
        <div className={styles.settingItem}>
          <span>{s("etaDisplayMode")}</span>
          <div className={styles.radioGroup}>
            <label onClick={handleRipple}>
              <input
                type="radio"
                name="etaDisplayMode"
                value="countdown"
                checked={etaDisplayMode === "countdown"}
                onChange={(e) => setEtaDisplayMode(e.target.value)}
              />{" "}
              {s("countdown")}
            </label>
            <label onClick={handleRipple}>
              <input
                type="radio"
                name="etaDisplayMode"
                value="exact"
                checked={etaDisplayMode === "exact"}
                onChange={(e) => setEtaDisplayMode(e.target.value)}
              />{" "}
              {s("exactTime")}
            </label>
          </div>
        </div>
      </section>

      <section className={`${styles.settingsSection} card`}>
        <h2>{s("language")}</h2>
        <div className={styles.settingItem}>
          <span>{s("language")}</span>
          <select
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
  );
};

export default SettingsPage;
