const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 10000;

let onlineCount = 0;

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
            document { box-sizing: border-box; }
            #chat-container { display: flex; flex-direction: column; height: 100vh; max-width: 100%; background: #fff; }
            #chat-header { background: #007bff; color: white; padding: 12px; font-weight: bold; text-align: center; font-size: 16px; position: relative; }
            #online-counter { position: absolute; right: 15px; top: 12px; background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
            #chat-messages { flex: 1; padding: 15px; overflow-y: auto; font-size: 14px; line-height: 1.4; border-bottom: 1px solid #eee; }
            #chat-inputs { padding: 10px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
            #chat-username { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
            .input-row { display: flex; gap: 5px; }
            #chat-message { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
            #chat-send { background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; }
            #chat-send:hover { background: #0056b3; }
            
            .delete-btn { background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 8px; font-weight: bold; }
            .delete-btn:hover { background: #bd2130; }
            
            .chat-link { color: #0056b3; text-decoration: underline; font-weight: bold; }
            .chat-link:hover { color: #003d82; }

            .chat-image { max-width: 150px; max-height: 150px; border-radius: 5px; display: block; margin-top: 5px; border: 1px solid #ddd; cursor: pointer; }
            .chat-image:hover { transform: scale(1.02); }
        </style>
    </head>
    <body>

    <div id="chat-container">
        <div id="chat-header">
            📻 Radio Live Chat
            <span id="online-counter">Online: 0</span>
        </div>
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
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const socket = new WebSocket(protocol + window.location.host);

        const soundJoin = new Audio('https://xat.gr/rooms/sounds/private.mp3?v=1.38'); 
        const soundSend = new Audio('https://xat.gr/rooms/sounds/username.mp3?v=1.38'); 
        const soundReceive = new Audio('https://xat.gr/rooms/sounds/whistle.mp3?v=1.38'); 

        soundJoin.volume = 0.4;
        soundSend.volume = 0.3;
        soundReceive.volume = 0.5;

        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = urlParams.get('admin') === 'true';

        const colors = ['#007bff', '#28a745', '#dc3545', '#fd7e14', '#6f42c1', '#e83e8c', '#20c997', '#17a2b8', '#ffc107'];
        const userColor = colors[Math.floor(Math.random() * colors.length)];
        const myUserId = 'user_' + Math.random().toString(36).substr(2, 9);

        const messagesContainer = document.getElementById('chat-messages');
        const statusContainer = document.getElementById('connection-status');
        const usernameInput = document.getElementById('chat-username');
        const messageInput = document.getElementById('chat-message');
        const sendButton = document.getElementById('chat-send');
        const onlineCounter = document.getElementById('online-counter');

        let lastOnlineCount = 0;

        function linkify(text) {
            const urlPattern = /(\\b(https?|ftp|file):\\s*\\/\\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig;
            
            return text.replace(urlPattern, function(url) {
                // Έλεγχος αν περιέχει κατάληξη εικόνας
                if (url.match(/\\.(jpeg|jpg|gif|png|webp)(\\?.*)?$/i)) {
                    return \`<a href="\${url}" target="_blank" class="chat-link">\${url}</a><img src="\${url}" class="chat-image" onclick="window.open('\${url}', '_blank')" alt="Εικόνα Chat" />\`;
                } else {
                    return \`<a href="\${url}" target="_blank" class="chat-link">\${url}</a>\`;
                }
            });
        }

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
                
                if (data.type === 'update-online') {
                    onlineCounter.innerHTML = 'Online: ' + data.count;
                    if (data.count > lastOnlineCount && lastOnlineCount !== 0) {
                        soundJoin.play().catch(e => console.log('Απαιτείται κλικ'));
                    }
                    lastOnlineCount = data.count;
                    return;
                }

                if (data.type === 'delete-message') {
                    const elToRemove = document.getElementById(data.messageId);
                    if (elToRemove) elToRemove.remove();
                    return;
                }

                const messageElement = document.createElement('div');
                messageElement.id = data.messageId;
                messageElement.style.marginBottom = '8px';
                messageElement.style.display = 'flex';
                messageElement.style.alignItems = 'flex-start';

                let deleteHtml = '';
                if (isAdmin) {
                    // ΔΙΟΡΘΩΘΗΚΕ ΤΟ ΛΑΘΟΣ ΣΗΜΕΙΟ ΕΔΩ:
                    deleteHtml = \`<button class="delete-btn" style="margin-top: 2px;" onclick="requestDelete('\${data.messageId}')">X</button>\`;
                }

                const formattedText = linkify(data.text);

                messageElement.innerHTML = \`\${deleteHtml}<div><strong style="color: \${data.color || '#007bff'};">\${data.username}:</strong> <span>\${formattedText}</span></div>\`;
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                if (data.userId !== myUserId) {
                    soundReceive.play().catch(e => console.log('Απαιτείται κλικ'));
                }
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

            soundSend.play().catch(e => console.log('Απαιτείται κλικ'));

            const uniqueMsgId = 'msg_' + Math.random().toString(36).substr(2, 9);

            const messageData = { 
                type: 'chat-message',
                messageId: uniqueMsgId, 
                username: username, 
                text: text, 
                color: userColor, 
                userId: myUserId 
            };
            socket.send(JSON.stringify(messageData));
            messageInput.value = '';
        }

        function requestDelete(msgId) {
            const deleteData = { type: 'delete-message', messageId: msgId };
            socket.send(JSON.stringify(deleteData));
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

// Διαχείριση των WebSockets
wss.on('connection', (ws) => {
    onlineCount++;
    broadcastOnlineCount();

    ws.on('message', (message) => {
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
    console.log(`Server running on port ${PORT}`);
});
