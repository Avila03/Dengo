/** Regras da troca de senha, sem dependências de UI (testadas em tests/password.test.ts). */
export const MIN_PASSWORD = 8;

export function passwordChangeProblem(current: string, next: string, confirmation: string): string {
  if (!current) return "Digite a senha atual.";
  if (next.length < MIN_PASSWORD) return `A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (next !== confirmation) return "A confirmação não é igual à nova senha.";
  if (next === current) return "A nova senha precisa ser diferente da atual.";
  return "";
}

/** Traduz os erros do Supabase Auth para algo que o casal entenda. */
export function passwordChangeMessage(error: { message?: string; code?: string } | null | undefined): string {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (text.includes("invalid_credentials") || text.includes("invalid login")) return "A senha atual não confere.";
  if (text.includes("weak") || text.includes("pwned")) return "Essa senha é fraca demais. Tente uma mais longa, com letras e números.";
  if (text.includes("same_password") || text.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (text.includes("rate") || text.includes("too many")) return "Muitas tentativas. Espere um pouco e tente de novo.";
  return "Não foi possível trocar a senha. Tente novamente.";
}
