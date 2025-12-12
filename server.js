const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

const MONGODB_URI = 'mongodb+srv://chatapp:ylh43181864cmk@chatapp.nzy8ktl.mongodb.net/?appName=chatapp';
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const messages = [];
const userSocketMap = new Map();

try {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));
} catch (e) {
  console.error("MongoDB connection error");
}

app.get('/', (req, res) => {
  res.status(200).send('Real-Time Chat Server is running.');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit('initial messages', messages);

  socket.on('signup', async (data, callback) => {
    try {
      callback({ success: true, message: "Signup success" });
      console.log(`New user signed up: ${data.username}`);
    } catch (error) {
      console.error('Signup Error:', error);
      callback({ success: false, message: "Signup error" });
    }
  });

  socket.on('login', async (data, callback) => {
    const username = data.username;
    const password = data.password;

    try {
      if (!username || !password) {
        return callback({ success: false, message: "Invalid data" });
      }

      userSocketMap.set(socket.id, username);
      socket.username = username;

      console.log(`User logged in: ${username} (${socket.id})`);
      callback({ success: true, message: "Login success", username: username });
    } catch (error) {
      console.error('Login Error:', error);
      callback({ success: false, message: "Login error" });
    }
  });

  socket.on('chat message', (msg) => {
    const senderUsername = userSocketMap.get(socket.id) || msg.user || "Anonymous";

    const fullMessage = {
      user: senderUsername,
      text: msg.text,
      timestamp: Date.now()
    };

    messages.push(fullMessage);
    console.log(`Message from ${fullMessage.user}: ${fullMessage.text}`);
    io.emit('chat message', fullMessage);
  });

  socket.on('disconnect', () => {
    const username = userSocketMap.get(socket.id);
    if (username) {
      userSocketMap.delete(socket.id);
      console.log(`User disconnected: ${socket.id} (User: ${username})`);
    } else {
      console.log(`User disconnected: ${socket.id}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
});
