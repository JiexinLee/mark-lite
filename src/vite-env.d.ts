/// <reference types="vite/client" />

interface ElectronVersions {
  chrome: string
  electron: string
  node: string
}

interface ElectronAPI {
  platform: string
  versions: ElectronVersions
}

interface Window {
  electronAPI?: ElectronAPI
}
