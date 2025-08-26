import createHttpError from 'http-errors';

class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational; // Identifies whether the error is operational (vs. programming errors)

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates an HTTP-specific error using `http-errors` library
   * while allowing for custom messages.
   */

  static httpError(statusCode: number, message?: string): AppError {
    const error = createHttpError(statusCode, message);
    return new AppError(error.message, error.statusCode, true);
  }
}

export { AppError };
