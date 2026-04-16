/**
 * openclawadmin — routing: landing, classic workspace, workflow studio.
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

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConfigEditorProvider } from "./context/ConfigEditorContext";
import { ClassicWorkspace } from "./classic/ClassicWorkspace";
import { StudioWorkflow } from "./studio/StudioWorkflow";
import { Landing } from "./Landing";

export function App() {
  return (
    <BrowserRouter>
      <ConfigEditorProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/classic" element={<ClassicWorkspace />} />
          <Route path="/studio" element={<StudioWorkflow />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConfigEditorProvider>
    </BrowserRouter>
  );
}
