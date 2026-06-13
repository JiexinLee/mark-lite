import { spawnSync } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const command = spawnSync(pnpmCommand, ['--filter', '@mark-lite/electron', 'lint'], {
  stdio: 'inherit',
})

process.exit(command.status ?? 1)
