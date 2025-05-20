import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext"; // Import useSettings

const calculateRemainingTime = (etaTimestamp, language) => {
  if (!etaTimestamp) return { text: "N/A", exact: "N/A", isDue: false, isScheduled: false };

  const now = new Date().getTime();
  const etaDate = new Date(etaTimestamp);
  const etaTime = etaDate.getTime();
  const diff = etaTime - now;

  const options = { hour: '2-digit', minute: '2-digit', hour12: false };
  let exactTimeStr = "N/A";
  try {
    // Attempt to format, catch errors for invalid dates from API
    exactTimeStr = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language === 'tc' ? 'zh-HK' : 'zh-CN', options).format(etaDate);
  } catch (e) {
    console.warn("Invalid date for exact time formatting:", etaTimestamp);
  }


  if (diff <= 0) {
    return { text: "Due", exact: exactTimeStr, isDue: true, isScheduled: false };
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    text: `${minutes} min ${seconds < 10 ? "0" : ""}${seconds} sec`,
    exact: exactTimeStr,
    isDue: false,
    isScheduled: false,
  };
};

export const useCountdown = (etaTimestamp, remark) => {
  const { language } = useSettings(); // Get language from settings
  const [remainingTime, setRemainingTime] = useState(
    calculateRemainingTime(etaTimestamp, language) // Pass language
  );

  useEffect(() => {
    if (!etaTimestamp || remainingTime.isDue) {
      let initialCalc = calculateRemainingTime(etaTimestamp, language);
      if (remark && remark.toLowerCase().includes("scheduled")) {
        initialCalc.isScheduled = true;
      }
      setRemainingTime(initialCalc);
      return;
    }

    const intervalId = setInterval(() => {
      let newCalc = calculateRemainingTime(etaTimestamp, language);
      if (remark && remark.toLowerCase().includes("scheduled")) {
        newCalc.isScheduled = true;
      }
      setRemainingTime(newCalc);

      if (newCalc.isDue) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [etaTimestamp, remark, remainingTime.isDue, language]); // Add language

  return remainingTime;
};
