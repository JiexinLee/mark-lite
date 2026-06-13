export type DatabaseModuleState = 'not-configured' | 'ready'

export function getDatabaseModuleState(): DatabaseModuleState {
  return 'not-configured'
}
