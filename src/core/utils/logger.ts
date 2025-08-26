import { createLogger, format, transports, Logger } from 'winston'

const { combine, colorize, timestamp, errors, splat, json, simple } = format

function productionLogger(): Logger {
  return createLogger({
    format: combine(timestamp(), errors({ stack: true }), splat(), json()),
    transports: [new transports.Console()],
  })
}

function developmentLogger(): Logger {
  return createLogger({
    level: 'debug',
    format: combine(
      colorize(),
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      errors({ stack: true }),
      simple(),
    ),
    transports: [new transports.Console()],
  })
}

const logger =
  process.env.NODE_ENV === 'development'
    ? developmentLogger()
    : productionLogger()

const stream = {
  write: (message: string) => {
    // logger.info(message.substring(0, message.lastIndexOf('\n')));
  },
};

export { logger, stream };
