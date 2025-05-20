import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SettingsButtonStandalone.module.css";

const SettingsButtonStandalone = () => {
  const navigate = useNavigate();

  const handleSettingsClick = (event) => {
    // Optional: Ripple effect
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple"); // Ensure 'ripple' class is defined in global.css or here

    const existingRipple = button.querySelector(".ripple");
    if (existingRipple) {
      existingRipple.remove();
    }
    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600); // Cleanup ripple

    navigate("/settings");
  };

  return (
    <button
      onClick={handleSettingsClick}
      className={styles.settingsButton}
      aria-label="Settings"
      title="Settings" // Tooltip for accessibility
    >
      <span className="material-symbols-outlined">settings</span>
    </button>
  );
};

export default SettingsButtonStandalone;
