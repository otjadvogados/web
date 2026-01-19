# Sistema de Sessão com WebSocket

## Resumo das Mudanças

O sistema de controle de tempo de sessão foi migrado do frontend para o servidor via WebSocket. O frontend agora recebe atualizações do tempo restante diretamente do servidor, garantindo sincronização precisa e remoção do cálculo local.

## Mudanças no Frontend

### Arquivo: `src/components/SessionTimer.tsx`

**Mudanças principais:**
1. ✅ **Removido cálculo local de tempo**: O `setInterval` que decrementava o tempo localmente foi removido
2. ✅ **Integração com WebSocket**: O componente agora escuta eventos `session:time` do servidor via WebSocket
3. ✅ **Tempo de sessão aumentado para 2 horas**: O cálculo de porcentagem agora usa 2 horas (7200 segundos) como base fixa
4. ✅ **Notificações mantidas**: As notificações de 10 minutos e 2 minutos antes do término continuam funcionando

**Funcionamento:**
- O componente se conecta ao WebSocket usando `getRealtimeSocket()` da API realtime
- Escuta eventos `session:time` do servidor
- Aceita dois formatos de dados:
  - `{ hours: number, minutes: number, seconds: number }` - Tempo restante direto
  - `{ expiresAt: number }` - Timestamp Unix de expiração (calculado no frontend)

## Requisitos do Backend

Para que o sistema funcione corretamente, o backend precisa:

### 1. Aumentar tempo de sessão para 2 horas

A configuração de expiração do token JWT/sessão deve ser alterada para **2 horas (7200 segundos)**.

### 2. Implementar evento WebSocket `session:time`

O servidor deve enviar eventos periódicos via WebSocket com o tempo restante da sessão.

**Especificação do evento:**
- **Nome do evento**: `session:time`
- **Frequência recomendada**: A cada 1 segundo (ou conforme necessário)
- **Formato dos dados** (opção 1 - recomendado):
```json
{
  "event": "session:time",
  "data": {
    "hours": 1,
    "minutes": 45,
    "seconds": 30
  }
}
```

- **Formato dos dados** (opção 2 - alternativa):
```json
{
  "event": "session:time",
  "data": {
    "expiresAt": 1234567890123
  }
}
```
  Onde `expiresAt` é um timestamp Unix em milissegundos.

**Exemplo de implementação (pseudocódigo):**

```javascript
// Após autenticação bem-sucedida ou quando cliente conecta
setInterval(() => {
  const sessionExpiresAt = getSessionExpirationTime(userId);
  const now = Date.now();
  const remainingMs = Math.max(0, sessionExpiresAt - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  
  const timeRemaining = {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
  
  // Envia para o cliente conectado
  socket.emit('session:time', timeRemaining);
}, 1000); // A cada 1 segundo
```

### 3. Enviar evento quando sessão expirar

Quando a sessão expirar, o servidor deve enviar um evento com tempo zero:
```json
{
  "event": "session:time",
  "data": {
    "hours": 0,
    "minutes": 0,
    "seconds": 0
  }
}
```

O frontend detectará isso e redirecionará automaticamente para `/login`.

## Benefícios

✅ **Sincronização precisa**: O tempo é controlado pelo servidor, evitando dessincronização
✅ **Segurança**: Não é possível manipular o tempo no cliente
✅ **Consistência**: Todos os clientes recebem o mesmo tempo do servidor
✅ **UX mantida**: Notificações e exibição visual continuam funcionando normalmente

## Compatibilidade

O código frontend foi implementado de forma compatível com:
- WebSocket existente via `src/api/realtime.ts`
- Sistema de autenticação JWT existente
- Notificações via snackbar existentes

## Notas Técnicas

- O cálculo de porcentagem de progresso usa 2 horas (7200 segundos) como base fixa
- As notificações são disparadas quando o tempo restante atinge:
  - 10 minutos (600 segundos): Alerta amarelo
  - 2 minutos (120 segundos): Alerta vermelho crítico
- O componente mantém o estado inicial de `expiresIn` até receber atualizações do WebSocket