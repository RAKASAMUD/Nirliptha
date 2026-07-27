"use client";

import { useEffect, useState } from "react";

type Props = {
  deadlineTs?: number | bigint;
  deadline?: number | bigint;
  className?: string;
};

function format(secondsLeft: number) {
  if (secondsLeft <= 0) return "00:00:00 (Expired)";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  return `${h.toString().padStart(2, "0")}h : ${m.toString().padStart(2, "0")}m : ${s
    .toString()
    .padStart(2, "0")}s`;
}

export function Countdown({ deadlineTs, deadline, className = "" }: Props) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const rawTarget = deadlineTs ?? deadline ?? 0;
  const targetSecs = typeof rawTarget === "bigint" ? Number(rawTarget) : Number(rawTarget || 0);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return <div className={`font-mono font-semibold ${className}`}>{format(targetSecs - now)}</div>;
}
