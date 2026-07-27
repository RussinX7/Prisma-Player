# 🚀 Quick Start - Better Auth

## ✅ O que já está feito:

- [x] Better Auth instalado e configurado
- [x] `pg` adicionado como dependência
- [x] Commit e push para GitHub
- [x] Scripts de migration criados

---

## 🎯 Próximos Passos (5 minutos):

### 1️⃣ Criar Tabelas no Supabase

**Acesse:** https://supabase.com/dashboard/project/jghtmqzgyyonelfmjdxb/sql/new

**Cole este SQL e clique em "Run":**

```sql
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    name TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    image TEXT,
    full_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"("userId");

-- Tabela de accounts (OAuth)
CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("providerId", "accountId")
);

CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"("userId");

-- Tabela de verificação
CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);

-- Trigger para auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "account"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON "verification"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Verificar:** Execute para confirmar:
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('user', 'session', 'account', 'verification');
```

Deve mostrar 4 tabelas.

---

### 2️⃣ Configurar Variáveis na Vercel

**Acesse:** https://vercel.com/russinx7s-projects/prisma-player/settings/environment-variables

**Adicione estas variáveis (todas para Production, Preview e Development):**

```
BETTER_AUTH_SECRET=<gere um novo: openssl rand -base64 32>
BETTER_AUTH_URL=https://prisma-player.vercel.app
BETTER_AUTH_API_KEY=ba_lod1zw2bebn316k9o2l1ris3hhfwg4hy
DATABASE_URL=postgresql://postgres:brVmdNusjxC9ke0m@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**⚠️ IMPORTANTE:** Gere um NOVO `BETTER_AUTH_SECRET` para produção (diferente do local):

```powershell
# PowerShell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [System.Convert]::ToBase64String($bytes)
```

---

### 3️⃣ Fazer Redeploy na Vercel

Depois de configurar as variáveis:

1. Vá em: https://vercel.com/russinx7s-projects/prisma-player
2. Clique em **"Deployments"**
3. No último deployment (que falhou), clique nos **3 pontinhos** → **"Redeploy"**

Ou apenas faça um commit qualquer que ele redeploy automaticamente.

---

### 4️⃣ Testar Better Auth Dashboard

Após o deploy bem-sucedido, acesse:

```
https://prisma-player.vercel.app/api/auth
```

Você deverá ver o dashboard do Better Auth! 🎉

---

## 📊 Status Atual

- ✅ **Código:** 100% pronto
- ✅ **Dependências:** Instaladas (`pg` incluído)
- ⏳ **Tabelas:** Precisa executar o SQL no Supabase
- ⏳ **Variáveis Vercel:** Precisa configurar
- ⏳ **Deploy:** Aguardando configuração

---

## 🆘 Troubleshooting

### Deploy ainda falha com "Module not found: pg"

**Causa:** Cache do build da Vercel.

**Solução:** 
1. Vercel Dashboard → Settings → General
2. Role até "Build & Development Settings"
3. Clique em **"Clear Build Cache"**
4. Faça redeploy

### Erro: "DATABASE_URL is not configured"

**Causa:** Variável não foi definida na Vercel.

**Solução:**
1. Confirme que adicionou `DATABASE_URL` nas Environment Variables
2. Redeploy após adicionar

### Better Auth Dashboard retorna 404

**Causa:** Deploy ainda não concluiu ou falhou.

**Solução:**
1. Verifique o status do deployment na Vercel
2. Veja os logs para identificar erro

---

## ✨ Próximos Passos Depois do Deploy

Depois que tudo estiver funcionando:

1. ✅ Reescrever `src/lib/auth/server.ts` para usar Better Auth
2. ✅ Atualizar `proxy.ts` para autenticação Better Auth
3. ✅ Reescrever páginas de login/signup
4. ✅ Testar autenticação end-to-end
5. ✅ Migrar usuários existentes (opcional)

---

**Me avise quando:**
- ✅ Criar as tabelas no Supabase (Passo 1)
- ✅ Configurar as variáveis na Vercel (Passo 2)
- ✅ O deploy estiver verde

Aí eu continuo com a reescrita dos arquivos de auth! 🚀
