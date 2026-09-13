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
            /* --- ΦΑΝΤΑΣΤΙΚΟ DARK MODE ΣΤΥΛ 💘 --- */
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #121212; color: #e0e0e0; }
            document { box-sizing: border-box; }
            #chat-container { display: flex; flex-direction: column; height: 100vh; max-width: 100%; background: #1e1e1e; }
            #chat-header { background: #2c3e50; color: #fff; padding: 12px; font-weight: bold; text-align: center; font-size: 16px; position: relative; border-bottom: 1px solid #333; }
            #online-counter { position: absolute; right: 15px; top: 12px; background: #27ae60; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
            #chat-messages { flex: 1; padding: 15px; overflow-y: auto; font-size: 14px; line-height: 1.5; border-bottom: 1px solid #333; background: #121212; }
            #chat-inputs { padding: 10px; background: #1e1e1e; display: flex; flex-direction: column; gap: 8px; }
            
            #chat-username { padding: 8px; border: 1px solid #444; border-radius: 4px; font-size: 14px; background: #2c2c2c; color: #fff; }
            #chat-username::placeholder { color: #888; }
            .input-row { display: flex; gap: 5px; align-items: center; }
            #chat-message { flex: 1; padding: 8px; border: 1px solid #444; border-radius: 4px; font-size: 14px; background: #2c2c2c; color: #fff; }
            #chat-message::placeholder { color: #888; }
            #chat-message:disabled { background: #1a1a1a; color: #555; }
            
            #chat-send { background: #2980b9; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; height: 35px; }
            #chat-send:hover { background: #3498db; }
            #chat-send:disabled { background: #444; color: #777; cursor: not-allowed; }
            
            #voice-btn { background: #c0392b; color: white; border: none; width: 35px; height: 35px; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
            #voice-btn:hover { background: #e74c3c; }
            #voice-btn.recording { background: #f1c40f; animation: pulse 1s infinite; }
            
            .delete-btn { background: #c0392b; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 8px; font-weight: bold; }
            .delete-btn:hover { background: #e74c3c; }
            
            .chat-link { color: #3498db; text-decoration: underline; font-weight: bold; }
            .chat-link:hover { color: #5dade2; }
            .chat-image { max-width: 150px; max-height: 150px; border-radius: 5px; display: block; margin-top: 5px; border: 1px solid #444; cursor: pointer; }
            
            .audio-player { margin-top: 5px; display: block; max-width: 240px; background: #2c2c2c; border-radius: 4px; }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        </style>
    </head>
    <body>

    <div id="chat-container">
        <div id="chat-header">
            📻 Radio Live Chat
            <span id="online-counter">Online: 0</span>
        </div>
        <div id="chat-messages">
            <div id="connection-status" style="color: #aaa; text-align: center; font-style: italic;">Σύνδεση στο chat...</div>
        </div>
        <div id="chat-inputs">
            <input type="text" id="chat-username" placeholder="Το όνομά σας..." />
            <div class="input-row">
                <button id="voice-btn" title="Κρατήστε πατημένο για ηχογράφηση φωνητικού" disabled>🎙️</button>
                <input type="text" id="chat-message" placeholder="Γράψτε ένα μήνυμα..." disabled />
                <button id="chat-send" disabled>Αποστολή</button>
            </div>
        </div>
    </div>

    <script>
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const socket = new WebSocket(protocol + window.location.host);

        const soundJoin = new Audio('https://xat.gr'); 
        const soundSend = new Audio('https://xat.gr'); 
        const soundReceive = new Audio('https://xat.gr'); 

        soundJoin.volume = 0.4;
        soundSend.volume = 0.3;
        soundReceive.volume = 0.5;

        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = urlParams.get('admin') === 'true';

        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#e67e22', '#9b59b6', '#f1c40f', '#1abc9c', '#34495e', '#ff7675'];
        const userColor = colors[Math.floor(Math.random() * colors.length)];
        const myUserId = 'user_' + Math.random().toString(36).substr(2, 9);

        const messagesContainer = document.getElementById('chat-messages');
        const statusContainer = document.getElementById('connection-status');
        const usernameInput = document.getElementById('chat-username');
        const messageInput = document.getElementById('chat-message');
        const sendButton = document.getElementById('chat-send');
        const onlineCounter = document.getElementById('online-counter');
        const voiceButton = document.getElementById('voice-btn');

        let lastOnlineCount = 0;
        let mediaRecorder;
        let audioChunks = [];

        function linkify(text) {
            const urlPattern = /(\\b(https?|ftp|file):\\s*\\/\\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig;
            return text.replace(urlPattern, function(url) {
                if (url.match(/\\.(jpeg|jpg|gif|png|webp)(\\?.*)?$/i)) {
                    return \`<img src="\${url}" class="chat-image" onclick="window.open('\${url}', '_blank')" alt="Εικόνα Chat" />\`;
                } else {
                    return \`<a href="\${url}" target="_blank" class="chat-link">\${url}</a>\`;
                }
            });
        }

        socket.onopen = () => {
            statusContainer.innerHTML = '🟢 Συνδεθήκατε στο Chat!';
            statusContainer.style.color = '#2ecc71';
            statusContainer.style.fontWeight = 'bold';
            messageInput.disabled = false;
            sendButton.disabled = false;
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                voiceButton.disabled = false;
                setupVoiceRecording();
            }
        };

        function setupVoiceRecording() {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];
                    
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        sendVoiceMessage(base64Audio);
                    };
                };
            }).catch(err => console.log('Μικρόφωνο error:', err));

            voiceButton.addEventListener('mousedown', startRecording);
            voiceButton.addEventListener('touchstart', startRecording);
            window.addEventListener('mouseup', stopRecording);
            window.addEventListener('touchend', stopRecording);
        }

        function startRecording(e) {
            e.preventDefault();
            if (!mediaRecorder || mediaRecorder.state === 'recording') return;
            audioChunks = [];
            mediaRecorder.start();
            voiceButton.classList.add('recording');
        }

        function stopRecording() {
            if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
            mediaRecorder.stop();
            voiceButton.classList.remove('recording');
        }

        function sendVoiceMessage(base64Data) {
            const username = usernameInput.value.trim() || 'Επισκέπτης';
            const uniqueMsgId = 'msg_' + Math.random().toString(36).substr(2, 9);
            soundSend.play().catch(e => console.log('Απαιτείται κλικ'));

            const messageData = {
                type: 'voice-message',
                messageId: uniqueMsgId,
                username: username,
                audioData: base64Data,
                color: userColor,
                userId: myUserId
            };
            socket.send(JSON.stringify(messageData));
        }

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
}if (data.type === 'delete-message') {const elToRemove = document.getElementById(data.messageId);if (elToRemove) elToRemove.remove();return;}const messageElement = document.createElement('div');messageElement.id = data.messageId;messageElement.style.marginBottom = '10px';messageElement.style.display = 'flex';messageElement.style.alignItems = 'flex-start';let deleteHtml = '';if (isAdmin) {// ΔΙΟΡΘΩΘΗΚΕ ΟΡΙΣΤΙΚΑ ΕΔΩ:deleteHtml = `X`;}if (data.type === 'voice-message') {messageElement.innerHTML = `${deleteHtml}${data.username}: `;} else {const formattedText = linkify(data.text);messageElement.innerHTML = `${deleteHtml}${data.username}: ${formattedText}`;}messagesContainer.appendChild(messageElement);messagesContainer.scrollTop = messagesContainer.scrollHeight;if (data.userId !== myUserId) {soundReceive.play().catch(e => console.log('Απαιτείται κλικ'));}} catch (e) {console.error(e);}};socket.onclose = () => {statusContainer.innerHTML = '🔴 Η σύνδεση χάθηκε. Ανανεώστε τη σελίδα.';statusContainer.style.color = '#e74c3c';messageInput.disabled = true;sendButton.disabled = true;voiceButton.disabled = true;};// ... (Το υπόλοιπο sendMessage και requestDelete παραμένει ίδιο και σωστό)function sendMessage() {const username = usernameInput.value.trim() || 'Επισκέπτης';const text = messageInput.value.trim();if (text === '' || socket.readyState !== WebSocket.OPEN) return;soundSend.play().catch(e => console.log('Απαιτείται κλικ'));const uniqueMsgId = 'msg_' + Math.random().toString(36).substr(2, 9);const messageData = { type: 'chat-message', messageId: uniqueMsgId, username: username, text: text, color: userColor, userId: myUserId };socket.send(JSON.stringify(messageData));messageInput.value = '';}function requestDelete(msgId) {const deleteData = { type: 'delete-message', messageId: msgId };socket.send(JSON.stringify(deleteData));}sendButton.addEventListener('click', sendMessage);messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });`);});wss.on('connection', (ws) => {onlineCount++;broadcastOnlineCount();ws.on('message', (message) => {wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(message.toString()); });});ws.on('close', () => { onlineCount--; if (onlineCount < 0) onlineCount = 0; broadcastOnlineCount(); });});function broadcastOnlineCount() {const data = JSON.stringify({ type: 'update-online', count: onlineCount });wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(data); });}server.listen(PORT, () => { console.log(Server running on port ${PORT}); });
