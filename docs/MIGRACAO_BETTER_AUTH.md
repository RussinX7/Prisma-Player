# 🔐 Migração do Supabase Auth para Better Auth

## Status da Migração

✅ **Fase 1 - Configuração Inicial** (Concluída)
- [x] Instalação do `better-auth` e `@better-auth/infra`
- [x] Criação do arquivo `src/lib/auth.ts` com configuração Better Auth
- [x] Criação do arquivo `src/lib/auth-client.ts` para client-side
- [x] Criação da route API `/api/auth/[...all]`
- [x] Atualização do `.env.example` com novas variáveis

⏳ **Próximas Fases**
- [ ] Fase 2 - Migrations de Database
- [ ] Fase 3 - Reescrita de Auth Server
- [ ] Fase 4 - Atualização do Proxy
- [ ] Fase 5 - Reescrita de Login/Signup
- [ ] Fase 6 - Limpeza de Código Antigo
- [ ] Fase 7 - Testes
- [ ] Fase 8 - Deploy

---

## Variáveis de Ambiente Necessárias

### Para .env.local (desenvolvimento)

```bash
# Better Auth
BETTER_AUTH_SECRET=4N8FsvkK+TwZnWHA3TUHYD2bq0bsYyukE/mu8cg/1XE=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_API_KEY=ba_lod1zw2bebn316k9o2l1ris3hhfwg4hy

# Database (PostgreSQL do Supabase)
# Pegue a connection string em: Supabase Dashboard → Project Settings → Database → Connection Pooling
# Use o modo "Transaction" com porta 6543
DATABASE_URL=postgresql://postgres.jghtmqzgyyonelfmjdxb:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ IMPORTANTE:** Você precisa substituir `[YOUR_PASSWORD]` pela senha real do banco Supabase.

### Para Vercel (produção)

Adicione estas variáveis no painel da Vercel → Environment Variables:

```bash
BETTER_AUTH_SECRET=<gere um novo com: openssl rand -base64 32>
BETTER_AUTH_URL=https://prisma-player.vercel.app
BETTER_AUTH_API_KEY=ba_lod1zw2bebn316k9o2l1ris3hhfwg4hy
DATABASE_URL=<sua connection string do Supabase com senha>
```

---

## Passo a Passo da Migração

### ✅ Passo 1: Obter DATABASE_URL do Supabase

**Opção 1: Via Dashboard "Connect" (RECOMENDADO)**

1. No dashboard do Supabase, clique no botão **"Connect"** (canto superior direito)
2. Na aba **"ORM"** ou **"App Frameworks"**, você verá a connection string
3. Selecione **"Session pooler"** (modo Transaction)
4. Copie a string completa que será algo como:
   ```
   postgresql://postgres.jghtmqzgyyonelfmjdxb:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**Opção 2: Via Project Settings**

1. Acesse: **Project Settings** → **Database** → **Connection string**
2. Na seção **Connection string**, escolha:
   - **URI** (não JDBC)
   - **Use connection pooling** ativado
   - Modo: **Session** (não Transaction)
3. Copie a string
4. A senha não vem na string - você precisa substituir `[YOUR-PASSWORD]` pela senha do banco

**Opção 3: Direct Connection (para desenvolvimento local)**

Se as opções acima não funcionarem, use Direct Connection:

1. **Project Settings** → **Database** 
2. Role até **Connection Info**
3. Copie os dados:
   - Host: `db.jghtmqzgyyonelfmjdxb.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (sua senha - se não lembra, clique em "Reset Database Password")

4. Monte a string manualmente:
   ```
   postgresql://postgres:[SUA_SENHA]@db.jghtmqzgyyonelfmjdxb.supabase.co:5432/postgres
   ```

**⚠️ IMPORTANTE:** Substitua `[SUA_SENHA]` pela senha REAL do banco.

5. Cole no `.env.local`

### ⏳ Passo 2: Criar Tabelas do Better Auth no Supabase

**Opção 1: Via Supabase SQL Editor (RECOMENDADO)**

1. Acesse: https://supabase.com/dashboard/project/jghtmqzgyyonelfmjdxb/sql/new
2. Copie o conteúdo do arquivo `scripts/apply-better-auth-migration.sql`
3. Cole no SQL Editor
4. Clique em **"Run"**
5. Verifique se aparecem 4 tabelas criadas: `user`, `session`, `account`, `verification`

**Opção 2: Via Supabase CLI**

```powershell
# Aplicar a migration
npx supabase db push --db-url "postgresql://postgres:brVmdNusjxC9ke0m@db.jghtmqzgyyonelfmjdxb.supabase.co:5432/postgres"
```

**Verificar se as tabelas foram criadas:**

No SQL Editor, execute:
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('user', 'session', 'account', 'verification');
```

Deve retornar 4 linhas.

### ⏳ Passo 3: Reescrever Auth Server

O arquivo `src/lib/auth/server.ts` precisa ser reescrito para usar Better Auth em vez de Supabase Auth.

**Antes (Supabase):**
```typescript
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? String(data.claims.sub) : null;
}
```

