export function invitationCode(value: string) {
  const clean = value.trim();
  let code = clean;
  if (/^https?:\/\//i.test(clean)) {
    try {
      code = new URL(clean).searchParams.get("convite") || "";
    } catch {
      code = "";
    }
  }
  if (!/^[0-9a-f]{32}$/i.test(code))
    throw new Error("Cole um código ou link de convite válido.");
  return code.toLowerCase();
}
export function authorName(slot: number | null | undefined, names: string[]) {
  return slot === 0 || slot === 1 ? names[slot] : "Registro anterior";
}
/** Lugar (0 ou 1) que fica livre para quem aceitar o próximo convite. */
export function vacantSlot(memberSlot: number) {
  return memberSlot === 1 ? 0 : 1;
}
/** Mensagem para o resultado de `leave_couple`, sem expor detalhes técnicos. */
export function leaveCoupleMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "";
  if (error.code === "DG001")
    return "Você é a última pessoa deste espaço. Confirme a exclusão para sair.";
  // Exceções das funções do Dengo (P0001) já chegam em português.
  if (error.code === "P0001" && error.message) return error.message;
  return "Não foi possível sair do casal agora. Confira a conexão e tente novamente.";
}
