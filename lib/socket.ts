import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { queueManager } from './queue-manager';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  console.log('Socket.IO server initialized');

  // Broadcast queue updates to all connected clients
  queueManager.on('update', (state) => {
    console.log('Broadcasting queue_update, songs:', state.songs.length);
    io?.emit('queue_update', state);
  });

  queueManager.on('song_added', (song) => {
    console.log('Broadcasting song_added:', song.title);
    io?.emit('song_added', song);
  });

  queueManager.on('song_removed', (song) => {
    console.log('Broadcasting song_removed:', song.id);
    io?.emit('song_removed', song);
  });

  queueManager.on('current_changed', (song) => {
    console.log('Broadcasting current_changed:', song?.title);
    io?.emit('current_changed', song);
  });

  queueManager.on('playback_state', (isPlaying) => {
    console.log('Broadcasting playback_state:', isPlaying);
    io?.emit('playback_state', isPlaying);
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current state to newly connected client
    socket.emit('queue_update', queueManager.getState());
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
