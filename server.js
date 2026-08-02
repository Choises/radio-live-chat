const fetch = require('node-fetch');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 10000;

let onlineCount = 0;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Απλό μήνυμα επιβεβαίωσης όταν κάποιος μπαίνει στο URL απευθείας
app.get('/', (req, res) => {
    res.send('Ο WebSocket Server λειτουργεί κανονικά και με ασφάλεια!');
});

// Διαχείριση των WebSockets (Server)
wss.on('connection', (ws) => {
    onlineCount++;
    broadcastOnlineCount();

    ws.on('message', async (message) => {
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch(e) {
            return;
        }

        // 1. ΦΟΡΤΩΣΗ ΙΣΤΟΡΙΚΟΥ
        if (data.type === 'request-history') {
            if (!SUPABASE_URL || !SUPABASE_KEY) return;
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_history?select=*&order=created_at.desc&limit=20`, {
                    headers: { 
                        'apikey': SUPABASE_KEY, 
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                const messages = await response.json();
                
                if (Array.isArray(messages)) {
                    const sortedMessages = messages.reverse().map(m => ({
                        messageId: m.message_id,
                        username: m.username,
                        text: m.text,
                        color: m.color,
                        userId: m.user_id
                    }));
                    ws.send(JSON.stringify({ type: 'history', messages: sortedMessages }));
                }
            } catch (err) {
                console.error('Σφάλμα ιστορικού:', err);
                ws.send(JSON.stringify({ type: 'history', messages: [] }));
            }
            return;
        }

        // 2. ΑΠΟΘΗΚΕΥΣΗ ΜΗΝΥΜΑΤΟΣ
        if (data.type === 'chat-message') {
            if (!SUPABASE_URL || !SUPABASE_KEY) return;
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/chat_history`, {
                    method: 'POST',
                    headers: { 
                        'apikey': SUPABASE_KEY, 
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        message_id: data.messageId,
                        username: data.username,
                        text: data.text,
                        color: data.color,
                        user_id: data.userId
                    })
                });
            } catch (err) {
                console.error('Σφάλμα αποθήκευσης:', err);
            }
        }

        // 3. ΔΙΑΓΡΑΦΗ ΜΗΝΥΜΑΤΟΣ
        if (data.type === 'delete-message') {
            if (!SUPABASE_URL || !SUPABASE_KEY) return;
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/chat_history?message_id=eq=${data.messageId}`, {
                    method: 'DELETE',
                    headers: { 
                        'apikey': SUPABASE_KEY, 
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (err) {
                console.error('Σφάλμα διαγραφής:', err);
            }
        }

        // Προώθηση σε όλους τους συνδεδεμένους χρήστες
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        onlineCount--;
        if (onlineCount < 0) onlineCount = 0;
        broadcastOnlineCount();
    });
});

function broadcastOnlineCount() {
    const data = JSON.stringify({ type: 'update-online', count: onlineCount });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

server.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
