const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Επιτρέπει τη σύνδεση από οποιοδήποτε site (GitHub Pages)
        methods: ["GET", "POST"]
    }
});

// Κρατάμε τον αριθμό των online χρηστών
let onlineUsers = 0;

io.on('connection', (socket) => {
    // 1. Ένας νέος χρήστης συνδέθηκε! Αυξάνουμε τον μετρητή
    onlineUsers++;
    
    // Στέλνουμε live τον νέο αριθμό σε ΟΛΟΥΣ τους συνδεδεμένους χρήστες
    io.emit('user-count', onlineUsers);
    
    console.log(`Ένας χρήστης συνδέθηκε. Online: ${onlineUsers}`);

    // Ακούμε για μηνύματα και τα κάνουμε broadcast σε όλους
    socket.on('send-message', (data) => {
        io.emit('receive-message', data);
    });

    // 2. Ένας χρήστης αποσυνδέθηκε (έκλεισε τη σελίδα)
    socket.on('disconnect', () => {
        onlineUsers--;
        if (onlineUsers < 0) onlineUsers = 0; // Ασφάλεια για να μην πάει υπό του μηδενός
        
        // Ενημερώνουμε live ΟΛΟΥΣ τους υπόλοιπους για το νέο νούμερο
        io.emit('user-count', onlineUsers);
        
        console.log(`Ένας χρήστης αποσυνδέθηκε. Online: ${onlineUsers}`);
    });
});

// Ο server τρέχει στη θύρα που δίνει το Render ή στην 3000 τοπικά
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
