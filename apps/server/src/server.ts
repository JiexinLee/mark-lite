import { createApp } from './app'
import { aiWorkspaceRuntimeEnv } from '@mark-lite/ai-workspace'

const app = createApp()

app.listen(aiWorkspaceRuntimeEnv.PORT, () => {
  console.log(
    `mark-lite server running on http://localhost:${aiWorkspaceRuntimeEnv.PORT}`,
  )
})
