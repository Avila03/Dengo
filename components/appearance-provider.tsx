"use client";

import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {supabase} from "@/lib/supabase";
import type {User} from "@supabase/supabase-js";
import {
  type Appearance,DEFAULT_APPEARANCE,parseAppearance,appearanceStorageKey,themeById,
} from "@/lib/appearance";

type AppearanceContext = {
  appearance: Appearance;
  setAppearance: (patch: Partial<Appearance>) => void;
  resetAppearance: () => void;
  status: "idle"|"saving"|"saved"|"error";
};
const AppearanceData=createContext<AppearanceContext|null>(null);
export function useAppearance() {
  const value=useContext(AppearanceData);
  if(!value) throw new Error("AppearanceProvider ausente");
  return value;
}
export function AppearanceProvider({children,user,demo}:{children:ReactNode;user:User|null;demo:boolean}) {
  const userId=user?.id??"demo";
  const [appearance,setCurrent]=useState<Appearance>(DEFAULT_APPEARANCE);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState<AppearanceContext["status"]>("idle");
  const lastRemote=useRef("");

  useEffect(()=>{
    setReady(false);
    let local: unknown=null;
    try {
      const raw=window.localStorage.getItem(appearanceStorageKey(userId));
      if(raw)local=JSON.parse(raw);
    } catch {/* Storage is optional. */}
    const remote=user?.user_metadata?.dengo_appearance as unknown;
    let legacyLocal: string|null=null;
    try {legacyLocal=window.localStorage.getItem("dengo.theme.v1:"+userId);}
    catch {/* Optional storage. */}
    const legacyTheme=user?.user_metadata?.dengo_theme??legacyLocal;
    // Temas antigos (Studio ou anteriores) viram o Caderno de dia ou à noite.
    const selected=parseAppearance(remote??local??(typeof legacyTheme==="string"?{theme:legacyTheme}:null));
    lastRemote.current=remote == null ? "" : JSON.stringify(selected);
    setCurrent(selected);
    setStatus("idle");
    setReady(true);
    // Deliberately bound to identity: metadata refreshes must not override an in-progress local choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId]);

  useEffect(()=>{
    const root=document.documentElement;
    const theme=themeById(appearance.theme);
    root.dataset.dengoTheme=theme.id;
    root.style.colorScheme=theme.dark?"dark":"light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme.background);
  },[appearance]);

  useEffect(()=>()=> {
    const root=document.documentElement;
    delete root.dataset.dengoTheme;
    root.style.removeProperty("color-scheme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",themeById(DEFAULT_APPEARANCE.theme).background);
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const snapshot=JSON.stringify(appearance);
    try {window.localStorage.setItem(appearanceStorageKey(userId),snapshot);}
    catch {/* A blocked localStorage must not prevent theme updates. */}
    const client=supabase;
    if(demo || !user || !client) {
      setStatus("saved");
      return;
    }
    if(snapshot===lastRemote.current)return;

    setStatus("saving");
    let alive=true;
    const job=window.setTimeout(async()=>{
      try {
        const {error}=await client.auth.updateUser({data:{dengo_appearance:appearance}});
        if(!alive)return;
        if(error){setStatus("error");return;}
        lastRemote.current=snapshot;
        setStatus("saved");
      } catch {
        if(alive)setStatus("error");
      }
    },650);
    return ()=>{alive=false;window.clearTimeout(job);};
  },[appearance,ready,userId,demo]);

  function setAppearance(patch:Partial<Appearance>) {
    setCurrent(previous=>parseAppearance({...previous,...patch}));
  }
  function resetAppearance() {
    setCurrent({...DEFAULT_APPEARANCE});
  }
  return <AppearanceData.Provider value={{appearance,setAppearance,resetAppearance,status}}>
    {children}
  </AppearanceData.Provider>;
}
