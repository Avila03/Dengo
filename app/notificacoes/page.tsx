import {Suspense} from "react";
import {NotificationSettings} from "@/components/notification-settings";
export default function Page() {
  return <Suspense fallback={<p>Carregando notificações…</p>}><NotificationSettings/></Suspense>;
}