**Depois (Better Auth):**
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentUserId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user?.id ?? null;
}
```

### ⏳ Passo 4: Atualizar Proxy (Middleware)

O `proxy.ts` precisa ser atualizado para usar Better Auth.

**Antes (Supabase):**
```typescript
import { updateSession } from "@/lib/supabase/proxy";
export async function proxy(request: NextRequest) {
  return updateSession(request);
}
```

**Depois (Better Auth):**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const protectedRoute = request.nextUrl.pathname.startsWith("/dashboard") 
    || request.nextUrl.pathname.startsWith("/studio");
  const authRoute = request.nextUrl.pathname === "/login" 
    || request.nextUrl.pathname === "/signup";

  if (protectedRoute && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (authRoute && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/videos";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
```

### ⏳ Passo 5: Reescrever Login/Signup

**Login (`src/app/login/page.tsx`):**
```typescript
import { authClient } from "@/lib/auth-client";

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const { data, error } = await authClient.signIn.email({
    email: email.trim(),
    password,
  });
  
  if (error) {
    setError(error.message);
    return;
  }
  
  router.push("/dashboard/videos");
}
```

**Signup (`src/app/signup/page.tsx`):**
```typescript
import { authClient } from "@/lib/auth-client";

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const { data, error } = await authClient.signUp.email({
    email: email.trim(),
    password,
    name: name.trim(),
  });
  
  if (error) {
    setError(error.message);
    return;
  }
  
  router.push("/welcome");
}
```

### ⏳ Passo 6: Remover Callback OAuth

O Better Auth gerencia callbacks OAuth automaticamente. **Você pode deletar** `src/app/auth/callback/route.ts`.

---

## Diferenças Importantes

### Supabase Auth vs Better Auth

| Recurso | Supabase Auth | Better Auth |
|---|---|---|
| **Database** | Tabelas auth.* isoladas | Tabelas no schema public |
| **Session** | JWT + cookies | Cookies + database session |
| **OAuth** | Callback manual | Callback automático |
| **Email verification** | Obrigatório por padrão | Opcional |
| **User metadata** | app_metadata + user_metadata | campos diretos na tabela user |
| **Admin client** | Service role key | Não necessário (RLS desabilitado) |

### Estrutura de Dados

**User table (Better Auth):**
```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  emailVerified BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image TEXT,
  -- Campos customizados
  full_name TEXT
);
```

**Session table (Better Auth):**
```sql
CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  expiresAt TIMESTAMP NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Migração de Dados de Usuários (Opcional)

Se você já tem usuários no Supabase Auth e quer migrá-los:

1. Exporte usuários do Supabase:
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  created_at,
  confirmed_at IS NOT NULL as emailVerified
FROM auth.users;
```

2. Use o Better Auth migration tool ou importe manualmente na tabela `user`

**⚠️ Senhas não podem ser migradas** (são hashed com algoritmo diferente). Usuários precisarão fazer "Esqueci minha senha" na primeira vez.

---

## Checklist de Deploy

Antes de fazer deploy na Vercel:

- [ ] `DATABASE_URL` configurada corretamente
- [ ] `BETTER_AUTH_SECRET` gerado com alta entropia (32+ bytes)
- [ ] `BETTER_AUTH_URL` apontando para o domínio de produção
- [ ] `BETTER_AUTH_API_KEY` configurado (o que você recebeu: `ba_lod1zw2bebn316k9o2l1ris3hhfwg4hy`)
- [ ] Migrations do Better Auth aplicadas no banco de produção
- [ ] OAuth providers (Google/Apple) reconfigrados com novas redirect URLs:
  - **Antes:** `https://prisma-player.vercel.app/auth/callback`
  - **Depois:** `https://prisma-player.vercel.app/api/auth/callback/google` (ou `/apple`)
- [ ] Testar login/signup/logout em staging antes de produção

---

## Acessar Better Auth Dashboard

Depois do deploy, acesse:

```
https://prisma-player.vercel.app/api/auth
```

Você verá o dashboard da Better Auth com:
- ✅ Status de conexão
- 📊 Analytics de usuários
- 🔑 Gerenciamento de sessões
- ⚙️ Configurações

---

## Troubleshooting

### Erro: "DATABASE_URL is not configured"

**Causa:** Variável de ambiente não foi definida.

**Solução:** 
1. Pegue a connection string no Supabase Dashboard
2. Use **Connection Pooling** (porta 6543), não Direct Connection
3. Adicione no `.env.local`

### Erro: "relation \"user\" does not exist"

**Causa:** Migrations do Better Auth não foram aplicadas.

**Solução:**
```powershell
npx @better-auth/cli migrate
```

### Erro: "Failed to connect to database"

**Causa:** Password incorreto ou pooler indisponível.

**Solução:**
1. Verifique a senha no Supabase Dashboard → Database → Database Password
2. Confirme que está usando a porta 6543 (pooler), não 5432

### OAuth redirect não funciona

**Causa:** Redirect URLs dos providers não foram atualizadas.

**Solução:**
- **Google Console:** Atualize para `https://prisma-player.vercel.app/api/auth/callback/google`
- **Apple Developer:** Atualize para `https://prisma-player.vercel.app/api/auth/callback/apple`

---

## Próximos Passos

1. **Obtenha o DATABASE_URL** do Supabase (Connection Pooling, Transaction mode)
2. **Cole no `.env.local`** substituindo `[YOUR_PASSWORD]`
3. **Rode as migrations:** `npx @better-auth/cli migrate`
4. **Me avise quando concluir** para continuarmos com a reescrita dos arquivos

Tem alguma dúvida sobre como pegar a DATABASE_URL do Supabase?
