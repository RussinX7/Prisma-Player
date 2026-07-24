# Auditoria de Segurança — Prisma Player (24/07/2026)

**Análise:** código-fonte completo (~40 route handlers, libs, migrations, config)
**Baseada na auditoria anterior:** 21/07/2026 — as correções foram verificadas como aplicadas.

---

## Resumo executivo

A base de segurança do Prisma Player é **madura e bem estruturada**. RLS por posse, service role só no servidor, anti-SSRF real, rate limit atômico, CSRF por origem, HMAC em tokens de embed, idempotência em webhooks. Nesta auditoria foram encontrados **4 novos achados** (1 🔴, 2 🟠, 1 🟡) e **2 riscos residuais**. Nenhum segredo, SQL injection, ou IDOR grave foi encontrado.

---

## 1. Pontos fortes confirmados

| Controle | Status |
|----------|--------|
| RLS por posse em todas as tabelas `public` | ✅ |
| Service role isolada ao servidor (`server-only`) | ✅ |
| `object_path` validado contra path traversal + escopo `user_id` | ✅ |
| Anti-SSRF: só HTTPS, sem credenciais/porta, resolve DNS, bloqueia privados | ✅ |
| HMAC em tokens de embed + evento (timing-safe, TTL curto) | ✅ |
| CSRF por origem em todas as mutations (`csrfGuard`) | ✅ |
| Rate limit atômico via RPC `consume_rate_limit` | ✅ |
| Webhook AbacatePay idempotente (`payment_webhook_events`) | ✅ |
| Preço do plano lido do banco (cliente envia só slug) | ✅ |
| Troca de senha exige senha atual + rate limit fail-closed | ✅ |
| Admin exige `app_metadata.role=admin` + MFA/AAL2 | ✅ |
| IA redige segredos, sem PII no prompt | ✅ |
| CSP, HSTS, `nosniff`, `X-Frame-Options` configurados | ✅ |

---

## 2. Achados novos nesta auditoria

### 🔴 ALTO

**#A1 — Checkout sem rate limit (billing + créditos IA)**
`/api/billing/checkout/route.ts` e `/api/billing/ai-credits/checkout/route.ts` não aplicam `rateLimit()`. Um usuário pode disparar centenas de chamadas, gerando:

- Acúmulo de `billing_checkouts`/`ai_credit_checkouts` com status `failed`/`pending`
- Múltiplas chamadas à AbacatePay (`/products/create`, `/checkouts/create`, `/subscriptions/create`)
- **Custo financeiro** real (checkout criado no gateway)

**Correção:** adicionar `rateLimit(request, "checkout:" + userId, { max: 5, windowMs: 60_000, failClosed: true })` nos dois handlers. Validar também se já existe checkout pendente antes de criar novo.

---

### 🟠 MÉDIO

**#A2 — Race condition na análise de IA (crédito debitado depois do processamento)**
`/api/ai/analyze/route.ts:113-118`: a chamada `analyzeWithNvidia()` (que custa dinheiro via NVIDIA API) **roda antes** de debitar o crédito do usuário (`consume_ai_credit`). Se o debit falhar (erro de rede, timeout, deadlock na RPC), o usuário recebe a análise **de graça** e a Prisma arca com o custo NVIDIA.
Caminho inverso: se o debit ocorre mas a gravação do resultado falha (`line 118`), o usuário perdeu crédito sem ver o resultado.

**Correção:** inverter a ordem: debitar o crédito antes da chamada NVIDIA. Se o debit falhar, retornar 402 sem chamar a IA. E adicionar `failover` para estornar se a IA falhar (ex.: `admin.rpc("refund_ai_credit")`).

**#A3 — Webhook AbacatePay: concorrência entre instâncias pode ativar assinatura duas vezes**
`/api/webhooks/abacatepay/route.ts:78-83`: a verificação duplicada (`existing.data?.status`) e o insert inicial não são atômicos. Duas requisições simultâneas com o mesmo `provider_event_id` podem passar da checagem inicial juntas, e a menos que o segundo insert encontre `23505`, ambas executam o processamento (duas upserts de subscription, dois e-mails, dois eventos PostHog).

**Correção:** usar um SELECT ... FOR UPDATE ou uma RPC de "claim" que atômica e retorne sucesso/fracasso, para serializar o processamento do primeiro recebedor.

---

### 🟡 BAIXO / Hardening

**#A4 — `/api/billing/cancel` sem rate limit**
Usuário pode chamar `/api/billing/cancel` repetidamente, cada uma chamando AbacatePay. Sem Lock/Idempotência — se o status da subscription já é "cancelled", o código retorna 409, mas chamadas simultâneas podem tentar cancelar duas vezes no gateway.

**Correção:** adicionar `rateLimit(request, "cancel:" + userId, { max: 3, windowMs: 60_000 })` e usar `.eq("status", "active")` no update para atomicidade.

---

## 3. Riscos residuais (conscientes, sem correção nesta iteração)

| Risco | Notas |
|-------|-------|
| **Proteção de conteúdo via `Referer`** | Spoofável por cliente não-browser (`curl`). Mitigado por URLs assinadas R2 (30 min). Decisão de produto. |
| **`'unsafe-inline'` no CSP script-src** | Se existir XSS, ele executa. Migrar para nonce exige reescrita por request no proxy. Decisão de engenharia. |
| **DNS rebinding no webhook de saída** | Teórico, mitigado por `redirect: "error"` e timeout 8s. |
| **Geo headers spoofáveis** | Filtro de país/dispositivo é recurso de tráfego, não fronteira de segurança. |

---

## 4. Checklist de endpoint novo (mantido da auditoria anterior)

- [x] Exige autenticação
- [x] Recupera usuário da sessão
- [x] Confere workspace/papel
- [x] Valida body, query e params
- [x] Ignora campos de autoridade do cliente
- [x] Aplica rate limit proporcional ao risco
- [x] Retorna DTO mínimo
- [x] Usa `no-store` para dados privados
- [x] É idempotente
- [x] Registra auditoria sem vazar segredos
- [x] Erro genérico no cliente
- [x] Proteção contra concorrência

**Observação:** o item "rate limit" está ausente em 3 endpoints (#A1, #A4). O item "concorrência" tem falha no webhook (#A3).

---

## 5. Ações recomendadas antes do go-live

1. Adicionar `rateLimit` nos endpoints de checkout (billing e créditos IA) — **#A1**
2. Inverter ordem débito → IA na análise — **#A2**
3. Rever concorrência no webhook AbacatePay com claim atômico — **#A3**
4. Adicionar `rateLimit` no cancelamento — **#A4**
5. Aplicar migration `20260721120000_atomic_rate_limit.sql` se ainda não aplicada
6. Configurar `EMBED_ORIGIN_SECRET`, `CRON_SECRET`, `ABACATEPAY_WEBHOOK_SECRET`, `TRUST_CLOUDFLARE_IP_HEADER=false` na Vercel
7. Rodar `npm audit --omit=dev` no CI

---

## 6. Conclusão

**Nota geral: 8/10** — risco financeiro controlado, sem falhas críticas de acesso ou vazamento de dados. Os 4 achados desta auditoria são refinamentos de operação e billing, não bugs de autenticação ou autorização. A base está segura para produção desde que os itens #A1 e #A2 (impacto financeiro real) sejam corrigidos antes do go-live.

*Próxima auditoria recomendada: após integração de novos gateways de pagamento ou mudanças no pipeline de embed.*