const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Ρύθμιση του Socket.io με άδεια (CORS) για να συνδέεται ελεύθερα με το Blogspot
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // Επιτρέπουμε μεγάλα αρχεία (μέχρι 10MB) για τα φωνητικά!
});

const PORT = process.env.PORT || 10000;
let onlineCount = 0;

app.get('/', (req, res) => {
    res.send('Ο Socket.io Server λειτουργεί κανονικά και υποστηρίζει Φωνητικά Μηνύματα!');
});

// Διαχείριση των συνδέσεων μέσω Socket.io
io.on('connection', (socket) => {
    onlineCount++;
    io.emit('update-online', onlineCount);

    // Όταν έρχεται οποιοδήποτε μήνυμα (κείμενο, εικόνα, GIF ή Φωνητικό)
    socket.on('send-message', (data) => {
        // Το αναμεταδίδουμε αμέσως σε όλους τους ακροατές
        io.emit('receive-message', data);
    });

    socket.on('disconnect', () => {
        onlineCount--;
        if (onlineCount < 0) onlineCount = 0;
        io.emit('update-online', onlineCount);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

