import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { HttpCodes } from '../constants';
import { AppError } from '../exceptions';
import { Prisma } from '@prisma/client'; // Import Prisma

interface ErrorResponse {
  status: number;
  message: string;
  stack?: string;
}

function isPrismaError(error: any): boolean {
  return [
    'PrismaClientKnownRequestError',
    'PrismaClientValidationError',
    'PrismaClientRustPanicError',
    'PrismaClientInitializationError',
    'PrismaClientUnknownRequestError',
  ].includes(error?.constructor?.name);
}

// Function to handle Prisma errors globally
function handleDatabaseError(error: any): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2000':
        return new AppError('Value too long for column.', HttpCodes.BAD_REQUEST);
      case 'P2001':
        return new AppError('Record not found.', HttpCodes.NOT_FOUND);
      case 'P2002':
        return new AppError('Unique constraint violation. Record already exists.', HttpCodes.BAD_REQUEST);
      case 'P2003':
        return new AppError('Foreign key constraint violation.', HttpCodes.BAD_REQUEST);
      case 'P2004':
        return new AppError('Constraint failed on the database.', HttpCodes.BAD_REQUEST);
      case 'P2005':
        return new AppError('Invalid value stored in the database.', HttpCodes.SERVER_ERROR);
      case 'P2006':
        return new AppError('Provided value is not valid.', HttpCodes.BAD_REQUEST);
      case 'P2007':
        return new AppError('Data validation error.', HttpCodes.BAD_REQUEST);
      case 'P2008':
        return new AppError('Query parsing error.', HttpCodes.BAD_REQUEST);
      case 'P2009':
        return new AppError('Invalid query structure.', HttpCodes.BAD_REQUEST);
      case 'P2010':
        return new AppError('Raw query failed. See database logs.', HttpCodes.SERVER_ERROR);
      case 'P2011':
        return new AppError('Null constraint violation.', HttpCodes.BAD_REQUEST);
      case 'P2012':
        return new AppError('Missing required value.', HttpCodes.BAD_REQUEST);
      case 'P2013':
        return new AppError('Missing required argument.', HttpCodes.BAD_REQUEST);
      case 'P2014':
        return new AppError('Relation violation.', HttpCodes.BAD_REQUEST);
      case 'P2015':
        return new AppError('Related record not found.', HttpCodes.NOT_FOUND);
      case 'P2016':
        return new AppError('Query interpretation error.', HttpCodes.BAD_REQUEST);
      case 'P2017':
        return new AppError('Referential integrity violation.', HttpCodes.BAD_REQUEST);
      case 'P2018':
        return new AppError('Connected records not found.', HttpCodes.NOT_FOUND);
      case 'P2019':
        return new AppError('Input error. Invalid query parameter.', HttpCodes.BAD_REQUEST);
      case 'P2020':
        return new AppError('Value out of range.', HttpCodes.BAD_REQUEST);
      case 'P2021':
        return new AppError('Table not found in database.', HttpCodes.SERVER_ERROR);
      case 'P2022':
        return new AppError('Column not found in database.', HttpCodes.SERVER_ERROR);
      case 'P2023':
        return new AppError('Inconsistent column data.', HttpCodes.SERVER_ERROR);
      case 'P2024':
        return new AppError('Timed out fetching a new connection.', HttpCodes.SERVER_ERROR);
      case 'P2025':
        return new AppError('The record was not found.', HttpCodes.NOT_FOUND);
      case 'P2026':
        return new AppError('Unsupported database feature.', HttpCodes.SERVER_ERROR);
      case 'P2027':
        return new AppError('Multiple errors during operation.', HttpCodes.SERVER_ERROR);
      case 'P2028':
        return new AppError('Transaction API error.', HttpCodes.SERVER_ERROR);
      case 'P2030':
        return new AppError('No fulltext index found for search.', HttpCodes.BAD_REQUEST);
      case 'P2031':
        return new AppError('Invalid Prisma schema.', HttpCodes.SERVER_ERROR);
      case 'P2033':
        return new AppError('Database error during raw query.', HttpCodes.SERVER_ERROR);
      case 'P2034':
        return new AppError('Database connection closed unexpectedly.', HttpCodes.SERVER_ERROR);
      default:
        return new AppError('A known Prisma error occurred.', HttpCodes.SERVER_ERROR);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid input for database operation.', HttpCodes.BAD_REQUEST);
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new AppError('Critical database failure. Try again later.', HttpCodes.SERVER_ERROR);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError('Failed to connect to database. Check configuration.', HttpCodes.SERVER_ERROR);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new AppError('Unexpected low-level database error.', HttpCodes.SERVER_ERROR);
  }

  return new AppError('An unknown database error occurred.', HttpCodes.SERVER_ERROR);
}

// Global error handler function
export function globalErrorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  // Check if the error is a Prisma error and handle accordingly
  if (isPrismaError(err)) {
    err = handleDatabaseError(err);
  }

  // Destructure properties from AppError (or fallback to defaults)
  const { statusCode = HttpCodes.SERVER_ERROR, message = 'Something went wrong', stack } = err;

  // Show stack trace only in development
  const errorResponse: ErrorResponse = {
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
  };

  // Log error with better format and request method/path
  logger.error(`[${req.method}] ${req.originalUrl} >> Status: ${statusCode}, Message: ${message}, Stack: ${errorResponse.stack}`);

  // Send response to client
  res.status(statusCode).json(errorResponse);
}
