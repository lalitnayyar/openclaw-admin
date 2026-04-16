## Summary

Adds a **second UI mode** (“Workflow studio”) alongside the **original classic workspace**, sharing the same **Express JSON backend** and `openclaw.json` buffer via `ConfigEditorProvider`.

## Changes

- **Routes:** `/` landing (pick mode), `/classic` tabbed editor, `/studio` guided workflow.
- **Shared state:** `src/context/ConfigEditorContext.tsx` — gateway URL, token, config path, editor text, load/validate/save/probe, merge helpers; `localStorage` shared across routes.
- **Classic:** `src/classic/ClassicWorkspace.tsx` — unchanged feature set (Raw JSON5, Browse, Channels, Plugins, Agents).
- **Studio:** `src/studio/StudioWorkflow.tsx` + `studio.css` — Connect → Sync → Channels (includes explorer) → Plugins → Agents → Blueprint → Ship.
- **Refactor:** `src/shared/panels.tsx`, `src/config/constants.ts`; `react-router-dom` dependency.
- **Docs:** README + AGENTS updated for dual UI.

## Test plan

1. `npm install && npm run dev`
2. Open `/` → choose Classic and Studio; confirm settings persist when switching.
3. Edit JSON in Classic; switch to Studio Blueprint step — same buffer.
4. Validate / save from either mode.
