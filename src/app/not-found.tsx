import { ButtonLink } from "@/components/button-link";
import { Mascot, SpeechBubble } from "@/components/mascot";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <SpeechBubble tail="bottom" className="mb-4">Aiyo! This page isn’t on the menu.</SpeechBubble>
      <Mascot size={150} animate="wobble" decorative />
      <h1 className="mt-6 font-display text-4xl font-extrabold">Page not found</h1>
      <ButtonLink href="/shop" className="mt-6">Back to the shop</ButtonLink>
    </main>
  );
}
