"use client";

import { useEffect, useState } from "react";

type Props = {
  deadlineTs: number; // unix seconds
  className?: string;
};

function format(secondsLeft: number) {
  if (secondsLeft <= 0) return "Deadline passed";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

// Only piece of the whole UI that genuinely needs a client-side ticking
// timer (setInterval) — isolated to this leaf so pages/sections that use it
// don't need 'use client' themselves.
export function Countdown({ deadlineTs, className = "" }: Props) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return <div className={className}>{format(deadlineTs - now)}</div>;
}
