"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, Heart, MapPin, RefreshCw, Sparkles, X } from "lucide-react";
import type { Profile, SwipeResult } from "@/lib/types";

type Direction = "like" | "pass";
const SWIPE_DISTANCE = 105;
const SWIPE_VELOCITY = 600;

async function fetchProfiles(): Promise<Profile[]> {
  const response = await fetch("/feed", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load profiles");
  const data = (await response.json()) as { profiles: Profile[] };
  return data.profiles;
}

function ProfileCard({
  profile, onSwipe, disabled, exitDirection,
}: {
  profile: Profile;
  onSwipe: (direction: Direction) => void;
  disabled: boolean;
  exitDirection: Direction | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [25, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -25], [1, 0]);

  return (
    <motion.article
      key={profile.id}
      className="absolute inset-0 touch-pan-y select-none overflow-hidden rounded-[30px] bg-[#dec8c0] shadow-[0_22px_65px_rgba(70,35,47,0.22)]"
      style={{ x, rotate }}
      drag={disabled ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (disabled) return;
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe("like");
        else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe("pass");
      }}
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        x: exitDirection === "like" ? 550 : exitDirection === "pass" ? -550 : 0,
        opacity: 0,
        rotate: exitDirection === "like" ? 23 : exitDirection === "pass" ? -23 : 0,
        transition: { duration: 0.32, ease: "easeOut" },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      aria-label={`${profile.name}, ${profile.age}, ${profile.city}`}
    >
      {/* Seeded illustrations are intentionally local and don't depict real users. */}
      <Image src={profile.photo} alt={`Illustrated profile of ${profile.name}`} fill sizes="(max-width: 640px) 100vw, 440px" unoptimized draggable={false} className="pointer-events-none object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#160d17]/95 via-[#160d17]/20 via-45% to-transparent" />
      <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-7 -rotate-12 rounded-xl border-4 border-emerald-300 bg-black/20 px-4 py-2 text-3xl font-black tracking-widest text-emerald-300">LIKE</motion.div>
      <motion.div style={{ opacity: passOpacity }} className="pointer-events-none absolute right-6 top-7 rotate-12 rounded-xl border-4 border-rose-300 bg-black/20 px-4 py-2 text-3xl font-black tracking-widest text-rose-300">PASS</motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-7 pt-24 text-white sm:px-7">
        <div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.13em] backdrop-blur-md">Discover</span></div>
        <h2 className="text-[34px] font-extrabold leading-none tracking-tight sm:text-[40px]">{profile.name} <span className="font-medium">{profile.age}</span></h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90"><MapPin size={15} aria-hidden="true" /> {profile.city} <span className="text-white/60">•</span> {profile.college}</p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/95">{profile.bio}</p>
        <div className="mt-4 flex flex-wrap gap-2">{profile.interests.map(interest => <span key={interest} className="rounded-full border border-white/25 bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur-md">{interest}</span>)}</div>
      </div>
    </motion.article>
  );
}

