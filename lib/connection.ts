/**
 * Sem internet, o Dengo não guarda nem mostra cópias dos registros no aparelho
 * (decisão de privacidade): só avisa e impede gravações que falhariam.
 */
export const OFFLINE_BANNER =
  "Sem internet · Você está vendo o que já estava aberto. Para salvar alterações, conecte-se de novo.";
export const OFFLINE_SAVE =
  "Sem conexão com a internet. Conecte-se para salvar; nada foi alterado.";
export function isOffline(nav: { onLine?: boolean } | undefined = typeof navigator === "undefined" ? undefined : navigator) {
  return nav?.onLine === false;
}
