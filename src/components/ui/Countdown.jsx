import React from "react";
import { useCountdown } from "../../hooks/useCountdown";
import { useSettings } from "../../contexts/SettingsContext"; // Import
import styles from "./Countdown.module.css";

const Countdown = ({ etaTimestamp, remark }) => {
  const { etaDisplayMode } = useSettings(); // Get display mode
  const { text, exact, isDue, isScheduled } = useCountdown(etaTimestamp, remark);

  let className = styles.countdown;
  if (isDue) className += ` ${styles.due}`;
  if (isScheduled && !isDue && etaDisplayMode === 'countdown') className += ` ${styles.scheduled}`; // Only show scheduled style for countdown

  const displayValue = etaDisplayMode === "exact" && !isDue ? exact : text;

  return <span className={className}>{displayValue}</span>;
};

export default Countdown;
