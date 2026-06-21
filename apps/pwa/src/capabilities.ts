export const capabilities = {
  localAI: false,
  audioCapture: false,
  fileSystem: false,
  calendar: false,
  contacts: false,
  cloudAI: true,
  cloudTranscription: true,
} as const;

export type Capabilities = typeof capabilities;
