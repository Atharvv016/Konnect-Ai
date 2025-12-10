import { Server, Socket } from 'socket.io';
import http from 'http';

// NOTE: This requires 'socket.io' and 'ts-node' to run.
// Run with: npx ts-node backend/signaling-server.ts

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" } // Allow connections from Localhost/Electron
});

interface DeviceHandshake {
  userId: string;
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'web';
}

interface DeviceInfo {
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  socketId: string;
  joinedAt: number;
}

// Store connected devices per user: userId -> DeviceInfo[]
const userDevices: Record<string, DeviceInfo[]> = {};

io.on('connection', (socket: Socket) => {
  const { userId, deviceId, deviceType } = socket.handshake.auth as DeviceHandshake;

  if (!userId) {
    socket.disconnect();
    return;
  }

  // 1. Join the User's "Mesh" (Room)
  socket.join(`user:${userId}`);
  
  // 2. Register Device
  if (!userDevices[userId]) {
    userDevices[userId] = [];
  }
  
  // Remove any existing entry with same deviceId to prevent duplicates on reconnect
  userDevices[userId] = userDevices[userId].filter(d => d.deviceId !== deviceId);
  
  const newDevice: DeviceInfo = {
    deviceId,
    deviceType,
    socketId: socket.id,
    joinedAt: Date.now()
  };
  
  userDevices[userId].push(newDevice);

  console.log(`🔌 Device Connected: ${deviceType} (${deviceId}) for User ${userId}`);
  console.log(`Current Mesh Size for ${userId}: ${userDevices[userId].length}`);

  // 3. Broadcast Updated Device List to ALL devices in the mesh (including the new one)
  // We sanitize the list to remove socketId before sending to client if preferred, 
  // but keeping it internal here.
  const publicList = userDevices[userId].map(({ socketId, ...rest }) => rest);
  io.to(`user:${userId}`).emit('device_list_update', publicList);

  // 4. Handle Universal Clipboard
  socket.on('clipboard_push', (data: { content: string }) => {
    // Broadcast to all OTHER devices in the mesh
    socket.to(`user:${userId}`).emit('clipboard_sync', {
      sourceDevice: deviceId,
      content: data.content
    });
  });

  // 5. Handle Task Handoff (e.g., "Open Browser")
  socket.on('command_handoff', (data: { targetDeviceId: string, action: string, payload: any }) => {
    if (data.targetDeviceId === 'all') {
      socket.to(`user:${userId}`).emit('execute_command', data);
    } else {
      // Find the specific socket ID for the target device
      const target = userDevices[userId]?.find(d => d.deviceId === data.targetDeviceId);
      if (target) {
        io.to(target.socketId).emit('execute_command', data);
      } else {
        // Fallback to broadcast if specific tracking fails or for 'desktop' generic alias
        if (data.targetDeviceId === 'desktop' || data.targetDeviceId === 'mobile') {
             // Filter by type
             userDevices[userId].filter(d => d.deviceType === data.targetDeviceId).forEach(d => {
                 if (d.socketId !== socket.id) {
                     io.to(d.socketId).emit('execute_command', data);
                 }
             });
        }
      }
    }
    console.log(`🚀 Handoff command sent to ${data.targetDeviceId}: ${data.action}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Device Disconnected: ${deviceId}`);
    
    if (userDevices[userId]) {
      userDevices[userId] = userDevices[userId].filter(d => d.deviceId !== deviceId);
      
      // Broadcast updated list
      const publicList = userDevices[userId].map(({ socketId, ...rest }) => rest);
      io.to(`user:${userId}`).emit('device_list_update', publicList);
    }
  });
});

server.listen(3001, () => {
  console.log('🌐 Konnect-Ai Signaling Server running on port 3001');
});