export function canonicalPrivateUrl(origin: string, path: string): string {
  return new URL(path, `${origin}/`).toString()
}

export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the selection-based path when browser permission or
      // transient clipboard access rejects the modern API.
    }
  }

  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    // Elements outside a modal <dialog> are inert and cannot be selected.
    const container = document.querySelector<HTMLDialogElement>('dialog[open]') ?? document.body
    container.append(field)
    field.select()
    const copied = document.execCommand('copy')
    field.remove()
    return copied
  } catch {
    return false
  }
}
