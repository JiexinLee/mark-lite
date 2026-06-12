export function detectRuntime() {
  return window.electronAPI ? 'electron' : 'browser'
}
