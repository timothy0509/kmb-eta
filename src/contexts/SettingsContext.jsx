import React, { createContext, useState, useEffect, useContext } from "react";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [etaDisplayMode, setEtaDisplayMode] = useState(
    () => localStorage.getItem("kmb-eta-display-mode") || "countdown" // 'countdown' or 'exact'
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("kmb-language") || "en" // 'en', 'tc', 'sc'
  );

  useEffect(() => {
    localStorage.setItem("kmb-eta-display-mode", etaDisplayMode);
  }, [etaDisplayMode]);

  useEffect(() => {
    localStorage.setItem("kmb-language", language);
  }, [language]);

  const value = {
    etaDisplayMode,
    setEtaDisplayMode,
    language,
    setLanguage,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
