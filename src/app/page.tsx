"use client";
import { useState } from "react";
import { Heart, House, Compass, UsersRound } from "lucide-react";
import Discover from "@/components/discover";
import Matches from "@/components/matches";

type Tab = "home" | "discover" | "matches";
export default function Page() {
  const [tab, setTab] = useState<Tab>("discover");
  const tabs = [ { id: "home" as Tab, label: "Home", Icon: House }, { id: "discover" as Tab, label: "Discover", Icon: Compass }, { id: "matches" as Tab, label: "Matches", Icon: UsersRound } ];
  return <div className="min-h-dvh"><main className="mx-auto flex min-h-dvh max-w-md flex-col border-x border-stone-100 bg-white shadow-sm">
    <header className="flex items-center justify-between border-b border-stone-100 px-6 py-5"><div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-rose-600"><Heart fill="currentColor" size={25}/> coy<span className="text-stone-800">discover</span></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">DEMO</span></header>
    <section className="flex-1">{tab === "home" ? <div aria-label="Home placeholder"/> : tab === "discover" ? <Discover onViewMatches={() => setTab("matches")} /> : <Matches/>}</section>
    <nav aria-label="Main navigation" className="sticky bottom-0 grid grid-cols-3 border-t border-stone-100 bg-white pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      {tabs.map(({id,label,Icon}) => <button key={id} onClick={()=>setTab(id)} className={`flex flex-col items-center gap-1 text-xs font-medium ${tab===id ? "text-rose-600" : "text-stone-400"}`} aria-current={tab===id ? "page" : undefined}><Icon size={22} strokeWidth={tab===id ? 2.5 : 1.8}/>{label}</button>)}
    </nav>
  </main></div>;
}
