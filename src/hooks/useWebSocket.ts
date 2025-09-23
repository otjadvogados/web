import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { openSnackbar } from 'api/snackbar';

interface WebSocketChecklistPayload {
  caseId: string;
  sessionId: string;
  checklist: {
    id: string;
    items: {
      id: string;
      checked: boolean;
      content: string;
    }[];
    content: string;
  };
}

interface UseWebSocketOptions {
  sessionId?: string;
  caseId?: string;
  onChecklist?: (payload: WebSocketChecklistPayload) => void;
  enabled?: boolean;
}

export function useWebSocket({
  sessionId,
  caseId,
  onChecklist,
  enabled = true
}: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.connected) return;

    try {
      const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
      const socket = io(`${API_URL}/ai`, { 
        transports: ['websocket'],
        autoConnect: true
      });

      socketRef.current = socket;

      // Eventos de conexão
      socket.on('connect', () => {
        console.log('WebSocket conectado:', socket.id);
        isConnectedRef.current = true;
        
        // Entrar no room da sessão após conectar
        if (sessionId || caseId) {
          joinRoom();
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket desconectado:', reason);
        isConnectedRef.current = false;
      });

      socket.on('connect_error', (error) => {
        console.error('Erro de conexão WebSocket:', error);
        openSnackbar({
          open: true,
          message: 'Erro ao conectar com o servidor em tempo real',
          variant: 'alert',
          alert: { color: 'warning' }
        } as any);
      });

      // Evento para receber checklists
      socket.on('ai:checklist', (payload: WebSocketChecklistPayload) => {
        console.log('Checklist recebido via WebSocket:', payload);
        onChecklist?.(payload);
      });

    } catch (error) {
      console.error('Erro ao inicializar WebSocket:', error);
    }
  }, [enabled, sessionId, caseId, onChecklist]);

  // Função para entrar no room
  const joinRoom = useCallback(() => {
    if (!socketRef.current?.connected || (!sessionId && !caseId)) return;

    const payload: { sessionId?: string; caseId?: string } = {};
    if (sessionId) payload.sessionId = sessionId;
    if (caseId) payload.caseId = caseId;

    socketRef.current.emit('ai:join', payload, (response: any) => {
      if (response?.ok) {
        console.log('Entrou no room:', response.rooms);
      } else {
        console.warn('Falha ao entrar no room');
      }
    });
  }, [sessionId, caseId]);

  // Função para sair do room
  const leaveRoom = useCallback(() => {
    if (!socketRef.current?.connected || (!sessionId && !caseId)) return;

    const payload: { sessionId?: string; caseId?: string } = {};
    if (sessionId) payload.sessionId = sessionId;
    if (caseId) payload.caseId = caseId;

    socketRef.current.emit('ai:leave', payload, (response: any) => {
      if (response?.ok) {
        console.log('Saiu do room:', response.rooms);
      }
    });
  }, [sessionId, caseId]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      leaveRoom();
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, [leaveRoom]);

  // Conectar quando os parâmetros mudarem
  useEffect(() => {
    if (enabled && (sessionId || caseId)) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, sessionId, caseId, connect, disconnect]);

  // Re-entrar no room quando sessionId ou caseId mudarem
  useEffect(() => {
    if (socketRef.current?.connected && (sessionId || caseId)) {
      joinRoom();
    }
  }, [sessionId, caseId, joinRoom]);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    joinRoom,
    leaveRoom
  };
}
