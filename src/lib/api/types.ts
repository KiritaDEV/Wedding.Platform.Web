export type ApiResource<T> = {
  data: T
}

export type ApiCollection<T> = {
  data: T[]
}

export type ValidationErrors = Record<string, string[]>