export default function Discover({ onViewMatches }: { onViewMatches?: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<Profile | null>(null);
  const [exitDirection, setExitDirection] = useState<Direction | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfiles(await fetchProfiles());
    } catch {
      setError("Could not load profiles. Check your database and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchProfiles()
      .then(data => { if (active) setProfiles(data); })
      .catch(() => { if (active) setError("Could not load profiles. Check your database and retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const swipe = useCallback(async (direction: Direction) => {
    const current = profiles[0];
    if (!current || inFlight.current || match) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: current.id, direction }),
      });
      if (!response.ok) throw new Error("Failed to save swipe");
      const result = (await response.json()) as SwipeResult;
      setExitDirection(direction);
      setProfiles(previous => previous.filter(person => person.id !== current.id));
      if (result.matched && result.match) setMatch(result.match);
    } catch {
      // Keep the card in place so the user can retry: no lost swipes on network failure.
      setError("Couldn't save that swipe. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [profiles, match]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); void swipe("pass"); }
      if (event.key === "ArrowRight") { event.preventDefault(); void swipe("like"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [swipe]);

  const current = profiles[0];
  const next = profiles[1];

  return <div className="flex w-full flex-col px-4 pb-8 pt-6 sm:px-7">
    <div className="flex items-start justify-between gap-4 px-1">
      <div><p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.17em] text-rose-500"><Sparkles size={14} /> Meet someone new</p><h1 className="text-[29px] font-extrabold tracking-tight text-stone-900">Discover<span className="text-rose-500">.</span></h1><p className="mt-1 text-sm text-stone-500">A little spark could go a long way.</p></div>
      {!loading && <span className="mt-2 shrink-0 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600" aria-label={`${profiles.length} profiles remaining`}>{profiles.length} left</span>}
    </div>

    {error && <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error} <button className="ml-1 font-bold underline" onClick={() => void load()}>Reload feed</button></div>}

    {loading ? <div role="status" className="mt-8 flex aspect-[4/5] items-center justify-center rounded-[30px] bg-rose-50 text-stone-500">Finding new connections…</div> : current ? <>
      <div className="relative mx-auto mt-6 aspect-[4/5] w-full max-w-[440px]" aria-label="Swipeable discovery profiles">
        {next && <div aria-hidden="true" className="absolute inset-x-4 bottom-[-9px] top-3 overflow-hidden rounded-[30px] bg-[#ead9d7] shadow-md"><Image src={next.photo} alt="" fill sizes="(max-width: 640px) 100vw, 440px" unoptimized className="object-cover opacity-60" /></div>}
        <AnimatePresence initial={false} custom={exitDirection} mode="popLayout" onExitComplete={() => setExitDirection(null)}>
          <ProfileCard key={current.id} profile={current} onSwipe={(direction) => void swipe(direction)} disabled={busy || !!match} exitDirection={exitDirection} />
        </AnimatePresence>
      </div>
      <div className="mt-8 flex items-center justify-center gap-7">
        <button type="button" disabled={busy || !!match} onClick={() => void swipe("pass")} aria-label="Pass profile" title="Pass (left arrow)" className="grid h-[66px] w-[66px] place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:border-rose-200 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"><X size={30} strokeWidth={2.4} /></button>
        <button type="button" disabled={busy || !!match} onClick={() => void swipe("like")} aria-label="Like profile" title="Like (right arrow)" className="grid h-[74px] w-[74px] place-items-center rounded-full bg-rose-500 text-white shadow-[0_12px_30px_rgba(244,63,94,0.32)] transition hover:-translate-y-1 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"><Heart size={32} fill="currentColor" /></button>
      </div>
      <p className="mt-5 text-center text-xs text-stone-400">Swipe left to pass <span className="mx-2">·</span> Right to like</p>
    </> : <div className="mx-auto mt-12 flex min-h-[380px] max-w-sm flex-col items-center justify-center gap-4 rounded-[30px] border border-dashed border-rose-200 bg-rose-50/50 p-9 text-center"><div className="rounded-full bg-rose-100 p-5"><RefreshCw size={32} className="text-rose-500" /></div><h2 className="text-2xl font-extrabold">You&apos;re all caught up!</h2><p className="text-sm leading-relaxed text-stone-500">You&apos;ve seen everyone in Discover. Your swipes are saved, even when you refresh.</p><button type="button" onClick={() => void load()} className="mt-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-600">Check again</button></div>}

    <AnimatePresence>
      {match && <motion.div role="dialog" aria-modal="true" aria-labelledby="match-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#25111d]/90 p-5 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 230, damping: 22 }} className="w-full max-w-sm text-center text-white">
          <motion.div initial={{ scale: 0.65, rotate: -16 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.15 }} className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.45)]"><Heart size={50} fill="currentColor" /></motion.div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-rose-200">The feeling is mutual</p>
          <h2 id="match-title" className="mt-3 text-5xl font-black tracking-tight">It&apos;s a match!</h2>
          <div className="mx-auto my-8 h-32 w-32 overflow-hidden rounded-full border-4 border-white/50 shadow-xl"><Image src={match.photo} alt={`Illustration for ${match.name}`} width={128} height={128} unoptimized className="h-full w-full object-cover" /></div>
          <p className="text-lg">You and <strong>{match.name}</strong> liked each other.</p>
          <p className="mt-2 text-sm text-white/70">Only mutual likes become visible in Coy.</p>
          <button type="button" onClick={() => setMatch(null)} className="mt-8 w-full rounded-full bg-white px-8 py-4 font-bold text-rose-600 transition hover:bg-rose-50">Keep discovering</button>
          <button type="button" onClick={() => { setMatch(null); onViewMatches?.(); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-8 py-4 font-bold text-white transition hover:bg-white/10">View my matches <ArrowLeft size={17} className="rotate-180" /></button>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
