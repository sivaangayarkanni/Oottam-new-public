import Image from "next/image";
import clsx from "clsx";

type Props = {
  className?: string;
  size?: number;
  variant?: "default" | "alt";
  animate?: "float" | "wobble" | "none";
  priority?: boolean;
  decorative?: boolean;
  /** Soft warm drop shadow; turn off on dark backgrounds. */
  shadow?: boolean;
};

/** The Oottam chef mascot (cut out from the brand posters). Native size ~225×296. */
export function Mascot({ className, size = 200, variant = "default", animate = "float", priority, decorative, shadow = true }: Props) {
  const img = variant === "alt"
    ? { src: "/images/mascot/oottam-chef-alt.png", w: 224, h: 301 }
    : { src: "/images/mascot/oottam-chef.png", w: 225, h: 296 };
  return (
    <Image
      src={img.src}
      alt={decorative ? "" : "Oottam chef mascot, an orange character in a white chef's coat and hat"}
      width={img.w}
      height={img.h}
      style={{ width: size, height: "auto" }}
      className={clsx(
        "select-none",
        shadow && "drop-shadow-[0_12px_18px_rgba(120,60,0,0.25)]",
        animate === "float" && "animate-float",
        animate === "wobble" && "animate-wobble",
        className,
      )}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

/** Comic-style speech bubble for the mascot. */
export function SpeechBubble({
  children,
  className,
  tail = "left",
}: {
  children: React.ReactNode;
  className?: string;
  tail?: "left" | "right" | "bottom";
}) {
  return (
    <div
      className={clsx(
        "relative rounded-3xl border-2 border-ink bg-white px-5 py-3 font-display text-lg leading-snug text-ink shadow-[4px_4px_0_0_var(--color-ink)]",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className={clsx(
          "absolute h-4 w-4 rotate-45 border-ink bg-white",
          tail === "left" && "-left-[9px] top-1/2 -translate-y-1/2 border-b-2 border-l-2",
          tail === "right" && "-right-[9px] top-1/2 -translate-y-1/2 border-r-2 border-t-2",
          tail === "bottom" && "-bottom-[9px] left-10 border-b-2 border-r-2",
        )}
      />
    </div>
  );
}
