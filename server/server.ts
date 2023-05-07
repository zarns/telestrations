// server/server.ts
import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import Rooms from './rooms';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors()); // Enable CORS for all routes

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow the client's origin
    methods: ['GET', 'POST'],
  },
});

const rooms = Rooms.getInstance(); // Get an instance of the Rooms class

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (creatorUsername: string) => {
    const roomId = Math.floor(Math.random() * 1000).toString(); // Generate a random room number and convert it to a string
    socket.join(roomId);
    rooms.createRoom(roomId, socket, creatorUsername); // Add the room to the Rooms instance
    socket.emit('roomCreated', roomId);
    console.log('Created room ID:', roomId);
  });

  socket.on('startGame', (roomId) => {
    socket.to(roomId).emit('gameStarted');
  });

  socket.on('joinRoom', (roomId: string, username: string) => {
    const room = rooms.getRoom(roomId); // Retrieve the room data from the Rooms instance
    if (room) {
      socket.join(roomId);
      room.addUser(socket, username); // Add the user to the room's Set of users
      socket.emit('roomJoined', roomId);
      io.in(roomId).emit('userJoined'); // Emit 'userJoined' event to all users in the room
      console.log('Joined room ID:', roomId);
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });

  socket.on('leaveRoom', (roomId: string) => {
    console.log('Received leaveRoom event for room ID:', roomId);
    const room = rooms.getRoom(roomId); // Retrieve the room data from the Rooms instance
    if (room) {
      socket.leave(roomId);
      room.removeUser(socket); // Remove the user from the room's Set of users
      if (room.creator === socket) {
        // If the user is the room creator, remove the room from the Rooms instance
        rooms.removeRoom(roomId);
      }
      socket.emit('roomLeft', roomId);
    }
  });

  socket.on('saveDrawing', ({ roomId, drawingDataUrl }) => {
    const room = rooms.getRoom(roomId);
    if (!room) {
      console.error('Error: room not found');
      socket.emit('drawingError', 'Error saving drawing');
      return;
    }
    room.saveDrawing(socket, drawingDataUrl, (err, message) => {
      if (err) {
        socket.emit('drawingError', 'Error saving drawing');
      } else {
        socket.emit('drawingSaved', message);
      }
    });
  });

  socket.on('viewAllDrawings', (roomId: string) => {
    io.in(roomId).emit('viewAllDrawings'); // Emit 'viewAllDrawings' event to all users in the room
    const room = rooms.getRoom(roomId);
    if (!room) {
      console.error('Error: room not found');
      return;
    }
  
    room.viewAllDrawings(socket, (index, imageData, err) => {    
      if (err) {
        console.error('Error reading drawing:', err);
      } else if (imageData) {
        socket.emit('drawingData', { index, imageData });
      } else {
        // No more drawings to send, emit 'viewAllDrawingsFinished' event
        socket.emit('viewAllDrawingsFinished');
      }
    });
  }); 

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Get the room that the user is in
    rooms.removeUserFromAllRooms(socket);
  });

  // ... other socket event handlers ...
});

app.get('/allUsernames', (req, res) => {
  const allUsernames = rooms.getAllUsernames();
  res.status(200).json({ allUsernames });
});

app.get('/getUsernamesInARoom', (req, res) => {
  const roomId = req.query.roomId as string;
  const usernames = rooms.getUsernamesInARoom(roomId);
  res.status(200).json({ usernames });
});

app.get('/getHost', (req, res) => {
  const roomId = req.query.roomId as string;
  const room = rooms.getRoom(roomId);
  const hostId = room?.creator?.id;
  res.status(200).json({ hostId });
});

const EMPTY_ROOM_CHECK_INTERVAL = 120 * 1000; // e.g., every 120 seconds

// Periodically remove empty rooms
setInterval(() => {
  rooms.removeEmptyRooms();
}, EMPTY_ROOM_CHECK_INTERVAL);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
