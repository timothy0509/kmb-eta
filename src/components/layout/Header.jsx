import React from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";

const Header = () => {
  const navigate = useNavigate();

  const handleSettingsClick = (e) => {
    createRipple(e);
    navigate("/settings");
  };

  // Ripple effect utility (can be moved to a utils file)
  const createRipple = (event) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }
    button.appendChild(circle);
  };


  return (
    <header className={styles.header}>
      <div className={`${styles.container} container`}>
        <Link to="/" className={styles.logo}>
          KMB ETA
        </Link>
        <button
          onClick={handleSettingsClick}
          className={styles.settingsButton}
          aria-label="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
