## Summary

Initial delivery of **openclawadmin**: an unofficial web UI and Express API to edit OpenClaw `openclaw.json` (JSON5) with optional `openclaw config validate` integration, gateway HTTP probe, and structured editors for channels, plugins, and agents.

## What’s included

- **Frontend (React + Vite):** Raw JSON5 editor, **Browse** tab (file-explorer style channel list + expandable key/value tree with sensitive-field masking), **Channels** / **Plugins** / **Agents** merge tabs, gateway URL + config path (localStorage), validate & save controls, disclaimer footer.
- **Backend (Express):** `GET/PUT /api/config`, `POST /api/config/validate`, `GET /api/gateway/probe`, `GET /api/health`; `~` path expansion; temp-file CLI validation; production static serve from `dist/`.
- **Docs:** `README.md` (operations), `AGENTS.md` (requirements + agent context).
- **Attribution:** Maintainer Lalit Nayyar; disclaimer in UI, headers, and `package.json`.

## References

- [OpenClaw documentation](https://docs.openclaw.ai/)
- [Configuration](https://docs.openclaw.ai/configuration)
- [CLI `config`](https://docs.openclaw.ai/cli/config)

## Test plan

1. `npm install && npm run dev`
2. Set gateway URL and config path, reload file, validate, save (with `openclaw` on PATH when possible).
