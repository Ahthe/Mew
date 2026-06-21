// Register the localStorage-backed StorageAdapter before the desktop store mounts.
// Imported first in main.tsx so setStorageAdapter() runs at module-eval time,
// ahead of the React render that creates the TinyBase persisters.
import { setStorageAdapter } from "~/store/tinybase/storage";

import { webStorageAdapter } from "./web-storage-adapter";

setStorageAdapter(webStorageAdapter);
