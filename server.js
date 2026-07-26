const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.get('/', (req, res) => {
  res.send('Ο WebSocket Server του Ραδιοφώνου Λειτουργεί Κανονικά!');
});

io.on('connection', (socket) => {
  socket.on('send-message', (data) => {
    io.emit('receive-message', data);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
