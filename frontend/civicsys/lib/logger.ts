/**
 * Logger de cliente con niveles + prefijo (observabilidad del frontend en la
 * consola del navegador).
 *
 * REGLA DE ORO: NUNCA pasar claves privadas, keystores, passwords, mnemónicos
 * ni API keys a estas funciones. Solo eventos, ids públicos, direcciones (que
 * ya son públicas), chain ids, status y mensajes de error.
 *
 * Apagar con NEXT_PUBLIC_LOG=off.
 */
type Level = "info" | "warn" | "error";

const ENABLED = process.env.NEXT_PUBLIC_LOG !== "off";

function emit(level: Level, scope: string, msg: string, data?: unknown): void {
  if (!ENABLED) return;
  const line = `[civicsys:${scope}] ${msg}`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (data !== undefined) fn(line, data);
  else fn(line);
}

export const logger = {
  info: (scope: string, msg: string, data?: unknown) => emit("info", scope, msg, data),
  warn: (scope: string, msg: string, data?: unknown) => emit("warn", scope, msg, data),
  error: (scope: string, msg: string, data?: unknown) => emit("error", scope, msg, data),
};
