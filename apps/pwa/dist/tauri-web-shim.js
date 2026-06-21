// Standalone Tauri web shim for the PWA.
//
// The desktop frontend (apps/desktop/src) is built verbatim as the PWA. The real
// @tauri-apps/api packages and every @hypr/plugin-* binding route native calls
// through window.__TAURI_INTERNALS__.invoke. In a real Tauri window the runtime
// injects that object; here we install a STANDALONE version whose invoke() simply
// returns a safe default (no native backend, no WebSocket).
//
// Native-only features therefore no-op. That is intentional for now — the goal is
// to render the exact desktop UI in a browser. Persistence/sync get wired to
// IndexedDB + Supabase separately.
//
// Must load BEFORE any app module (referenced as a plain <script> in index.html).
(function () {
  if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) return;

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    var platform = "linux";
    if (/Mac|iPhone|iPad|iPod/.test(ua)) platform = "macos";
    else if (/Windows/.test(ua)) platform = "windows";
    else if (/Android/.test(ua)) platform = "android";
    return { platform: platform, isWindows: platform === "windows" };
  }

  var env = detectPlatform();

  // Per-command default overrides. Extend at runtime via
  // window.__TAURI_WEB_DEFAULTS__[command] = value  (or a function(args) => value).
  // Default for everything else is `null`, except commands whose name suggests a
  // collection (get_all_*, list_*, *_list, plural get_*s) which default to [].
  window.__TAURI_WEB_DEFAULTS__ = window.__TAURI_WEB_DEFAULTS__ || {};

  // Filesystem persister layer (StorageAdapter). With no native FS we return
  // clean "empty vault" shapes so every TinyBase persister loads to empty state
  // instead of choking on null. read_text_file rejects (mimics a missing file)
  // so the values persister treats it as "nothing persisted yet".
  var D = window.__TAURI_WEB_DEFAULTS__;
  D["plugin:fs-sync|scan_and_read"] = { files: [] };
  D["plugin:fs-sync|read_document_batch"] = { files: [] };
  D["plugin:fs-sync|load_session_content"] = { files: [] };
  D["plugin:fs-sync|list_folders"] = [];
  D["plugin:fs-sync|attachment_list"] = [];
  // Folder ops: TinyBase already updates folder_id in-memory before calling these;
  // returning { status: "ok" } lets the ops succeed without a real filesystem.
  D["plugin:fs-sync|move_session"] = { status: "ok" };
  D["plugin:fs-sync|rename_folder"] = { status: "ok" };
  D["plugin:fs-sync|session_dir"] = { status: "ok", data: "/vault" };
  D["plugin:settings|vault_base"] = "/vault";
  D["plugin:settings|obsidian_vaults"] = [];
  D["plugin:fs2|read_text_file"] = function () {
    throw new Error("ENOENT: file not found (web shim)");
  };

  function looksLikeList(cmd) {
    var c = cmd.toLowerCase();
    return (
      c.indexOf("list_") === 0 ||
      c.indexOf("get_all") === 0 ||
      c.indexOf("|list_") !== -1 ||
      c.indexOf("|get_all") !== -1 ||
      /(_list|s)$/.test(c.replace(/^[a-z-]+:[a-z-]+\|/, ""))
    );
  }

  function defaultFor(cmd, args) {
    var override = window.__TAURI_WEB_DEFAULTS__[cmd];
    if (typeof override === "function") return override(args);
    if (override !== undefined) return override;
    return looksLikeList(cmd) ? [] : null;
  }

  var warned = {};
  function invoke(command, args) {
    if (!warned[command]) {
      warned[command] = true;
      // eslint-disable-next-line no-console
      console.debug("[tauri-web-shim] invoke('" + command + "') -> default");
    }
    try {
      return Promise.resolve(defaultFor(command, args));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  var metadata = {
    currentWindow: { label: "main", kind: "WebviewWindow" },
    currentWebview: { label: "main", windowLabel: "main" },
    windows: [],
    webviews: [],
  };

  window.__TAURI_INTERNALS__ = {
    metadata: metadata,
    _metadata: metadata,
    plugins: {
      path: {
        sep: env.isWindows ? "\\" : "/",
        delimiter: env.isWindows ? ";" : ":",
      },
    },
    invoke: invoke,
    transformCallback: function (callback, once) {
      var id = Math.floor(Math.random() * 1e9);
      window["_" + id] = function (response) {
        if (once) delete window["_" + id];
        if (callback) callback(response);
      };
      return id;
    },
    convertFileSrc: function (path) {
      return path;
    },
  };

  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: function () {},
  };

  window.__TAURI_OS_PLUGIN_INTERNALS__ = {
    platform: env.platform,
    os_type: env.platform,
    family: env.isWindows ? "windows" : "unix",
    version: navigator.userAgent,
    arch: "x86_64",
    eol: env.isWindows ? "\r\n" : "\n",
    exe_extension: env.isWindows ? "exe" : "",
  };
})();
