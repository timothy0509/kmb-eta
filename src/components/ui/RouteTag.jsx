import React from "react";
import { getRouteStyle } from "../../utils/routeStyles";
import styles from "./RouteTag.module.css";

const RouteTag = ({ routeNumber }) => {
  const style = getRouteStyle(routeNumber);

  return (
    <span className={styles.routeTag} style={style}>
      {routeNumber}
    </span>
  );
};

export default RouteTag;
