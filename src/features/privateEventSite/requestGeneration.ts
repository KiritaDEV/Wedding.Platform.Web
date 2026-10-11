export type RequestGeneration = { current: number }

export function beginRequest(generation: RequestGeneration): number {
  generation.current += 1
  return generation.current
}

export function isCurrentRequest(generation: RequestGeneration, request: number): boolean {
  return generation.current === request
}

export function invalidateRequest(generation: RequestGeneration, request?: number): void {
  if (request === undefined || generation.current === request) generation.current += 1
}
