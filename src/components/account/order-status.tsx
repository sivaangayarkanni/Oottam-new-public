import clsx from "clsx";

const LABELS: Record<string, { text: string; tone: string }> = {
  PENDING: { text: "Awaiting payment", tone: "bg-turmeric/40 text-ink" },
  CONFIRMED: { text: "Confirmed", tone: "bg-leaf/15 text-leaf-deep" },
  PACKED: { text: "Packed", tone: "bg-pongal/15 text-pongal" },
  SHIPPED: { text: "Shipped", tone: "bg-pongal/15 text-pongal" },
  DELIVERED: { text: "Delivered", tone: "bg-leaf text-white" },
  CANCELLED: { text: "Cancelled", tone: "bg-ink/10 text-ink-soft" },
  REFUNDED: { text: "Refunded", tone: "bg-ink/10 text-ink-soft" },
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = LABELS[status] ?? { text: status, tone: "bg-ink/10" };
  return <span className={clsx("inline-flex rounded-full px-3 py-1 text-sm font-bold", s.tone, className)}>{s.text}</span>;
}
