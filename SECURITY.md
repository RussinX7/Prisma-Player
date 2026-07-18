# Segurança do Prisma Player

Este arquivo registra as decisões de segurança que devem continuar valendo no projeto.

## Autenticação e permissões

- Todas as páginas sob `/dashboard` devem passar pelo layout protegido no servidor.
- Permissões administrativas devem usar `app_metadata`/`raw_app_meta_data`, nunca `user_metadata`, porque metadados de usuário podem ser editáveis pelo próprio usuário.
- Administradores devem manter MFA/AAL2 ativo antes de acessar áreas sensíveis.
- Login, recuperação de senha e troca de senha possuem limitação de tentativas no app, além dos limites internos do Supabase Auth.

## Vídeos e embed

- A rota pública de embed não deve confiar em parâmetros enviados pelo cliente para validar domínio.
- O domínio autorizado deve ser inferido de `Referer`/`Origin` reais e convertido em `originToken` assinado no servidor.
- URLs assinadas de vídeo devem ter expiração curta.
- Novos uploads devem validar que o `object_path` começa com o `user_id` autenticado.

## Webhooks e SSRF

- Testes de webhook de saída aceitam apenas HTTPS.
- URLs com credenciais, portas customizadas, redirect automático ou IPs privados/loopback/link-local devem ser bloqueadas.
- O timeout de chamadas externas deve permanecer curto.
- Payloads recebidos de gateways devem ser validados com assinatura/HMAC quando o provedor oferecer esse recurso.

## Prisma IA

- Nunca enviar segredos, variáveis de ambiente, tokens, SQL bruto sensível ou dados de outros usuários para provedores de IA.
- Prompts devem receber apenas métricas agregadas e escopadas ao usuário autenticado.
- Respostas da IA devem ser tratadas como recomendação operacional, não como decisão automática que altera campanhas ou billing.

## Banco de dados e Supabase

- Tabelas expostas em `public` devem ter RLS habilitado.
- Políticas devem combinar `TO authenticated` com predicado de posse, como `(select auth.uid()) = user_id`.
- Funções `SECURITY DEFINER` precisam revogar `EXECUTE` de `PUBLIC`, `anon` e `authenticated`, exceto quando houver justificativa explícita.
- Alterações de schema devem entrar em migrations versionadas.

## CI e dependências

- O CI deve rodar `npm run lint`, `npm run build` e `npm audit --audit-level=high`.
- Dependências devem permanecer pinadas via `package-lock.json`.
- Vulnerabilidades moderadas conhecidas de dependências transitivas devem ser monitoradas até existir atualização segura.
