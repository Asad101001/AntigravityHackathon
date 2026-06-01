import { API_URL } from '../config';
import { getAuthToken } from './authSession';

const listeners = new Set();
let socket = null;
let reconnectTimer = null;
let manuallyClosed = false;

function toWsUrl(token) {
  const trimmedApi = String(API_URL || '').replace(/\/+$/, '');
  const baseHttp = trimmedApi.replace(/\/api$/i, '');
  const wsBase = baseHttp.replace(/^http/i, 'ws');
  return `${wsBase}/ws/bookings?token=${encodeURIComponent(token)}`;
}

function notify(event) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn('[bookingRealtime] listener error:', error?.message || error);
    }
  });
}

function scheduleReconnect() {
  if (manuallyClosed || reconnectTimer || listeners.size === 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(() => {});
  }, 1500);
}

async function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const token = await getAuthToken();
  if (!token) return;

  manuallyClosed = false;
  socket = new WebSocket(toWsUrl(token));

  socket.onmessage = (messageEvent) => {
    try {
      const payload = JSON.parse(messageEvent.data);
      if (payload?.type === 'booking.updated') {
        notify(payload);
      }
    } catch {
      // Ignore malformed payloads
    }
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    scheduleReconnect();
  };
}

function disconnect() {
  manuallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function subscribeBookingRealtime(listener) {
  listeners.add(listener);
  connect().catch(() => {});

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      disconnect();
    }
  };
}
