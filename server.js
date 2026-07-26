<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <title>Studio Live Chat</title>
</head>
<body style="font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; padding: 20px; margin: 0;">

    <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="color: #00adb5; border-bottom: 2px solid #333; padding-bottom: 10px;">🎙️ Οθόνη Μηνυμάτων Studio Live</h2>
        
        <!-- Το κουτί όπου θα εμφανίζονται τα μηνύματα -->
        <div id="box" style="background:#111; height: 550px; overflow-y: scroll; border: 1px solid #444; padding: 15px; border-radius: 8px; font-size: 18px; line-height: 1.6;">
            <p id="connection-status" style="color: #888; font-style: italic;">Σύνδεση με τον server...</p>
        </div>
    </div>

    <script>
        // Σύνδεση με WebSocket Server (wss:// αντί για https://)
        const socket = new WebSocket('wss://panagiotis-live-chat.onrender.com');
        const box = document.getElementById('box');
        const status = document.getElementById('connection-status');
        let isFirstMessage = true;

        socket.onopen = () => {
            status.innerHTML = "🟢 Η σύνδεση είναι ενεργή! Αναμονή για μηνύματα...";
            status.style.color = "green";
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Καθαρίζει το μήνυμα αναμονής στο πρώτο μήνυμα
                if (isFirstMessage) {
                    box.innerHTML = '';
                    isFirstMessage = false;
                }

                // Παίρνουμε την τρέχουσα ώρα
                const now = new Date();
                const timeStr = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

                // Προσθήκη του νέου μηνύματος στην οθόνη
                box.innerHTML += `
                    <div style="border-bottom: 1px solid #222; padding: 10px 0;">
                        <span style="color: #888; font-size: 13px;">[${timeStr}]</span> 
                        <strong style="color: #ff2e63;">${data.username}:</strong> 
                        <span style="color: #eeeeee;">${data.text}</span>
                    </div>
                `;
                
                box.scrollTop = box.scrollHeight; 
            } catch (e) {
                console.error("Σφάλμα:", e);
            }
        };

        socket.onclose = () => {
            status.innerHTML = "🔴 Η σύνδεση χάθηκε. Γίνεται προσπάθεια επανασύνδεσης...";
            status.style.color = "red";
            setTimeout(() => { window.location.reload(); }, 5000); // Επαναφορά σε 5 δευτερόλεπτα
        };
    </script>
</body>
</html>
