import React from "react";
import Footer from "./Footer"; // Assuming you still want the footer

const Layout = ({ children }) => {
  return (
    <>
      {/* The main content will be wrapped by .app-container inside MainPage or App.jsx */}
      {children}
      <Footer />
    </>
  );
};

export default Layout;
