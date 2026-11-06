"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {useSearchParams,useRouter} from "next/navigation";
import {NotificationInbox} from "./notification-inbox";
import {
  ArrowLeft, Bell, CalendarClock, CalendarDays, CheckCircle2, Clock3,
  CreditCard, ListChecks, MapPin, Save, SlidersHorizontal, Smartphone, Sunrise,
} from "lucide-react";
import { PushDevice } from "./push-device";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { supabase } from "@/lib/supabase";
import {
  NOTIFICATION_METADATA_KEY, NOTIFICATION_TYPES, notificationStorageKey,
  parseNotificationPreferences, validateNotificationPreferences,
  type NotificationPreferences, type NotificationType,
} from "@/lib/notification-preferences";

const options = [
  { id: "upcomingEvent", icon: CalendarClock, title: "Compromisso chegando",
    description: "Um lembrete antes dos eventos em que você participa." },
  { id: "eventChanges", icon: CalendarDays, title: "Compromisso alterado ou cancelado",
    description: "Quando seu par mudar a data, o horário ou cancelar um evento em que você participa." },
  { id: "newResponsibility", icon: ListChecks, title: "Nova responsabilidade",
    description: "Quando seu par atribuir uma responsabilidade a você ou aos dois." },
  { id: "paymentDue", icon: CreditCard, title: "Pagamento próximo do vencimento",
    description: "Lembretes de contas, assinaturas e parcelas que ainda precisam ser pagas." },
  { id: "overdue", icon: Clock3, title: "Pendência atrasada",
    description: "Um aviso às 9h da manhã seguinte ao prazo de uma responsabilidade ou pagamento pendente." },
  { id: "partnerCompletion", icon: CheckCircle2, title: "Conclusão pelo par",
    description: "Quando seu par concluir uma responsabilidade compartilhada ou registrar um pagamento." },
  { id: "newPlan", icon: MapPin, title: "Novo plano salvo",
    description: "Quando seu par adicionar um filme, uma série ou um lugar para vocês conhecerem." },
  { id: "dailyDigest", icon: Sunrise, title: "Resumo do dia",
    description: "Seus compromissos e pendências, incluindo o que é compartilhado com o casal." },
] as const satisfies readonly { id: NotificationType; icon: typeof Bell; title: string; description: string }[];

export function NotificationSettings() {
  const { user, demo } = useDengo();
  const userId = user?.id || "demo";
  const search=useSearchParams(),router=useRouter();
  const tab=search.get("aba")==="preferencias"?"preferencias":"avisos";
  const [unread,setUnread]=useState(0);
  function selectTab(next:"avisos"|"preferencias") {
    router.replace(next==="avisos"?"/notificacoes":"/notificacoes?aba=preferencias",{scroll:false});
  }
  return <Shell><div className="notification-settings">
    <Link href="/" className="text-link notification-back"><ArrowLeft size={17}/>Voltar ao nosso dia</Link>
    <header className="notification-heading"><div><h1>Notificações<span className="rose">.</span></h1>
      <p>Seus avisos e suas preferências, em um só lugar.</p></div><span className="notification-heading-mark" aria-hidden="true"><Bell size={23}/></span></header>
    <div className="notification-tabs" role="tablist" aria-label="Notificações">
      {(["avisos","preferencias"] as const).map(key=><button key={key} id={"notification-tab-"+key} type="button" role="tab"
        aria-selected={tab===key} aria-controls={"notification-panel-"+key} tabIndex={tab===key?0:-1}
        onKeyDown={event=>{if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();const next=key==="avisos"?"preferencias":"avisos";selectTab(next);document.getElementById("notification-tab-"+next)?.focus();}}}
        onClick={()=>selectTab(key)}>{key==="avisos"?"Avisos":"Preferências"}{key==="avisos"&&unread?<span>{unread}</span>:null}</button>)}
    </div>
    <div id="notification-panel-avisos" role="tabpanel" aria-labelledby="notification-tab-avisos" hidden={tab!=="avisos"}>
      <NotificationInbox key={userId} onUnreadCount={setUnread}/>
    </div>
    <div id="notification-panel-preferencias" role="tabpanel" aria-labelledby="notification-tab-preferencias" hidden={tab!=="preferencias"}>
      <NotificationEditor key={userId} userId={userId} remote={user?.user_metadata?.[NOTIFICATION_METADATA_KEY]} demo={demo}/>
    </div>
  </div></Shell>;
}

