import { createApp } from './app'
import { env } from './config/env'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`mark-lite server running on http://localhost:${env.PORT}`)
})
