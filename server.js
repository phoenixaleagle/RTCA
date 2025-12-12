const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*", // Android client အတွက် CORS ခွင့်ပြုခြင်း
    methods: ["GET", "POST"]
  }
});

const messages = []; // ယာယီ မက်ဆေ့ချ် သိမ်းဆည်းရန်

app.get('/', (req, res) => {
  res.status(200).send('✅ Real-Time Chat Server is running.');
});

io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);
  
  socket.emit('initial messages', messages); // ချိတ်ဆက်သူအသစ်ကို message အဟောင်းများ ပို့ခြင်း

  socket.on('chat message', (msg) => {
    const fullMessage = {
        user: msg.user || "Anonymous",
        text: msg.text,
        timestamp: Date.now()
    };
    
    messages.push(fullMessage);
    console.log(`📬 Message received from ${fullMessage.user}: ${fullMessage.text}`);

    // ချိတ်ဆက်ထားသူ အားလုံးဆီသို့ ထုတ်လွှင့်ခြင်း
    io.emit('chat message', fullMessage);
  });

  socket.on('disconnect', () => {
    console.log(`🚪 User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server listening on port ${PORT}`);
});
