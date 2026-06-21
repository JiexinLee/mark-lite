export type AppErrorCode =
  | "BAD_REQUEST"
  | "AI_DISABLED"
  | "AI_CONFIG_ERROR"
  | "AI_AUTH_ERROR"
  | "AI_PERMISSION_ERROR"
  | "AI_QUOTA_EXCEEDED"
  | "AI_RATE_LIMITED"
  | "AI_MODEL_NOT_FOUND"
  | "AI_UPSTREAM_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  statusCode: number;
  code: AppErrorCode;
  expose: boolean;

  constructor(options: {
    message: string;
    statusCode: number;
    code: AppErrorCode;
    expose?: boolean;
  }) {
    super(options.message);
    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.expose = options.expose ?? true;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
