import { useEffect, useState, useCallback, useRef } from 'react';
// @ts-ignore - Importing from CDN defined in importmap
import { io, Socket } from 'socket.io-client';
import { DeviceInfo, FileTransfer, NotificationItem, MediaState } from '../types';

const SIGNALING_URL = 'http://localhost:3001';

export const useDeviceMesh = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineDevices, setOnlineDevices] = useState<DeviceInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [lastClipboardEvent, setLastClipboardEvent] = useState<{ content: string; source: string; time: number } | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mediaStates, setMediaStates] = useState<Map<string, MediaState>>(new Map());
  
  // Persist device ID across reloads if possible, or generate new one
  const myDeviceId = useRef('web-dashboard-' + Math.random().toString(36).substr(2, 5));

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => !prev);
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setConnectionStatus('connected');
      setOnlineDevices([
        { deviceId: 'demo-desktop', deviceType: 'desktop', joinedAt: Date.now(), isCurrent: false },
        { deviceId: 'demo-mobile', deviceType: 'mobile', joinedAt: Date.now(), isCurrent: false },
        { deviceId: 'demo-tablet', deviceType: 'web', joinedAt: Date.now(), isCurrent: false },
        { deviceId: myDeviceId.current, deviceType: 'web', joinedAt: Date.now(), isCurrent: true },
      ]);
      return;
    }

    // Only attempt to connect if signaling server is likely available (dev mode)
    // In production, this would be a real URL
    try {
      setOnlineDevices([]); // Clear demo devices
      const newSocket = io(SIGNALING_URL, {
        auth: {
          userId: 'demo-user-123',
          deviceId: myDeviceId.current,
          deviceType: 'web'
        },
        reconnectionAttempts: 3,
        timeout: 2000
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to Device Mesh');
        setConnectionStatus('connected');
      });
      
      newSocket.on('disconnect', () => {
        setConnectionStatus('disconnected');
        setOnlineDevices([]);
      });

      // Listen for the updated list of peers
      newSocket.on('device_list_update', (devices: DeviceInfo[]) => {
        // Mark which device is "me"
        const devicesWithSelf = devices.map(d => ({
            ...d,
            isCurrent: d.deviceId === myDeviceId.current
        }));
        setOnlineDevices(devicesWithSelf);
      });

      newSocket.on('execute_command', (data: any) => {
        // Web clients can handle URL opens too
        if (data.action === 'open_browser') {
          console.log("Device Mesh Command: Opening URL", data.payload.url);
          window.open(data.payload.url, '_blank');
        }
      });

      // Listen for Universal Clipboard events
      newSocket.on('clipboard_sync', async (data: { content: string, sourceDevice: string }) => {
        console.log('📋 Clipboard Sync received from:', data.sourceDevice);
        
        try {
          // Attempt to write to browser clipboard
          // Note: This requires the document to be focused in many browsers
          await navigator.clipboard.writeText(data.content);
          
          setLastClipboardEvent({
            content: data.content,
            source: data.sourceDevice,
            time: Date.now()
          });
        } catch (err) {
          console.warn("Failed to write to clipboard (browser permission blocked):", err);
          // Still notify the UI that data arrived, even if write failed
          setLastClipboardEvent({
            content: data.content,
            source: data.sourceDevice,
            time: Date.now()
          });
        }
      });

      // Listen for file transfers
      newSocket.on('file_transfer', (transfer: FileTransfer) => {
        console.log('📁 File transfer received:', transfer.fileName);
        setFileTransfers(prev => [transfer, ...prev]);
        // Auto-cleanup after 30 seconds
        setTimeout(() => {
          setFileTransfers(prev => prev.filter(f => f.id !== transfer.id));
        }, 30000);
      });

      // Listen for notifications from mobile
      newSocket.on('notification_sync', (notification: NotificationItem) => {
        console.log('🔔 Notification received:', notification.title);
        setNotifications(prev => [notification, ...prev]);
      });

      // Listen for media control updates
      newSocket.on('media_control', (media: MediaState) => {
        console.log('🎵 Media state update:', media);
        setMediaStates(prev => new Map(prev).set(media.device, media));
      });

      setSocket(newSocket);

      return () => { newSocket.close(); };
    } catch (e) {
      console.warn("Device Mesh not available (Signaling server likely offline)");
    }
  }, [isDemoMode]);

  const sendHandoff = useCallback((target: 'desktop' | 'mobile' | 'all', action: string, payload: any) => {
    if (isDemoMode) {
      console.log(`[DEMO MODE] Sending ${action} to ${target}`, payload);
      return true;
    }

    if (socket && connectionStatus === 'connected') {
      socket.emit('command_handoff', { targetDeviceId: target, action, payload });
      return true;
    }
    return false;
  }, [socket, connectionStatus, isDemoMode]);

  const sendFileTransfer = useCallback((targetDeviceId: string, fileName: string, base64Data: string) => {
    if (isDemoMode) {
      console.log(`[DEMO MODE] Sending file ${fileName} to ${targetDeviceId}`);
      return true;
    }
    if (socket && connectionStatus === 'connected') {
      socket.emit('file_transfer', { targetDeviceId, fileName, base64Data });
      return true;
    }
    return false;
  }, [socket, connectionStatus, isDemoMode]);

  const sendMediaCommand = useCallback((deviceId: string, command: 'play' | 'pause' | 'next' | 'prev') => {
    if (isDemoMode) {
      console.log(`[DEMO MODE] Media command ${command} to ${deviceId}`);
      return true;
    }
    if (socket && connectionStatus === 'connected') {
      socket.emit('media_command', { deviceId, command });
      return true;
    }
    return false;
  }, [socket, connectionStatus, isDemoMode]);

  const sendQuickReply = useCallback((notificationId: string, reply: string) => {
    if (isDemoMode) {
      console.log(`[DEMO MODE] Quick reply to notification:`, reply);
      return true;
    }
    if (socket && connectionStatus === 'connected') {
      socket.emit('notification_reply', { notificationId, reply });
      return true;
    }
    return false;
  }, [socket, connectionStatus, isDemoMode]);

  return { 
    isConnected: connectionStatus === 'connected', 
    onlineDevices, 
    sendHandoff, 
    myDeviceId: myDeviceId.current,
    lastClipboardEvent,
    toggleDemoMode,
    isDemoMode,
    fileTransfers,
    notifications,
    mediaStates,
    sendFileTransfer,
    sendMediaCommand,
    sendQuickReply
  };
};