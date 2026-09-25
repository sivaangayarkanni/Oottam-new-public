"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { SpeechBubble } from "@/components/mascot";

const LAYERS = [
  // back layers move fastest (feel further away when combined with smaller scale)
  { src: "/images/posters/adai-mix-purple.jpg", w: 1066, cls: "left-0 top-8 -rotate-12 w-32 sm:w-40", speed: -260, delay: "0s" },
  { src: "/images/posters/pongal-mix-blue.jpg", w: 1076, cls: "right-0 top-2 rotate-12 w-32 sm:w-40", speed: -200, delay: "-1.6s" },
  { src: "/images/posters/paarambariyam-chekka-red.jpg", w: 1066, cls: "right-6 bottom-6 rotate-[18deg] w-24 sm:w-28", speed: -320, delay: "-3.2s" },
  { src: "/images/posters/paarambariyam-pulusu-adai-teal.jpg", w: 1076, cls: "left-4 bottom-10 -rotate-[16deg] w-24 sm:w-28", speed: -300, delay: "-2.4s" },
  { src: "/images/posters/rava-dosa-mix-green.jpg", w: 1076, cls: "bottom-0 left-1/2 -ml-[4.5rem] rotate-3 w-36 sm:-ml-[5.5rem] sm:w-44", speed: -110, delay: "-0.8s" },
];

function Layer({ l, i }: { l: (typeof LAYERS)[number]; i: number }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, l.speed]);
  return (
    <motion.div className={`absolute ${l.cls}`} style={reduce ? undefined : { y }}>
      <div className="animate-float" style={{ animationDelay: l.delay, animationDuration: `${5 + i * 0.7}s` }}>
        <Image
          src={l.src}
          alt=""
          width={l.w}
          height={1600}
          sizes="180px"
          className="w-full rounded-2xl shadow-xl ring-1 ring-black/5"
          loading="eager"
        />
      </div>
    </motion.div>
  );
}

/** Hero illustration: layered packs with scroll parallax + idle float, and the waving mascot. */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const blobScale = useTransform(scrollY, [0, 700], [1, 1.35]);
  const mascotY = useTransform(scrollY, [0, 700], [0, -60]);

  return (
    <div className="mx-auto w-full max-w-md">
    <div className="relative h-[26rem] w-full sm:h-[31rem]">
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -ml-36 -mt-36 h-72 w-72 rounded-full bg-saffron sm:-ml-40 sm:-mt-40 sm:h-80 sm:w-80"
        style={reduce ? undefined : { scale: blobScale }}
      />
      <div aria-hidden className="absolute left-1/2 top-1/2 -ml-44 -mt-44 h-[22rem] w-[22rem] rounded-full border-4 border-dashed border-saffron/30 animate-stir [animation-duration:40s] sm:-ml-48 sm:-mt-48 sm:h-[24rem] sm:w-[24rem]" />
      {LAYERS.map((l, i) => (
        <Layer key={l.src} l={l} i={i} />
      ))}
      <motion.div className="absolute bottom-12 left-1/2 -ml-[8.5rem]" style={reduce ? undefined : { y: mascotY }}>
        <motion.div
          initial={reduce ? false : { y: 80, opacity: 0, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
        >
          <div className="animate-wave">
            <Image
              src="/images/mascot/oottam-chef.png"
              alt="Oottam chef mascot, an orange character in a white chef's coat and hat, waving hello"
              width={225}
              height={296}
              style={{ width: 210, height: "auto" }}
              className="drop-shadow-[0_14px_20px_rgba(120,60,0,0.3)]"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </motion.div>
      </motion.div>
      {/* Speech bubble: beside the mascot from sm up; on small phones it sits below the
          illustration (see the sm:hidden copy after this block) so it never covers a pack. */}
      <motion.div
        className="absolute right-0 top-[40%] hidden max-w-[12.5rem] sm:-right-8 sm:block"
        initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.9 }}
      >
        <SpeechBubble tail="left" className="text-base">
          Vanakkam! Let me show you how breakfast got easy.
        </SpeechBubble>
      </motion.div>
    </div>
    <motion.div
      className="relative z-10 mx-auto -mt-2 w-fit max-w-[16rem] sm:hidden"
      initial={reduce ? false : { opacity: 0, y: -10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.9 }}
    >
      <SpeechBubble tail="top" className="text-center text-base">
        Vanakkam! Let me show you how breakfast got easy.
      </SpeechBubble>
    </motion.div>
    </div>
  );
}
