# Produção: Vercel + Supabase

## Variáveis da Vercel

Configure em Production, Preview e Development:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED
NEXT_PUBLIC_SUPABASE_APPLE_ENABLED
ABACATEPAY_API_KEY
ABACATEPAY_WEBHOOK_SECRET
ABACATEPAY_PUBLIC_KEY
```

Somente URL e publishable key podem usar `NEXT_PUBLIC_`. A secret key nunca entra no Git, no bundle, em logs ou em respostas da API.

Valores do projeto Prisma Player:

```text
NEXT_PUBLIC_SUPABASE_URL=https://jghtmqzgyyonelfmjdxb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_55e6DybK7f5sZwqlnCEHJw_Eju40F6L
SUPABASE_URL=https://jghtmqzgyyonelfmjdxb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_55e6DybK7f5sZwqlnCEHJw_Eju40F6L
SUPABASE_SECRET_KEY=<cole a secret key completa somente na Vercel>
SUPABASE_JWKS_URL=https://jghtmqzgyyonelfmjdxb.supabase.co/auth/v1/.well-known/jwks.json
NEXT_PUBLIC_SITE_URL=https://prisma-player.vercel.app
NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED=false
NEXT_PUBLIC_SUPABASE_APPLE_ENABLED=false
ABACATEPAY_API_KEY=<chave de API v2 da AbacatePay; nunca use NEXT_PUBLIC_>
ABACATEPAY_WEBHOOK_SECRET=<segredo aleatorio forte usado na URL do webhook>
ABACATEPAY_PUBLIC_KEY=<opcional; use apenas para substituir a chave HMAC publica oficial>
```

## AbacatePay

- O PIX usa `POST /v2/checkouts/create` com produto avulso e libera 30 dias após `checkout.completed`.
- O cartão usa `POST /v2/subscriptions/create` com produto `MONTHLY` e renovação automática.
- Cadastre o webhook HTTPS `https://prisma-player.vercel.app/api/webhooks/abacatepay` no mesmo ambiente da chave (dev ou produção).
- Use o mesmo valor de `ABACATEPAY_WEBHOOK_SECRET` no cadastro do webhook. A AbacatePay o envia como `?webhookSecret=...`.
- Assine `checkout.completed`, `checkout.refunded`, `checkout.disputed`, `checkout.lost`, `subscription.completed`, `subscription.renewed` e `subscription.cancelled`.
- O endpoint valida o secret, o corpo bruto e `X-Webhook-Signature` antes de alterar qualquer acesso.

As duas flags de OAuth só devem virar `true` depois de configurar cada provedor no painel do Supabase. Depois de alterar qualquer variável `NEXT_PUBLIC_`, faça um novo deploy, pois o valor é incorporado ao bundle durante o build.

## Banco e Storage

1. Vincule o CLI ao projeto correto.
2. Revise `supabase/migrations`.
3. Execute `supabase db push`.
4. Rode os advisors de segurança e performance.
5. Confirme os buckets privados `videos` e `player-assets`.
6. Teste com duas contas diferentes para confirmar isolamento por RLS.

## Auth

- Defina o Site URL como `https://prisma-player.vercel.app`.
- Cadastre `https://prisma-player.vercel.app/auth/callback` nas redirect URLs do Supabase.
- Ative os provedores Google/Apple antes de exibir OAuth em produção.
- Configure SMTP próprio para confirmação e recuperação de senha.
- Mantenha a expiração de JWT curta e use MFA para operações administrativas.

## Vercel

- Framework: Next.js.
- Build: `npm run build`.
- Node.js: versão suportada pelo Next 16.
- O upload vai direto do navegador ao bucket privado com JWT e RLS; o arquivo não atravessa uma Serverless Function da Vercel.
- Configure domínio e `NEXT_PUBLIC_SITE_URL` antes de testar OAuth.

## Limite atual

A migration precisa ser aplicada ao projeto remoto antes que perfil, pastas, vídeos e player configs funcionem. O código não usa a secret key para operações normais; todas passam pelo JWT do usuário e pelas políticas RLS.
