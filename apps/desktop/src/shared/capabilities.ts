// Platform capability flags.
// Desktop (Tauri): all native capabilities enabled.
// Web/PWA (future): override with false and enable cloud* variants instead.
export const capabilities = {
  localAI: true,
  audioCapture: true,
  fileSystem: true,
  calendar: true,
  contacts: true,
  cloudAI: false,
  cloudTranscription: false,
} as const;

export type Capabilities = typeof capabilities;
