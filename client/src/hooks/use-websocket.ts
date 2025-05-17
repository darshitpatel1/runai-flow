import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoReconnect?: boolean;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectAttempt = useRef<number>(0);
  const connectRef = useRef<(() => void) | null>(null);
  
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    autoReconnect = true
  } = options;
  
  // Helper to get a valid WebSocket URL
  const getWebSocketUrl = useCallback((): string => {
    // Use secure protocol if page is loaded over HTTPS
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // In Replit environment, we need to use the specific URL format
    const url = window.location.href;
    const replitMatch = url.match(/https?:\/\/([^/]+)/);
    
    if (replitMatch && replitMatch[1]) {
      // We are in a Replit environment, use the domain directly
      console.log('Using Replit domain for WebSocket connection:', replitMatch[1]);
      return `${protocol}//${replitMatch[1]}/ws`;
    } 
    
    // Fallback - use the best host we can find
    const host = window.location.host || window.location.hostname || 'localhost';
    console.log('Using host for WebSocket connection:', host);
    return `${protocol}//${host}/ws`;
  }, []);
  
  // Attempt to reconnect - don't rely on connect being fully defined yet
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= reconnectAttempts) {
      console.log(`Maximum reconnection attempts (${reconnectAttempts}) reached`);
      return;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})...`);
      if (connectRef.current) {
        connectRef.current();
      }
    }, reconnectInterval);
  }, [reconnectAttempts, reconnectInterval]);
  
  // Create WebSocket connection
  const connect = useCallback(() => {
    // Don't try to reconnect too quickly to avoid console spam
    const now = Date.now();
    if (now - lastConnectAttempt.current < 5000) {
      console.log('Skipping reconnect attempt, too soon');
      return;
    }
    lastConnectAttempt.current = now;
    
    // Close existing connection if any
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        // Ignore any errors during closure
      }
    }
    
    try {
      // Get a valid WebSocket URL
      const wsUrl = getWebSocketUrl();
      
      // Create the new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Set up event handlers
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Authenticate the connection by sending user info
        if (user) {
          user.getIdToken().then(token => {
            socket.send(JSON.stringify({
              type: 'auth',
              token, // Use the proper Firebase ID token
              userId: user.uid
            }));
          }).catch(error => {
            console.error('Error getting auth token:', error);
          });
        }
        
        if (onOpen) onOpen();
      };
      
      socket.onclose = (event: CloseEvent) => {
        // Only log clean closures, not connection errors which are too noisy
        if (event.wasClean) {
          console.log('WebSocket connection closed cleanly');
        }
        
        setIsConnected(false);
        
        if (onClose) onClose();
        
        // Use a more aggressive reconnect strategy
        if (autoReconnect) {
          // Even if it was clean, still try to reconnect
          attemptReconnect();
        }
      };
      
      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (event: Event) => {
        // Don't log every error to console - it's too noisy
        if (onError) onError(event);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, getWebSocketUrl, onOpen, onClose, onMessage, onError, autoReconnect, attemptReconnect]);
  
  // Save connect function in ref so we can use it in reconnect
  connectRef.current = connect;
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Disconnect from the WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);
  
  // Connect on component mount and disconnect on unmount
  useEffect(() => {
    if (user) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
}