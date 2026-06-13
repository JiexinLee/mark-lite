import { spawn } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const commands = [
  [pnpmCommand, ['--filter', '@mark-lite/server', 'dev']],
  [pnpmCommand, ['--filter', '@mark-lite/electron', 'dev']],
]

const children = commands.map(([command, args]) =>
  spawn(command, args, {
    stdio: 'inherit',
  }),
)

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  process.exit(code)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
