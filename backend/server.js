const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST"]
  }
});

let players = [];

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinRoom', (data) => {
    players.push({ id: socket.id, name: data.userId });
    io.emit('updatePlayers', players);

    // Assign role (for simplicity, the first player is the murderer)
    if (players.length === 1) {
      io.to(socket.id).emit('roleAssigned', 'Murderer');
    } else {
      io.to(socket.id).emit('roleAssigned', 'Player');
    }
  });

  socket.on('disconnect', () => {
    players = players.filter(player => player.id !== socket.id);
    io.emit('updatePlayers', players);
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
