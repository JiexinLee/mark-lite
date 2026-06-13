export type AuthModuleState = 'not-configured' | 'ready'

export function getAuthModuleState(): AuthModuleState {
  return 'not-configured'
}
