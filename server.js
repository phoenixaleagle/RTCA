const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb+srv://chatapp:ylh43181864cmk@chatapp.nzy8ktl.mongodb.net/?appName=chatapp';

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const messages = [];

app.get('/', (req, res) => {
  res.status(200).send('Real-Time Chat Server running');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('signup', async (data, callback) => {
    const { username, password } = data;
    if (!username || !password) return callback({ success: false, message: 'Username and password required' });

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) return callback({ success: false, message: 'Username already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();

      callback({ success: true, message: 'Signup successful' });
    } catch (error) {
      callback({ success: false, message: 'Server error' });
    }
  });

  socket.on('login', async (data, callback) => {
    const { username, password } = data;

    try {
      const user = await User.findOne({ username });
      if (!user) return callback({ success: false, message: 'Invalid username' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return callback({ success: false, message: 'Invalid password' });

      socket.username = username;
      callback({ success: true, message: 'Login successful', username });
      socket.emit('initial messages', messages);

    } catch (error) {
      callback({ success: false, message: 'Server error' });
    }
  });

  socket.on('chat message', (msg) => {
    if (!socket.username) {
      socket.emit('auth error', 'Please login first');
      return;
    }

    const fullMessage = {
      user: socket.username,
      text: msg.text,
      timestamp: Date.now()
    };

    messages.push(fullMessage);
    io.emit('chat message', fullMessage);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
