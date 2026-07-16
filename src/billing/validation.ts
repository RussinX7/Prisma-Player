import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export const PLAN_SLUG = "prisma-completo";
export const TERMS_VERSION = "2026-07-16";

export function digits(value: unknown) { return typeof value === "string" ? value.replace(/\D/g, "") : ""; }

export function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(cpf[length]);
  };
  return check(9) && check(10);
}

export function validateCheckout(body: unknown) {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const customer = (input.customer && typeof input.customer === "object" ? input.customer : {}) as Record<string, unknown>;
  const name = typeof customer.name === "string" ? customer.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const document = digits(customer.document);
  const phone = digits(customer.phone);
  if (input.planSlug !== PLAN_SLUG) return { error: "Plano inválido." } as const;
  if (input.acceptedTerms !== true) return { error: "Aceite os termos para continuar." } as const;
  if (name.length < 3 || name.length > 120) return { error: "Informe o nome completo." } as const;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Informe um e-mail válido." } as const;
  if (!isValidCpf(document)) return { error: "Informe um CPF válido." } as const;
  if (phone.length < 10 || phone.length > 13) return { error: "Informe um telefone válido com DDD." } as const;
  return { data: { planSlug: PLAN_SLUG, acceptedTerms: true, customer: { name, email, document, phone } } } as const;
}

export function hashDocument(value: string) {
  const pepper = process.env.BILLING_DOCUMENT_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("BILLING_DOCUMENT_PEPPER must have at least 32 characters");
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

export function secureBearerMatches(header: string | null) {
  const expected = process.env.SYNCPAY_WEBHOOK_TOKEN?.replace(/\s+/g, "");
  const received = header?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !received) return false;
  const a = Buffer.from(expected); const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
