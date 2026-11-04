"use client";

import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {supabase} from "@/lib/supabase";
import type {User} from "@supabase/supabase-js";
import {
  type Appearance,DEFAULT_APPEARANCE,parseAppearance,appearanceStorageKey,
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
    const previousId:Record<string,Appearance["theme"]>={
      original:"original",noite:"noite",lavanda:"lavanda",salvia:"salvia",
      inverno:"cobalto",ouro:"grafite",
    };
    const previous=typeof legacyTheme==="string"?previousId[legacyTheme]:undefined;
    const selected=parseAppearance(remote??local??(previous?{theme:previous}:null));
    lastRemote.current=remote == null ? "" : JSON.stringify(selected);
    setCurrent(selected);
    setStatus("idle");
    setReady(true);
    // Deliberately bound to identity: metadata refreshes must not override an in-progress local choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId]);

  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.dengoTheme=appearance.theme;
    root.dataset.dengoCards=appearance.cards;
    root.dataset.dengoBackground=appearance.background;
    root.dataset.dengoFont=appearance.font;
    root.dataset.dengoIcons=appearance.icons;
    const dark=["noite","salvia","iris","grafite","floresta","ametista","neon"].includes(appearance.theme);
    root.style.colorScheme=dark?"dark":"light";
    const color=document.querySelector('meta[name="theme-color"]');
    if(color)color.setAttribute("content",({
      original:"#F9F7F4",noite:"#0C0E15",lavanda:"#EEE8FB",salvia:"#0E261D",
      iris:"#292F58",grafite:"#222629",floresta:"#102C24",ametista:"#271B3D",
      cobalto:"#1643D8",atelier:"#F8F7F4",fucsia:"#F52C98",neon:"#090B15",
      mono:"#FFFFFF",
    } as Record<string,string>)[appearance.theme]);
  },[appearance]);

  useEffect(()=>()=> {
    const root=document.documentElement;
    delete root.dataset.dengoTheme;
    delete root.dataset.dengoCards;
    delete root.dataset.dengoBackground;
    delete root.dataset.dengoFont;
    delete root.dataset.dengoIcons;
    root.style.removeProperty("color-scheme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#f9f7f4");
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
