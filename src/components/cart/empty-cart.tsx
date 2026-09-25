import { ButtonLink } from "@/components/button-link";
import { Mascot, SpeechBubble } from "@/components/mascot";

export function EmptyCart({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <SpeechBubble tail="bottom" className="max-w-64">
        My tummy&apos;s rumbling… your cart is empty!
      </SpeechBubble>
      <Mascot size={compact ? 130 : 170} animate="wobble" decorative className="mt-4" />
      <p className="mt-4 max-w-xs text-ink-soft">Pick a breakfast mix or two. Dosa, adai, pongal, all ready in minutes.</p>
      <span onClick={onNavigate} className="mt-5">
        <ButtonLink href="/shop">Browse the mixes</ButtonLink>
      </span>
    </div>
  );
}
