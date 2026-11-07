/** Map technical errors to user-friendly messages */
export function getUserMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('WebGL') || error.message.includes('WASM')) {
      return 'Your browser does not support the required features for on-device inference. Please try a modern browser like Chrome or Edge.';
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'A network error occurred. Please check your connection and try again.';
    }
    if (error.message.includes('model')) {
      return 'Failed to load the classification model. Please refresh and try again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

/** Wrapper for structured error handling */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
