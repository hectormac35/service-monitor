// lib/format.ts
export function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function haceCuanto(iso: string | null | undefined, ahora = Date.now()) {
  if (!iso) return "nunca";
  const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

export function formatIntervalo(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  if (segundos % 3600 === 0) return `${segundos / 3600} h`;
  if (segundos % 60 === 0) return `${segundos / 60} min`;
  return `${segundos} s`;
}

export function formatMs(ms: number | null | undefined) {
  return ms == null ? "—" : `${Math.round(ms)} ms`;
}
