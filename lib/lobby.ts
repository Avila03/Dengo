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
