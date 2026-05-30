export function logDevError(error: unknown): void {
  if (process.env.NODE_ENV !== 'development') return;
  const message = error instanceof Error ? error.message : String(error);
  console.error('Message:', message);
}
