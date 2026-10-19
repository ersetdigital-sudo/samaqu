/** Badge merah J&T — satu sumber untuk Cek Resi dan semua detail transaksi. */
export default function JntBadge({ label = "J&T" }: { label?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl px-2.5 py-1.5 text-[12px] font-extrabold text-white"
      style={{ background: "#ED1C24", letterSpacing: ".02em" }}
    >
      {label}
    </span>
  );
}
