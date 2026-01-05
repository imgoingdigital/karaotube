import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { queueManager } from './lib/queue-manager';

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

console.log('Setting up queue manager listeners...');

// Broadcast queue updates to all connected clients
queueManager.on('update', (state) => {
  console.log('Broadcasting queue_update, songs:', state.songs.length);
  io.emit('queue_update', state);
});

queueManager.on('song_added', (song) => {
  console.log('Broadcasting song_added:', song.title);
  io.emit('song_added', song);
});

queueManager.on('song_removed', (song) => {
  io.emit('song_removed', song);
});

queueManager.on('current_changed', (song) => {
  io.emit('current_changed', song);
});

queueManager.on('playback_state', (isPlaying) => {
  io.emit('playback_state', isPlaying);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to newly connected client
  socket.emit('queue_update', queueManager.getState());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const WS_PORT = 3001;
httpServer.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});
