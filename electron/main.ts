import { app, BrowserWindow, clipboard, shell } from 'electron';
import { io } from 'socket.io-client';

// NOTE: This requires 'electron' and 'socket.io-client' installed.
// Run with: npx electron electron/main.ts

let mainWindow: BrowserWindow | null = null;
let lastClipboardContent = '';

// Connect to Signaling Server
const socket = io('http://localhost:3001', {
  auth: {
    userId: 'demo-user-123', // Hardcoded for PoC
    deviceId: 'desktop-main',
    deviceType: 'desktop'
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({ 
    width: 1200, 
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Point this to your running React App
  mainWindow.loadURL('http://localhost:3000'); 
}

// --- Universal Clipboard Logic --- //

// 1. Watch System Clipboard
// Polling faster (500ms) for better responsiveness
setInterval(() => {
  const text = clipboard.readText();
  // If text changed AND it wasn't the last thing we received from the socket
  if (text && text !== lastClipboardContent) {
    lastClipboardContent = text;
    console.log('Sending Clipboard Update...');
    socket.emit('clipboard_push', { content: text });
  }
}, 500);

// 2. Receive Clipboard from Mesh
socket.on('clipboard_sync', (data: any) => {
  if (data.content !== lastClipboardContent) {
    console.log('Received Clipboard Sync from', data.sourceDevice);
    lastClipboardContent = data.content;
    clipboard.writeText(data.content);
  }
});

// --- Task Handoff Logic --- //

socket.on('execute_command', (data: any) => {
  if (data.action === 'open_browser') {
    shell.openExternal(data.payload.url);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if ((process as any).platform !== 'darwin') app.quit();
});