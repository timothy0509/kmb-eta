import React from "react";
import { useCountdown } from "../../hooks/useCountdown";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./Countdown.module.css";

const Countdown = ({ etaTimestamp, remark, hasSpecificRemark }) => {
  const { etaDisplayMode } = useSettings();
  // Pass remark to useCountdown so it knows if it's a scheduled bus
  const { countdownText, exactTimeText, isDue, isScheduled } = useCountdown(etaTimestamp, remark);

  let className = styles.countdown;
  if (isDue) {
    className += ` ${styles.due}`;
  } else if (isScheduled && etaDisplayMode === "countdown") { // Apply italic if scheduled AND in countdown mode
    className += ` ${styles.scheduledItalic}`;
  }

  let displayValue =
    etaDisplayMode === "exact" && !isDue ? exactTimeText : countdownText;

  if (hasSpecificRemark && !isDue) {
    displayValue += "*";
  }

  return <span className={className}>{displayValue}</span>;
};

export default Countdown;
