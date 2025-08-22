# Centralização do Redirecionamento para Login

## Resumo das Melhorias

Implementamos um sistema centralizado de redirecionamento para login no interceptor do axios, eliminando a necessidade de tratar 401 em cada tela individualmente.

## Mudanças Implementadas

### 1. Correção da Variável de Ambiente

**Arquivo:** `src/utils/axios.ts`

- **Antes:** `VITE_API_URL`
- **Depois:** `VITE_APP_API_URL`

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:22211',
  withCredentials: true
});
```

### 2. Interceptor Inteligente para 401

**Arquivo:** `src/utils/axios.ts`

O interceptor agora:

- **Ignora endpoints públicos** que não devem tentar refresh nem redirecionar:
  - `/auth/verify` - magic links de verificação
  - `/auth/unlock` - desbloqueio de conta
  - `/auth/approve-device` - aprovação de dispositivo
  - `/auth/reject-device` - rejeição de dispositivo
  - `/auth/report-login` - reportar login suspeito
  - `/auth/forgot-password` - recuperação de senha
  - `/auth/reset-password` - redefinição de senha
  - `/auth/token/check` - verificação de token
  - `/auth/test-email-config` - teste de configuração
  - `/auth/clear-email-dedupe` - limpeza de duplicatas

- **Detecta mensagens específicas** que exigem re-login imediato:
  - "sua sessão foi encerrada por um novo login"
  - "session was closed by a new login"
  - "token_version"
  - "revoked"

- **Lógica inteligente de refresh:**
  - **Só tenta refresh** se a requisição original tinha `Authorization: Bearer`
  - **Endpoints públicos** → propaga erro sem tentar refresh
  - **Sessão invalidada** → força re-login imediato
  - **Token expirado** → tenta refresh, se falhar redireciona

### 3. Melhoria no Tratamento de Erros

**Arquivo:** `src/contexts/JWTContext.tsx`

- Removido redirecionamento duplicado no `useEffect` de inicialização
- Mantido apenas a limpeza do estado local
- **Melhorado tratamento de erros** para extrair mensagens da API:
  - `login()` - captura `error.response.data.message` da API
  - `resetPassword()` - captura `error.response.data.message` da API

### 4. Melhoria nos Componentes de Autenticação

**Arquivos:** 
- `src/sections/account/PersonalForm.tsx`
- `src/sections/auth/jwt/AuthResetPassword.tsx`
- `src/sections/account/ChangePasswordForm.tsx`

- Removido redirecionamento manual para login
- Mantido apenas log de erro
- **Ajustado para usar `err.message`** em vez de `err.response.data.message`

## Como Funciona

### Cenário 1: Magic Link Inválido (/auth/verify)
1. Usuário acessa link de verificação expirado/inválido
2. Backend retorna 401 com mensagem "Token inválido/expirado"
3. Interceptor identifica como endpoint público → propaga erro
4. Componente exibe mensagem específica sem redirecionamento

### Cenário 2: Login com Credenciais Inválidas
1. Usuário tenta fazer login com credenciais incorretas
2. Backend retorna 401 com mensagem "Credenciais inválidas"
3. Interceptor permite que o erro passe (não redireciona)
4. Componente exibe a mensagem "Credenciais inválidas" para o usuário

### Cenário 3: Sessão Invalidada por Novo Login
1. Backend retorna 401 com mensagem "Sua sessão foi encerrada por um novo login"
2. Interceptor detecta a mensagem
3. Força re-login imediato (sem tentar refresh)
4. Usuário é redirecionado para `/login`

### Cenário 4: Token Expirado (Refresh Válido)
1. Requisição autenticada retorna 401 genérico
2. Interceptor verifica que tinha `Authorization: Bearer`
3. Tenta `/auth/refresh`
4. Se sucesso: retenta a requisição original
5. Se falha: força re-login

### Cenário 5: Requisição Pública sem Auth
1. Endpoint público retorna 401
2. Interceptor verifica que NÃO tinha `Authorization: Bearer`
3. Propaga erro sem tentar refresh
4. Componente trata o erro normalmente

## Benefícios

✅ **Centralização:** Toda lógica de redirecionamento em um lugar
✅ **Consistência:** Comportamento uniforme em toda aplicação
✅ **Manutenibilidade:** Menos código duplicado
✅ **UX:** Redirecionamento automático sem intervenção manual
✅ **Magic Links:** Endpoints públicos funcionam corretamente sem interferência
✅ **Inteligência:** Só tenta refresh quando realmente necessário

## Configuração de Ambiente

Crie um arquivo `.env` com:

```env
VITE_APP_API_URL=http://localhost:22211
VITE_APP_ACCEPT_LANGUAGE=pt-BR
VITE_APP_BASE_NAME=/
VITE_APP_VERSION=1.0.0
```

## Backend Compatível

O sistema funciona com backends que:
- Retornam 401 para tokens inválidos/expirados
- Incluem mensagens descritivas no corpo da resposta
- Suportam endpoint `/auth/refresh` para renovação de tokens
