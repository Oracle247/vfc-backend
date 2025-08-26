import { logger } from './logger'

const shutdownHandler: { (): Promise<void> }[] = []

function registerShutdownHandler(handler: () => Promise<void>): void {
  shutdownHandler.push(handler)
}

async function gracefulShutdown(): Promise<void> {
  const promises: Promise<void>[] = []
  for (const handler of shutdownHandler) {
    promises.push(handler())
  }

  await Promise.all(promises)

  process.exit(0)
}

function uncaughtExceptionHandler(error: Error): void {
  logger.error('uncaughtException', error)
  process.exit(1)
}

function unhandledRejectionHandler(reason: unknown): void {
  logger.error('unhandledRejection: ', reason)
  if (reason instanceof Error) {
    logger.error(reason.stack);
  }
  process.exit(1)
}

process.on('uncaughtException', uncaughtExceptionHandler)
process.on('unhandledRejection', unhandledRejectionHandler)
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  gracefulShutdown()
})

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  gracefulShutdown();
});

process.on('SIGQUIT', () => {
  logger.info('SIGQUIT signal received: closing HTTP server');
  gracefulShutdown();
});

export { registerShutdownHandler }
