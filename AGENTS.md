# AGENTS.md — openclawadmin

This file is for **AI coding agents** and **human maintainers** who need the full **solution requirements**, architecture, and constraints in one place.

**Maintainer:** Lalit Nayyar — [lalitnayyar@gmail.com](mailto:lalitnayyar@gmail.com)

**DISCLAIMER:** This repository is an unofficial OpenClaw helper. Agents must not present it as official OpenClaw software. Preserve the disclaimer and maintainer attribution when adding new first-party source files unless the user directs otherwise.

---

## 1. Product intent (what “success” means)

| Requirement | Implementation status |
|-------------|------------------------|
| **Configure plugins, tools, and channels** in a professional UI | **Channels** tab (per-channel JSON blocks), **Plugins** tab (`enabled`, `allow`/`deny`, `load.paths`, `slots`, `entries`), **Agents & tools** tab (full `agents` JSON subtree). All merge into the **Raw JSON5** document (comments not preserved on merge). |
| **Update `openclaw.json` directly** with validation | **PUT `/api/config`** writes the resolved path after **JSON5 parse** and, by default, **`openclaw config validate --json`** on a temp file with `OPENCLAW_CONFIG_PATH` set. |
| **Validation aligned with OpenClaw** | Same CLI as documented in [Configuration](https://docs.openclaw.ai/configuration) / [CLI config](https://docs.openclaw.ai/cli/config). Optional **skip CLI** save path when `openclaw` is absent on the server. |
| **Master / gateway connection** (localhost or user-supplied IP) | UI fields: **Gateway base URL**, optional **token** (sent as `Authorization: Bearer` and `x-openclaw-token` on probe), **`openclaw.json` path**. Persisted in `localStorage`. Probe uses **GET `/api/gateway/probe`** (server-side `fetch` to avoid CORS). |
| **Browse existing configuration** (explorer UX) | **Browse** tab: sidebar lists `channels.*` keys; detail pane shows **expandable tree** of name/value; sensitive key names masked for string leaves. Reflects **in-memory editor buffer** (including unsaved edits). |
| **Attribution & disclaimer** | Footer in UI; file headers; `package.json` author/description; `/api/health` payload; see `src/lib/disclaimer.ts`. |

**Non-goals (unless explicitly requested later):**

- Replacing OpenClaw’s built-in Control UI schema forms or RPC `config.schema.lookup`.
- Multi-user auth, RBAC, or audit logging inside this repo.
- Writing to paths outside user intent (server trusts `path` from client — document risk).

---

## 2. Canonical external documentation

Agents should treat **OpenClaw’s docs** as the source of truth for config semantics:

| Topic | URL |
|-------|-----|
| Docs hub | [https://docs.openclaw.ai/](https://docs.openclaw.ai/) |
| Configuration | [https://docs.openclaw.ai/configuration](https://docs.openclaw.ai/configuration) |
| Configuration reference | [https://docs.openclaw.ai/gateway/configuration-reference](https://docs.openclaw.ai/gateway/configuration-reference) |
| CLI `config` (validate, schema) | [https://docs.openclaw.ai/cli/config](https://docs.openclaw.ai/cli/config) |
| Plugins | [https://docs.openclaw.ai/tools/plugin](https://docs.openclaw.ai/tools/plugin) |
| Channels index | [https://docs.openclaw.ai/channels/index](https://docs.openclaw.ai/channels/index) |

Config file location and JSON5 behavior are described in the Configuration page (`~/.openclaw/openclaw.json`).

---

## 3. Architecture

```
Browser (React + Vite)
  ├─ localStorage: gateway URL, token, config path
  └─ fetch("/api/…")  ──►  Express (server/index.ts)
                              ├─ fs read/write + path expand ~
                              ├─ child_process: openclaw config validate
                              └─ fetch: gateway HTTP probe
```

- **Development:** Vite **5173**, API **3847**, `vite.config.ts` proxies `/api` → `127.0.0.1:3847`.
- **Production:** Single Node process serves **`dist/`** static assets and `/api/*` (see `NODE_ENV` branch in `server/index.ts`).

---

## 4. Key source files (map for agents)

| Path | Responsibility |
|------|------------------|
| `server/index.ts` | Express app: health, config CRUD, validate, gateway probe; `OPENCLAWADMIN_PORT`, `OPENCLAW_CONFIG_PATH`; production static + SPA fallback. |
| `src/App.tsx` | Layout, tabs (Raw, Browse, Channels, Plugins, Agents), connection bar, validate/save, merge callbacks, disclaimer footer. |
| `src/components/ConfigExplorer.tsx` | File-explorer style **channels** browser + recursive tree, masking. |
| `src/lib/api.ts` | Typed `fetch` wrappers for `/api/*`. |
| `src/lib/merge.ts` | `parseConfig`, `setPath` for shallow merge of `channels` / `plugins` slices. |
| `src/lib/disclaimer.ts` | Exported strings for footer and future reuse. |
| `src/hooks/usePersistedState.ts` | `localStorage` sync hook. |
| `src/styles.css` | Global + explorer + disclaimer footer styles. |
| `vite.config.ts` | React plugin, dev proxy. |
| `tsconfig.json` / `tsconfig.server.json` | Client vs server compilation. |

---

## 5. API contract (agent implementation reference)

### `GET /api/health`

Returns `{ ok, service, disclaimer, maintainer }` for liveness and attribution.

### `GET /api/config?path=<optional>`

- Resolves `path` with `expandHome` or uses `OPENCLAW_CONFIG_PATH` / default `~/.openclaw/openclaw.json`.
- If missing: `{ exists: false, content: <starter>, parsed }`.
- If present: `{ exists: true, path, content, parsed }` or `400` with `parseError` if JSON5 invalid.

### `POST /api/config/validate`

Body: `{ "content": string }`. JSON5 parse then temp-file CLI validate. Response shapes include `ok`, `errors[]`, `cliSkipped`, etc.

### `PUT /api/config`

Body: `{ "path": string, "content": string, "skipCliValidation"?: boolean }`.

- Rejects invalid JSON5.
- Unless `skipCliValidation`, requires successful `openclaw config validate` on temp file; if CLI missing, returns `400` with `code: "NO_CLI"`.
- Writes UTF-8 text to `path` (expanded).

### `GET /api/gateway/probe?baseUrl=&token=`

Attempts several health URLs; returns `attempts` array and optional success `matched`.

---

## 6. UX rules agents should preserve

1. **Raw JSON5** is the authoritative string written on save; structured tabs **merge** slices and may strip comments.
2. **Browse** tab reads from **parsed editor state** — warn users that unsaved buffer is what they see unless they reload from disk.
3. **Save** should remain explicit (button), not auto-save on every keystroke, unless product requirements change.
4. **Sensitive display:** explorer masks string values when the **key name** matches token/secret patterns; do not log full configs server-side.

---

## 7. Coding conventions (for agents editing this repo)

- **TypeScript** strict; prefer small, focused changes.
- Match existing patterns: Express handlers in `server/index.ts`, React state in `App.tsx` unless a component clearly exceeds ~400 lines.
- New **user-facing** source files should include the **standard file header** (disclaimer + Name + Email) consistent with other `.ts` / `.tsx` files.
- Do not commit secrets or real API keys.
- After substantive edits, run **`npm run build`** locally.

---

## 8. Extension ideas (only if requested)

- Sidebar folders for **`plugins.entries`** and **`agents.list`** mirroring **Browse**.
- Optional WebSocket or polling for “gateway restarted” detection.
- Optional integration with **`openclaw config schema`** output cached server-side for inline field hints.
- Reverse-proxy **example** configs (nginx/Caddy) in docs — keep minimal unless asked.

---

## 9. Maintainer and legal

- **Name:** Lalit Nayyar  
- **Email:** lalitnayyar@gmail.com  

This tool is **not** a substitute for reading OpenClaw’s official documentation or running `openclaw doctor` on the gateway host when diagnosing production issues.
