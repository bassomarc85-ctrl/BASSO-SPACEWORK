export function requiredEnv(name: string): string {
  const v = import.meta.env[name] as string | undefined
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}
