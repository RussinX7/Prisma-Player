# Prisma Player — auditoria operacional final

Data: 19/07/2026

## Resultado desta iteração

| Item | Estado | Implementação |
| --- | --- | --- |
| Live real | Concluído | O embed envia heartbeat a cada 15 segundos. Uma sessão só aparece como ativa se foi vista nos últimos 45 segundos. O feed histórico foi separado e cobre 15 minutos. |
| Benchmark global | Concluído | RPC agrega os últimos 90 dias, ignora tráfego de alto risco e só mostra a média com no mínimo 3 VSLs e 100 plays. Nenhum valor fixo ou dado de outra conta é exposto. |
| Webhook de eventos | Concluído | Entrega assíncrona após a resposta da API, validação HTTPS/DNS, bloqueio de redes privadas, timeout e redirects desativados. |
| Discord | Concluído | URLs oficiais do Discord recebem `embeds`, `allowed_mentions` vazio e campos compatíveis com a API de webhooks. |
| Webhook de alerta | Concluído | URL e chave de ativação próprias; não sobrescreve o webhook geral. |
| Queda de conversão | Concluído | Compara as últimas 24h com as 24h anteriores. Exige 10 plays em ambos os períodos e mede a queda percentual real. |
| Cron | Concluído | `vercel.json` agenda `/api/cron` diariamente às 12:00 UTC (09:00 de Brasília), frequência compatível inclusive com projetos Vercel Hobby. `CRON_SECRET` é obrigatório e aceito apenas via Bearer header. |
| Relatórios por e-mail | Concluído no código | Envio via Resend HTTP, sem dependência adicional. Se não estiver configurado, o inbox informa corretamente que não houve e-mail. |
| Audience Sync fictício | Removido | Não há mais Meta/Google/TikTok/Kwai falsos nem mínimo artificial de 12 contatos. |
| Perfil de público | Concluído | Gera TXT por VSL e segmento com país, dispositivo, sistema, navegador, origem e campanha observados. Não exporta PII e não inventa idade/gênero. |
| Migration duplicada de tráfego | Mantida idempotente | A migration anterior já cria os campos; a migration posterior permanece segura para bancos que perderam a primeira aplicação. |
| Lint | Aprovado | Zero erros. Avisos legados foram reduzidos. |
| TypeScript | Código novo aprovado | A checagem local só fica impedida pelos pacotes PostHog ausentes no `node_modules` local. Eles estão declarados em `package.json` e no lockfile e serão instalados por `npm ci` no CI/Vercel. |

## Configuração obrigatória na Vercel

- `CRON_SECRET`: segredo aleatório longo.
- `RESEND_API_KEY`: chave do Resend para os relatórios operacionais.
- `REPORT_EMAIL_FROM`: remetente verificado, por exemplo `Prisma Player <relatorios@seudominio.com>`.
- As demais variáveis já documentadas em `.env.example`.

O SMTP personalizado no Supabase é usado pelo **Supabase Auth** para confirmação, recuperação e outros e-mails de autenticação. O Next.js não consegue ler essas credenciais; por isso os relatórios usam a API do Resend configurada na Vercel.

## Banco remoto

Aplicar `supabase/migrations/20260719210000_operational_intelligence_hardening.sql` antes de publicar o frontend. Com Supabase CLI conectado:

```bash
supabase db push
```

A integração da Vercel por si só não garante a aplicação de migrations do Supabase. Após aplicar, confirme a existência de `public.video_live_sessions` e das colunas `alert_webhook_enabled`, `alert_webhook_url` e `last_report_sent_at`.

## Limites honestos

- Idade e gênero não existem na telemetria atual. Eles exigem consentimento e integração com checkout/CRM ou relatórios agregados da plataforma de anúncios.
- O TXT é uma análise agregada para orientar configuração de público. Sem e-mail/telefone consentido, ele não é uma lista de Customer Match.
- A validação de webhook bloqueia destinos privados após resolver DNS. Como todo fetch de alto nível, ainda existe risco teórico avançado de DNS rebinding; redirects são bloqueados e o timeout é curto para reduzir a superfície.
- “Conversão” depende do evento real chegar ao `video_events`, seja pelo player, postback ou integração de checkout.
