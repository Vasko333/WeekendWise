export function StatusMessage({ kind, title, message }: { kind: "error" | "empty"; title?: string; message: string }) {
  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      className="rounded-3xl border-[0.5px] border-black/6 p-22"
    >
      {title && <p className="text-[12px] text-steel-gray">{title}</p>}
      <p className="mt-4 text-body text-off-black">{message}</p>
    </div>
  );
}
