import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().default('http://127.0.0.1:5173'),
  DEFAULT_USER_ID: z.string().default('demo-user'),
})

export const env = EnvSchema.parse(process.env)
