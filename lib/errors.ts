import { z, ZodError } from "zod";
import type { ApiError, ApiErrorCode } from "@/lib/types";

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return errorJson(err.code, err.status, err.message, err.details);
  }
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Invalid input.";
    return errorJson("INVALID_INPUT", 400, message, z.flattenError(err));
  }
  console.error(err);
  return errorJson("INTERNAL", 500, "Something unexpected happened.");
}

function errorJson(code: ApiErrorCode, status: number, message: string, details?: unknown): Response {
  const body: ApiError = { error: { code, message, ...(details !== undefined && { details }) } };
  return Response.json(body, { status });
}
