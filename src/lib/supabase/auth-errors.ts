export function getAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code).toLowerCase() : "";
  if (message.includes("already registered") || message.includes("already been registered")) return "Este e-mail já possui uma conta. Faça login.";
  if (code === "user_already_exists" || code === "email_exists") return "Este e-mail já possui uma conta. Faça login.";
  if (message.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (message.includes("email rate limit") || code.includes("rate_limit")) return "Muitos cadastros foram solicitados. Aguarde alguns minutos e tente novamente.";
  if (message.includes("signup is disabled") || code === "signup_disabled") return "Novos cadastros estão temporariamente pausados.";
  if (message.includes("database error saving new user") || code === "unexpected_failure") return "O cadastro não foi concluído no banco. A correção já foi preparada; tente novamente após a atualização.";
  if (message.includes("password")) return "A senha não atende aos requisitos de segurança.";
  if (message.includes("fetch") || message.includes("network")) return "Não foi possível conectar ao servidor. Tente novamente.";
  if (message.includes("timeout")) return "O servidor demorou para responder. Tente novamente.";
  if (message.includes("not configured")) return "A autenticação ainda não foi configurada neste ambiente.";
  return fallback;
}

export async function withAuthTimeout<T>(operation: PromiseLike<T>, timeoutMs = 20_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Auth request timeout")), timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function oauthEnabled(provider: "google" | "apple") {
  return provider === "google"
    ? process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED === "true"
    : process.env.NEXT_PUBLIC_SUPABASE_APPLE_ENABLED === "true";
}
