/** Replace {{placeholders}} in template body. */

export function extractPlaceholderKeys(body: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
  const keys = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    keys.add(m[1])
  }
  return [...keys]
}

export function mergeTemplatePlaceholders(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return values[key] ?? `{{${key}}}`
  })
}

export function validateRequiredPlaceholders(
  _body: string,
  requiredKeys: string[],
  values: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const missing = requiredKeys.filter(
    (k) => !(k in values) || values[k].trim() === '',
  )
  if (missing.length) return { ok: false, missing }
  return { ok: true }
}
