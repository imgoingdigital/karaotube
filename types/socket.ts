import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: NextApiResponse['socket'] & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
}
