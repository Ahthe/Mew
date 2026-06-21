// Browser shim for @tauri-apps/api/app.
export async function getVersion(): Promise<string> {
  return import.meta.env.VITE_APP_VERSION ?? "0.0.0-web";
}
export async function getIdentifier(): Promise<string> {
  return "com.hyprnote.web";
}
export async function getName(): Promise<string> {
  return "Hyprnote Web";
}
export async function getTauriVersion(): Promise<string> {
  return "0.0.0";
}
