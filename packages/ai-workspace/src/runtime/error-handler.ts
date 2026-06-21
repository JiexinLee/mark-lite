import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, isAppError } from "./app-error";

export const aiWorkspaceErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const requestId = (req as { context?: { requestId?: string } }).context?.requestId;

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Request payload is invalid.",
      code: "BAD_REQUEST",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      requestId,
    });
    return;
  }

  if (isAppError(error)) {
    logSafeError({
      requestId,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
    });

    res.status(error.statusCode).json({
      message: error.expose ? error.message : "Internal server error",
      code: error.code,
      requestId,
    });
    return;
  }

  const fallbackError = new AppError({
    message: "Internal server error",
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    expose: false,
  });

  logSafeError({
    requestId,
    code: fallbackError.code,
    statusCode: fallbackError.statusCode,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  res.status(fallbackError.statusCode).json({
    message: "Internal server error",
    code: fallbackError.code,
    requestId,
  });
};

function logSafeError(input: {
  requestId: string | undefined;
  code: string;
  statusCode: number;
  message: string;
}) {
  console.error(
    `[${input.requestId ?? "unknown-request"}] ${input.statusCode} ${input.code}: ${input.message}`,
  );
}
