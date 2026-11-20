import { io } from 'socket.io-client';
import { getAccessToken } from './api.js';

let socket = null;

/**
 * One socket per browser tab. The access token is attached at connect time;
 * BoardPage refreshes it and reconnects if the handshake is rejected.
 */
export function getBoardSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token: getAccessToken() },
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 700,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectBoardSocket() {
  const instance = getBoardSocket();
  instance.auth = { token: getAccessToken() };
  if (!instance.connected) instance.connect();
  return instance;
}

export function disconnectBoardSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
