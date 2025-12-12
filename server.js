const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Render environment (MongoDB)
const MONGODB_URI = "mongodb+srv://chatapp:ylh43181864cmk@chatapp.nzy8ktl.mongodb.net/?appName=chatapp";

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"],   // 🚨 FIX FOR ANDROID + RENDER
  allowEIO3: true
});

const messages = [];
const userSocketMap = new Map();

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

app.get("/", (req, res) => {
  res.send("Chat Server is running.");
});

// Socket.io
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.emit("initial messages", messages);

  // Signup
  socket.on("signup", async (data, callback) => {
    try {
      return callback({ success: true, message: "Signup success" });
    } catch (err) {
      callback({ success: false, message: "Signup error" });
    }
  });

  // Login
  socket.on("login", async (data, callback) => {
    try {
      const username = data.username;
      const password = data.password;

      if (!username || !password) {
        return callback({ success: false, message: "Invalid data" });
      }

      userSocketMap.set(socket.id, username);
      socket.username = username;

      return callback({
        success: true,
        message: "Login success",
        username
      });

    } catch (err) {
      return callback({ success: false, message: "Login error" });
    }
  });

  // Chat Message
  socket.on("chat message", (msg) => {
    const sender = userSocketMap.get(socket.id) || msg.user || "Unknown";

    const fullMessage = {
      user: sender,
      text: msg.text,
      timestamp: Date.now()
    };

    messages.push(fullMessage);

    io.emit("chat message", fullMessage);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (userSocketMap.has(socket.id)) {
      console.log("User disconnected:", userSocketMap.get(socket.id));
      userSocketMap.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
