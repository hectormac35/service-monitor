type Props = { isUp: boolean | null | undefined; paused?: boolean };

export default function StatusBadge({ isUp, paused }: Props) {
  const [texto, clases, punto] = paused
    ? ["Pausado", "bg-slate-700/60 text-slate-300 ring-slate-500/40", "bg-slate-400"]
    : isUp == null
      ? ["Pendiente", "bg-slate-700/60 text-slate-200 ring-slate-500/40", "bg-slate-300 animate-pulse"]
      : isUp
        ? ["UP", "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40", "bg-emerald-400"]
        : ["DOWN", "bg-red-500/15 text-red-300 ring-red-400/40", "bg-red-400 animate-pulse"];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${clases}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />
      {texto}
    </span>
  );
}
