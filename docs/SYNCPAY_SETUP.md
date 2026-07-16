# SyncPay na Prisma Player

## Plano

Crie uma única vez na SyncPay o plano mensal **Prisma Completo**, no valor de **R$ 97,00**, com cobrança por QR Code/Pix. Copie o token desse plano para `SYNCPAY_PLAN_TOKEN`. O checkout nunca cria planos e nunca aceita preço vindo do navegador.

## Variáveis da Vercel

Todas são somente de servidor e não podem usar o prefixo `NEXT_PUBLIC_`:

```env
SYNCPAY_BASE_URL=https://URL-OFICIAL-DA-SUA-CONTA-SYNCPAY
SYNCPAY_CLIENT_ID=...
SYNCPAY_CLIENT_SECRET=...
SYNCPAY_PLAN_TOKEN=...
SYNCPAY_WEBHOOK_TOKEN=...
BILLING_DOCUMENT_PEPPER=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

Confirme a URL base no painel/credenciais da SyncPay. Não use domínios encontrados em buscas de produtos com nomes parecidos.

## Webhook

Cadastre na SyncPay:

```text
https://SEU-DOMINIO/api/webhooks/syncpay
```

Configure o Bearer token do webhook com o mesmo valor de `SYNCPAY_WEBHOOK_TOKEN` e selecione os eventos `cashin.create`, `cashin.update`, `assinatura_ativada`, `assinatura_em_atraso`, `assinatura_suspensa`, `assinatura_cancelada` e `assinatura_reativada`.

## Banco

Execute a migration `20260716170746_syncpay_billing.sql` no Supabase antes de publicar o checkout. Ela cria RLS, índices de idempotência, plano fixo, assinaturas, cobranças, eventos e auditoria.

Uma assinatura só fica ativa após existirem os dois sinais validados: cobrança PIX paga e evento `assinatura_ativada`. Webhooks repetidos são descartados pela chave única do evento.
