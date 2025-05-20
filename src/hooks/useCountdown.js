import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";

const calculateRemainingTime = (etaTimestamp, language, remark) => { // Added remark here
  const isScheduledBus = remark === "Scheduled Bus" || remark === "原定班次";

  if (!etaTimestamp) {
    return {
      countdownText: "N/A",
      exactTimeText: "N/A",
      isDue: false,
      isScheduled: isScheduledBus, // Still note if it's scheduled even with no ETA
    };
  }

  const now = new Date().getTime();
  const etaDate = new Date(etaTimestamp);
  const etaTime = etaDate.getTime();
  const diff = etaTime - now;

  let exactTimeStr = "N/A";
  try {
    const hours = etaDate.getHours().toString().padStart(2, '0');
    const minutes = etaDate.getMinutes().toString().padStart(2, '0');
    const seconds = etaDate.getSeconds().toString().padStart(2, '0');
    exactTimeStr = `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.warn("Invalid date for exact time formatting:", etaTimestamp);
  }

  if (diff <= 0) {
    return {
      countdownText: diff < -30000 ? "Departed" : "Due", // 30 seconds threshold
      exactTimeText: exactTimeStr,
      isDue: true,
      isScheduled: isScheduledBus,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    countdownText: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, // mm:ss
    exactTimeText: exactTimeStr, // HH:mm:ss
    isDue: false,
    isScheduled: isScheduledBus,
  };
};

export const useCountdown = (etaTimestamp, remark) => {
  const { language } = useSettings();
  const [remainingTime, setRemainingTime] = useState(
    calculateRemainingTime(etaTimestamp, language, remark) // Pass remark
  );

  useEffect(() => {
    // Pass remark to calculateRemainingTime
    const initialCalc = calculateRemainingTime(etaTimestamp, language, remark);
    setRemainingTime(initialCalc);

    if (!etaTimestamp || initialCalc.isDue) {
      return; // No interval needed if no ETA or already due
    }

    const intervalId = setInterval(() => {
      const newCalc = calculateRemainingTime(etaTimestamp, language, remark);
      setRemainingTime(newCalc);
      if (newCalc.isDue) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [etaTimestamp, remark, language]); // Add remark and language to dependencies

  return remainingTime;
};
