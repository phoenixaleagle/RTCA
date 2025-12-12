const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

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

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const messageSchema = new Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const MessageModel = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
  res.status(200).send('Real-Time Chat Server is running with Mongoose.');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('signup', async (data, callback) => {
    const { username, password } = data;
    if (!username || !password) return callback({ success: false, message: 'Username နှင့် Password လိုအပ်ပါသည်။' });

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) return callback({ success: false, message: 'ဤ Username ရှိပြီးသား ဖြစ်ပါသည်။' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();

      callback({ success: true, message: 'မဆရ(၁၀)မှ ကြိုဆိုပါသည်။' });
    } catch (error) {
      callback({ success: false, message: 'Server Busy' });
    }
  });

  socket.on('login', async (data, callback) => {
    const { username, password } = data;

    try {
      const user = await User.findOne({ username });
      if (!user) return callback({ success: false, message: 'Username မမှန်ကန်ပါ။' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return callback({ success: false, message: 'Password မမှန်ကန်ပါ။' });

      socket.username = username;

      const historyMessages = await MessageModel.find().sort({ timestamp: 1 }).lean();

      socket.emit('initial messages', historyMessages);
      callback({ success: true, message: 'Welcome' ,  username: username });

    } catch (error) {
      callback({ success: false, message: 'Server Error' });
    }
  });

  socket.on('chat message', async (msg) => {
    if (!socket.username) {
      socket.emit('auth error', 'AuthError');
      return;
    }

    const fullMessage = {
      user: socket.username,
      text: msg.text,
      timestamp: Date.now()
    };

    try {
      const newMessage = new MessageModel(fullMessage);
      await newMessage.save();

      io.emit('chat message', fullMessage);
    } catch (error) {
      socket.emit('server error', 'ServerError');
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id} (User: ${socket.username || 'N/A'})`);
  });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
});
