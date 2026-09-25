import Link from "next/link";
import clsx from "clsx";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "whatsapp" | "ghost" | "light";
  className?: string;
  external?: boolean;
};

const styles = {
  primary: "bg-saffron text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] hover:bg-saffron-deep",
  whatsapp: "bg-[#1f8f4e] text-white shadow-[0_6px_0_0_#146236] hover:bg-[#146236]",
  ghost: "border-2 border-ink text-ink hover:bg-ink hover:text-white",
  light: "bg-white text-ink shadow-[0_6px_0_0_rgba(0,0,0,0.2)] hover:bg-cream",
};

/** Chunky, tactile pill button rendered as a link. */
export function ButtonLink({ href, children, variant = "primary", className, external }: Props) {
  const cls = clsx(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-lg font-bold transition active:translate-y-1 active:shadow-none",
    styles[variant],
    className,
  );
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
