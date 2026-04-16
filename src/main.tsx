/**
 * openclawadmin — React application entry.
 *
 * DISCLAIMER: This software is provided “as is”, without express or implied warranty.
 * You are solely responsible for configuration backups, validation, credential handling,
 * and any impact on your OpenClaw gateway or related systems. This project is an
 * unofficial administrative helper and is not affiliated with or endorsed by the
 * OpenClaw project or its authors unless separately stated.
 *
 * Maintainer
 *   Name: Lalit Nayyar
 *   Email: lalitnayyar@gmail.com
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
