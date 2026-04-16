/**
 * openclawadmin — shared OpenClaw JSON editor state (classic + studio UIs).
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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import JSON5 from "json5";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  fetchConfig,
  probeGateway,
  saveConfig,
  validateConfig,
  type ConfigResponse,
} from "../lib/api";
import { parseConfig, setPath } from "../lib/merge";
import { DOCS } from "../config/constants";

export type BannerState = { type: "error" | "success" | "warn"; text: string } | null;

export type ConfigEditorContextValue = {
  gatewayBaseUrl: string;
  setGatewayBaseUrl: (v: string) => void;
  configPath: string;
  setConfigPath: (v: string) => void;
  gatewayToken: string;
  setGatewayToken: (v: string) => void;
  editor: string;
  setEditor: (v: string) => void;
  resolvedPath: string;
  loading: boolean;
  banner: BannerState;
  setBanner: (b: BannerState) => void;
  skipCli: boolean;
  setSkipCli: (v: boolean) => void;
  probeResult: string | null;
  load: () => Promise<void>;
  runValidate: () => Promise<void>;
  runSave: () => Promise<void>;
  runProbe: () => Promise<void>;
  parsedRoot: Record<string, unknown> | null;
  channelsMap: Record<string, unknown> | null;
  applyChannelsSlice: (channels: Record<string, unknown>) => void;
  applyPluginsSlice: (plugins: Record<string, unknown>) => void;
  applyAgentsSlice: (agents: Record<string, unknown>) => void;
};

const ConfigEditorContext = createContext<ConfigEditorContextValue | null>(null);

export function ConfigEditorProvider({ children }: { children: ReactNode }) {
  const [gatewayBaseUrl, setGatewayBaseUrl] = usePersistedState(
    "openclawadmin.gateway",
    "http://127.0.0.1:18789",
  );
  const [configPath, setConfigPath] = usePersistedState(
    "openclawadmin.configPath",
    "~/.openclaw/openclaw.json",
  );
  const [gatewayToken, setGatewayToken] = usePersistedState("openclawadmin.gatewayToken", "");

  const [editor, setEditor] = useState("");
  const [resolvedPath, setResolvedPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [skipCli, setSkipCli] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const data = (await fetchConfig(configPath)) as ConfigResponse;
      if ("error" in data && data.error) {
        setBanner({ type: "error", text: data.error });
        return;
      }
      if ("parseError" in data && data.parseError) {
        setBanner({ type: "warn", text: `Parse issue — edit with care: ${data.parseError}` });
      }
      setResolvedPath(data.path);
      setEditor(data.content);
      if (!data.exists) {
        setBanner({
          type: "warn",
          text: "Config file not found yet — showing a starter template. Save to create it.",
        });
      }
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [configPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedRoot = useMemo(() => {
    try {
      return parseConfig(editor);
    } catch {
      return null;
    }
  }, [editor]);

  const channelsMap = useMemo((): Record<string, unknown> | null => {
    if (!parsedRoot) return null;
    const ch = parsedRoot.channels;
    if (ch !== undefined && ch !== null && typeof ch === "object" && !Array.isArray(ch)) {
      return ch as Record<string, unknown>;
    }
    return {};
  }, [parsedRoot]);

  const runValidate = useCallback(async () => {
    setBanner(null);
    try {
      const r = (await validateConfig(editor)) as {
        ok?: boolean;
        errors?: string[];
        warning?: string;
        cliSkipped?: boolean;
        note?: string;
      };
      if (r.ok) {
        const extra = r.cliSkipped
          ? ` ${r.warning ?? ""} ${r.note ?? ""}`.trim()
          : " OpenClaw CLI validation passed.";
        setBanner({ type: "success", text: `Valid.${extra}` });
      } else {
        setBanner({
          type: "error",
          text: (r.errors ?? ["Unknown validation error"]).join("\n"),
        });
      }
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  }, [editor]);

  const runSave = useCallback(async () => {
    setBanner(null);
    try {
      await saveConfig(configPath, editor, skipCli);
      setBanner({
        type: "success",
        text: `Saved to ${configPath}. Gateway reloads config from disk (see ${DOCS}).`,
      });
      await load();
    } catch (e: unknown) {
      const err = e as { body?: { errors?: string[]; error?: string }; message?: string };
      const msg =
        err.body?.errors?.join("\n") ??
        err.body?.error ??
        err.message ??
        String(e);
      setBanner({ type: "error", text: msg });
    }
  }, [configPath, editor, skipCli, load]);

  const runProbe = useCallback(async () => {
    setProbeResult(null);
    try {
      const r = (await probeGateway(gatewayBaseUrl, gatewayToken)) as {
        ok?: boolean;
        matched?: string;
        message?: string;
        status?: number;
      };
      if (r.ok) {
        setProbeResult(`Reachable (${r.status}) — ${r.matched ?? gatewayBaseUrl}`);
      } else {
        setProbeResult(r.message ?? "Probe completed without a healthy endpoint.");
      }
    } catch (e) {
      setProbeResult(e instanceof Error ? e.message : String(e));
    }
  }, [gatewayBaseUrl, gatewayToken]);

  const applyChannelsSlice = useCallback(
    (channels: Record<string, unknown>) => {
      try {
        const root = parseConfig(editor);
        setEditor(setPath(root, "channels", channels));
        setBanner({
          type: "success",
          text: "Channels merged into the working JSON. Validate, then save when ready.",
        });
      } catch (e) {
        setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
      }
    },
    [editor],
  );

  const applyPluginsSlice = useCallback(
    (plugins: Record<string, unknown>) => {
      try {
        const root = parseConfig(editor);
        setEditor(setPath(root, "plugins", plugins));
        setBanner({
          type: "success",
          text: "Plugins merged into the working JSON. Validate, then save when ready.",
        });
      } catch (e) {
        setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
      }
    },
    [editor],
  );

  const applyAgentsSlice = useCallback(
    (agents: Record<string, unknown>) => {
      try {
        const root = parseConfig(editor);
        const next = { ...root, agents };
        setEditor(JSON5.stringify(next, null, 2));
        setBanner({
          type: "success",
          text: "Agents section merged into the working JSON. Validate, then save when ready.",
        });
      } catch (e) {
        setBanner({ type: "error", text: e instanceof Error ? e.message : String(e) });
      }
    },
    [editor],
  );

  const value = useMemo(
    (): ConfigEditorContextValue => ({
      gatewayBaseUrl,
      setGatewayBaseUrl,
      configPath,
      setConfigPath,
      gatewayToken,
      setGatewayToken,
      editor,
      setEditor,
      resolvedPath,
      loading,
      banner,
      setBanner,
      skipCli,
      setSkipCli,
      probeResult,
      load,
      runValidate,
      runSave,
      runProbe,
      parsedRoot,
      channelsMap,
      applyChannelsSlice,
      applyPluginsSlice,
      applyAgentsSlice,
    }),
    [
      gatewayBaseUrl,
      configPath,
      gatewayToken,
      editor,
      resolvedPath,
      loading,
      banner,
      skipCli,
      probeResult,
      load,
      runValidate,
      runSave,
      runProbe,
      parsedRoot,
      channelsMap,
      applyChannelsSlice,
      applyPluginsSlice,
      applyAgentsSlice,
    ],
  );

  return <ConfigEditorContext.Provider value={value}>{children}</ConfigEditorContext.Provider>;
}

export function useConfigEditor(): ConfigEditorContextValue {
  const v = useContext(ConfigEditorContext);
  if (!v) {
    throw new Error("useConfigEditor must be used within ConfigEditorProvider");
  }
  return v;
}