function NotificationEditor({ userId, remote, demo }: { userId: string; remote: unknown; demo: boolean }) {
  const id = useId();
  const [preferences, setPreferences] = useState(() => parseNotificationPreferences(remote));
  const [ready, setReady] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  const initialRemote = useRef(remote);
  useEffect(() => {
    mounted.current = true;
    let local: unknown = null;
    try {
      const raw = window.localStorage.getItem(notificationStorageKey(userId));
      if (raw) local = JSON.parse(raw);
    } catch { /* Account storage is best effort when saving remotely. */ }
    const initial = initialRemote.current ?? local;
    const next = parseNotificationPreferences(initial);
    setPreferences(next);
    setSavedSnapshot(initial == null || (!demo && initialRemote.current == null) ? "" : JSON.stringify(next));
    setReady(true);
    return () => { mounted.current = false; };
  }, [userId, demo]);

  const enabledCount = NOTIFICATION_TYPES.filter((key) => preferences.enabled[key]).length;
  const dirty = JSON.stringify(preferences) !== savedSnapshot;
  const saving = status === "saving";
  function change(patch: Partial<NotificationPreferences>) {
    setPreferences((previous) => ({ ...previous, ...patch }));
    setStatus("idle"); setError("");
  }
  function toggle(key: NotificationType, enabled: boolean) {
    setPreferences((previous) => ({ ...previous, enabled: { ...previous.enabled, [key]: enabled } }));
    setStatus("idle"); setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || lock.current) return;
    lock.current = true; setError(""); setStatus("saving");
    const snapshot = preferences;
    try {
      validateNotificationPreferences(snapshot);
      if (!demo) {
        const client = supabase;
        if (!client) throw new Error("Entre na sua conta para salvar as preferências.");
        const current = await client.auth.getUser();
        if (current.error || current.data.user?.id !== userId)
          throw new Error("Sua sessão mudou. Entre novamente para salvar suas preferências.");
        if (!mounted.current) return;
        const result = await client.auth.updateUser({ data: { [NOTIFICATION_METADATA_KEY]: snapshot } });
        if (result.error || result.data.user?.id !== userId)
          throw new Error("Não foi possível salvar na sua conta. Tente novamente.");
      }
      try { window.localStorage.setItem(notificationStorageKey(userId), JSON.stringify(snapshot)); }
      catch { if (demo) throw new Error("O navegador bloqueou o armazenamento. Não foi possível salvar nesta prévia."); }
      if (mounted.current) { setSavedSnapshot(JSON.stringify(snapshot)); setStatus("saved"); }
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.");
        setStatus("error");
      }
    } finally { lock.current = false; }
  }

  return <div className="notification-preferences">
    <p className="notification-preference-intro">Escolha os avisos que fazem sentido para você. Suas preferências são individuais.</p>
    <PushDevice />
    <form onSubmit={(event) => void save(event)}>
      <fieldset disabled={!ready || saving} className="notification-fieldset">
        <legend className="notification-list-heading">Avisos que quero receber
          <span>{enabledCount} de {NOTIFICATION_TYPES.length} selecionados</span></legend>
        <div className="notification-options">
          {options.map(({ id: key, icon: Icon, title, description }) => <section
            key={key} className={"notification-option" + (preferences.enabled[key] ? " is-enabled" : "")}>
            <label className="notification-option-label" htmlFor={id + key}>
              <span className="notification-option-icon" aria-hidden="true"><Icon size={20} /></span>
              <span className="notification-option-copy"><strong id={id + key + "-title"}>{title}</strong>
                <span id={id + key + "-description"}>{description}</span></span>
              <input id={id + key} className="notification-switch" type="checkbox" role="switch"
                checked={preferences.enabled[key]} aria-labelledby={id + key + "-title"}
                aria-describedby={id + key + "-description"}
                onChange={(event) => toggle(key, event.target.checked)} />
            </label>
            {preferences.enabled[key] && key === "upcomingEvent" ? <div className="notification-option-controls">
              <label>Antecedência
                <select value={preferences.eventMinutesBefore} onChange={(event) => change({
                  eventMinutesBefore: Number(event.target.value) as NotificationPreferences["eventMinutesBefore"],
                })}>
                  <option value={15}>15 minutos antes</option><option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option><option value={120}>2 horas antes</option>
                  <option value={1440}>1 dia antes</option>
                </select>
              </label>
            </div> : null}
            {preferences.enabled[key] && key === "paymentDue" ? <div className="notification-option-controls">
              <label>Primeiro aviso
                <select value={preferences.paymentDaysBefore} onChange={(event) => change({
                  paymentDaysBefore: Number(event.target.value) as NotificationPreferences["paymentDaysBefore"],
                })}>
                  <option value={1}>1 dia antes</option><option value={3}>3 dias antes</option><option value={7}>7 dias antes</option>
                </select>
              </label>
              <label>Pagamentos que quero acompanhar
                <select value={preferences.paymentAudience} onChange={(event) => change({
                  paymentAudience: event.target.value as NotificationPreferences["paymentAudience"],
                })}>
                  <option value="mine">Em que eu sou o pagador</option><option value="couple">Todos os pagamentos do casal</option>
                </select>
              </label>
              <label className="notification-check"><input type="checkbox" checked={preferences.paymentOnDueDay}
                onChange={(event) => change({ paymentOnDueDay: event.target.checked })} />
                Avisar também às 9h do vencimento
              </label>
            </div> : null}
            {preferences.enabled[key] && key === "dailyDigest" ? <div className="notification-option-controls">
              <label>Horário do resumo
                <input type="time" required value={preferences.dailyTime}
                  onChange={(event) => change({ dailyTime: event.target.value })} />
              </label>
            </div> : null}
          </section>)}
        </div>
        <details className="notification-extra-settings panel" open={error.includes("silêncio") || undefined}>
          <summary><SlidersHorizontal size={18} /> Horários e privacidade</summary>
          <div className="notification-extra-content">
            <label className="notification-check"><input type="checkbox" checked={preferences.quietHours.enabled}
              onChange={(event) => change({ quietHours: { ...preferences.quietHours, enabled: event.target.checked } })} />
              Usar horário de silêncio
            </label>
            {preferences.quietHours.enabled ? <div className="notification-time-pair">
              <label>Início do silêncio<input type="time" required value={preferences.quietHours.start}
                onChange={(event) => change({ quietHours: { ...preferences.quietHours, start: event.target.value } })} /></label>
              <label>Voltar a receber<input type="time" required value={preferences.quietHours.end}
                onChange={(event) => change({ quietHours: { ...preferences.quietHours, end: event.target.value } })} /></label>
            </div> : null}
            <p>Os avisos ainda relevantes chegam depois do silêncio. Todos os horários seguem Brasília.</p>
            <label className="notification-check"><input type="checkbox" checked={preferences.hidePreview}
              onChange={(event) => change({ hidePreview: event.target.checked })} />
              Ocultar nomes dos registros e valores na tela bloqueada
            </label>
            <p>A ação continua visível, como “Filme adicionado à lista”. Desative para mostrar também o nome do registro.</p>
          </div>
        </details>
      </fieldset>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="notification-save-bar">
        <span role="status" aria-live="polite">{!ready ? "Carregando preferências…"
          : saving ? "Salvando preferências…" : status === "saved" ? demo ? "Preferências salvas neste navegador" : "Preferências salvas na sua conta"
          : dirty ? "Você tem alterações para salvar" : "Preferências individuais"}</span>
        <button type="submit" className="primary" disabled={!ready || saving || !dirty}>
          <Save size={17} /> {saving ? "Salvando…" : "Salvar preferências"}
        </button>
      </div>
    </form>
  </div>;
}
