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
```

Somente URL e publishable key podem usar `NEXT_PUBLIC_`. A secret key nunca entra no Git, no bundle, em logs ou em respostas da API.

## Banco e Storage

1. Vincule o CLI ao projeto correto.
2. Revise `supabase/migrations`.
3. Execute `supabase db push`.
4. Rode os advisors de segurança e performance.
5. Confirme os buckets privados `videos` e `player-assets`.
6. Teste com duas contas diferentes para confirmar isolamento por RLS.

## Auth

- Cadastre `https://SEU-DOMINIO/auth/callback` nas redirect URLs do Supabase.
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
