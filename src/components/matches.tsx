"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Image from "next/image";
import type { Profile } from "@/lib/types";
export default function Matches() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/matches", {cache:"no-store"}).then(async response => { if(!response.ok) throw new Error();return response.json() as Promise<{matches:Profile[]}>; })
      .then(data=>{if(active)setProfiles(data.matches);}).catch(()=>{if(active)setError("Could not load matches.");}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  }, []);
  return <div className="px-5 py-6"><h1 className="text-2xl font-bold">Your Matches</h1><p className="mt-1 text-sm text-stone-500">Only mutual likes appear here.</p>
    {loading ? <p className="mt-8 text-stone-500">Loading matches...</p> : error ? <p role="alert" className="mt-8 text-red-600">{error}</p> : profiles.length === 0 ? <div className="mt-36 flex flex-col items-center gap-3 text-center"><Heart size={46} className="text-rose-400"/><h2 className="text-xl font-semibold">No matches yet</h2><p className="max-w-xs text-sm text-stone-500">Like someone who also likes you and your matches will appear here.</p></div> : <div className="mt-6 grid grid-cols-2 gap-3">{profiles.map(person=><article key={person.id} className="overflow-hidden rounded-2xl bg-stone-50"><Image src={person.photo} alt={`Illustration for ${person.name}`} width={320} height={400} unoptimized className="aspect-[4/5] w-full object-cover"/><div className="p-3"><h2 className="font-bold">{person.name}, {person.age}</h2><p className="text-xs text-stone-500">{person.city}</p></div></article>)}</div>}
  </div>;
}
