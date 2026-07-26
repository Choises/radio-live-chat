const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 10000;

// Όταν κάποιος μπαίνει στο URL, του σερβίρουμε το Chat Room
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Radio Live Chat</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
            #chat-container { display: flex; flex-direction: column; height: 100vh; max-width: 100%; background: #fff; }
            #chat-header { background: #007bff; color: white; padding: 12px; font-weight: bold; text-align: center; font-size: 16px; }
            #chat-messages { flex: 1; padding: 15px; overflow-y: auto; font-size: 14px; line-height: 1.4; border-bottom: 1px solid #eee; }
            #chat-inputs { padding: 10px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
            #chat-username { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
            .input-row { display: flex; gap: 5px; }
            #chat-message { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
            #chat-send { background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; }
            #chat-send:hover { background: #0056b3; }
        </style>
    </head>
    <body>

    <div id="chat-container">
        <div id="chat-header">📻 Radio Live Chat</div>
        <div id="chat-messages">
            <div id="connection-status" style="color: #888; text-align: center; font-style: italic;">Σύνδεση στο chat...</div>
        </div>
        <div id="chat-inputs">
            <input type="text" id="chat-username" placeholder="Το όνομά σας..." />
            <div class="input-row">
                <input type="text" id="chat-message" placeholder="Γράψτε ένα μήνυμα..." disabled />
                <button id="chat-send" disabled>Αποστολή</button>
            </div>
        </div>
    </div>

    <script>
        // Αυτόματη εύρεση του σωστού πρωτοκόλλου (ws ή wss) ανάλογα με το αν είμαστε σε ασφαλή σελίδα
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const socket = new WebSocket(protocol + window.location.host);

        const messagesContainer = document.getElementById('chat-messages');
        const statusContainer = document.getElementById('connection-status');
        const usernameInput = document.getElementById('chat-username');
        const messageInput = document.getElementById('chat-message');
        const sendButton = document.getElementById('chat-send');

        socket.onopen = () => {
            statusContainer.innerHTML = '🟢 Συνδεθήκατε στο Chat!';
            statusContainer.style.color = 'green';
            statusContainer.style.fontWeight = 'bold';
            messageInput.disabled = false;
            sendButton.disabled = false;
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const messageElement = document.createElement('div');
                messageElement.style.marginBottom = '8px';
                messageElement.innerHTML = \`<strong style="color: #007bff;">\${data.username}:</strong> \${data.text}\`;
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (e) {
                console.error(e);
            }
        };

        socket.onclose = () => {
            statusContainer.innerHTML = '🔴 Η σύνδεση χάθηκε. Ανανεώστε τη σελίδα.';
            statusContainer.style.color = 'red';
            messageInput.disabled = true;
            sendButton.disabled = true;
        };

        function sendMessage() {
            const username = usernameInput.value.trim() || 'Επισκέπτης';
            const text = messageInput.value.trim();
            if (text === '' || socket.readyState !== WebSocket.OPEN) return;

            const messageData = { username: username, text: text };
            socket.send(JSON.stringify(messageData));
            messageInput.value = '';
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
    </body>
    </html>
    `);
});

// Διαχείριση των WebSockets (Μηνύματα)
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        // Αναμετάδοση του μηνύματος σε όλους τους συνδεδεμένους χρήστες
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

