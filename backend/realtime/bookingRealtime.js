const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');

let websocketServer = null;
const clients = new Set();

function sanitizeToken(token) {
  if (!token) return null;
  return String(token).replace(/^Bearer\s+/i, '').trim();
}

async function resolveScopeFromSub(sub, db) {
  const mongoDb = await db.getDb();
  const userId = String(sub || '');

  const providerUser = await mongoDb.collection('providers_users').findOne({ _id: userId });
  if (providerUser) {
    const providerIds = new Set();
    if (providerUser.provider_id) {
      providerIds.add(String(providerUser.provider_id));
      const providerDoc = await mongoDb.collection(db.COLLECTIONS.providers).findOne({ _id: providerUser.provider_id });
      if (providerDoc?.id) providerIds.add(String(providerDoc.id));
      if (providerDoc?._id) providerIds.add(String(providerDoc._id));
    }

    return {
      role: 'provider',
      userId,
      providerIds,
    };
  }

  const customer = await mongoDb.collection(db.COLLECTIONS.users).findOne({ _id: userId });
  if (customer) {
    return {
      role: 'customer',
      userId,
      providerIds: new Set(),
    };
  }

  return {
    role: 'unknown',
    userId,
    providerIds: new Set(),
  };
}

function shouldDeliver(scope, payload) {
  if (!scope) return false;

  if (scope.role === 'customer') {
    return Boolean(payload.user_id && payload.user_id === scope.userId);
  }

  if (scope.role === 'provider') {
    return Boolean(payload.provider_id && scope.providerIds?.has(String(payload.provider_id)));
  }

  return false;
}

async function initializeBookingRealtime(httpServer, { db, jwtSecret }) {
  if (websocketServer) return websocketServer;

  websocketServer = new WebSocketServer({
    server: httpServer,
    path: '/ws/bookings',
  });

  websocketServer.on('connection', async (socket, request) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const rawToken = sanitizeToken(url.searchParams.get('token'));
      if (!rawToken) {
        socket.close(4401, 'Unauthorized');
        return;
      }

      const decoded = jwt.verify(rawToken, jwtSecret);
      const scope = await resolveScopeFromSub(decoded?.sub, db);
      if (!scope || scope.role === 'unknown') {
        socket.close(4403, 'Forbidden');
        return;
      }

      socket.scope = scope;
      clients.add(socket);

      socket.send(JSON.stringify({
        type: 'booking.realtime.ready',
        role: scope.role,
        connected_at: new Date().toISOString(),
      }));

      socket.on('close', () => {
        clients.delete(socket);
      });

      socket.on('error', () => {
        clients.delete(socket);
      });
    } catch (error) {
      socket.close(4401, 'Unauthorized');
    }
  });

  return websocketServer;
}

function broadcastBookingUpdated(booking, source = 'system') {
  if (!booking || clients.size === 0) return;

  const payload = {
    type: 'booking.updated',
    booking_id: booking._id || booking.id,
    status: booking.status,
    updated_at: booking.updated_at || new Date().toISOString(),
    provider_id: booking.provider_id || null,
    user_id: booking.user_id || null,
    source,
  };

  const serialized = JSON.stringify(payload);
  for (const socket of clients) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    if (!shouldDeliver(socket.scope, payload)) continue;
    socket.send(serialized);
  }
}

module.exports = {
  initializeBookingRealtime,
  broadcastBookingUpdated,
};
