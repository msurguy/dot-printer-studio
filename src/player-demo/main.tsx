import React from "react";
import { createRoot } from "react-dom/client";
import { PlayerDemoApp } from "./playerDemoApp";
import "./playerDemo.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <PlayerDemoApp />
    </React.StrictMode>
  );
}
