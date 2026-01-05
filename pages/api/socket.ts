import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { Server as SocketIOServer } from 'socket.io';
import { queueManager } from '@/lib/queue-manager';

let isInitialized = false;

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io && !isInitialized) {
    console.log('Initializing Socket.IO from API route...');
    
    const io = new SocketIOServer(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    res.socket.server.io = io;
    isInitialized = true;

    // Setup queue manager listeners
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
      socket.emit('queue_update', queueManager.getState());
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.IO initialized, listeners:', queueManager.listenerCount('update'));
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
