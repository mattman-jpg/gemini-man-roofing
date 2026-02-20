(function () {
    function initChatbot() {
        // Inject Widget HTML if not present
        if (!document.getElementById('gemini-chat-widget')) {
            const widgetHTML = `
                <div id="gemini-chat-widget">
                    <div class="chat-widget-btn" id="chat-toggle">
                        <div class="chat-icon">🤖</div>
                    </div>
                    
                    <div class="chat-window" id="chat-window">
                        <div class="chat-header">
                            <div class="chat-title">
                                <h3>Gemini Man <span>●</span></h3>
                                <span style="font-size: 0.7rem; color: #aaa;">AI Assistant (Ultra)</span>
                            </div>
                            <button class="close-chat" id="close-chat">&times;</button>
                        </div>
                        
                        <div class="chat-body" id="chat-body">
                            <div class="message bot">
                                Hello! I'm the <strong>Gemini Man AI</strong>. 
                                I can give you estimate ranges, analyze your hail damage, or schedule an inspection. 
                                <br><br>How can I help you today?
                            </div>
                        </div>
                        
                        <div class="chat-input-area">
                            <input type="text" id="chat-input" class="chat-input" placeholder="Type a message...">
                            <button class="send-btn" id="send-btn">➤</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', widgetHTML);
        }

        // Elements
        const toggleBtn = document.getElementById('chat-toggle');
        const closeBtn = document.getElementById('close-chat');
        const chatWindow = document.getElementById('chat-window');
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        const chatBody = document.getElementById('chat-body');

        // State
        let isOpen = false;
        let chatHistory = [];

        // Functions
        function toggleChat() {
            console.log("Chat toggle clicked! Current state:", isOpen);

            isOpen = !isOpen;
            if (isOpen) {
                chatWindow.classList.add('active');
                if (chatInput) chatInput.focus();
            } else {
                chatWindow.classList.remove('active');
            }
        }

        function addMessage(text, sender) {
            const div = document.createElement('div');
            div.classList.add('message', sender);
            div.innerHTML = text; // Allow HTML for line breaks
            chatBody.appendChild(div);
            // Quick scroll fix
            setTimeout(() => {
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 50);
        }

        function showTyping() {
            const id = 'typing-' + Date.now();
            const html = `
            <div class="message bot typing" id="${id}">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        `;
            chatBody.insertAdjacentHTML('beforeend', html);
            chatBody.scrollTop = chatBody.scrollHeight;
            return id;
        }

        function removeTyping(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        // Convert links in text to real a tags
        function formatResponse(text) {
            // Very basic simple URL to Link formatting, or markdown-style links if needed
            // Assuming AI output might return some markdown
            let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // bold
            formatted = formatted.replace(/\n/g, '<br>'); // line breaks
            return formatted;
        }

        async function handleSend() {
            const text = chatInput.value.trim();
            if (!text) return;

            // User Message
            addMessage(text, 'user');
            chatInput.value = '';

            // Add to local history
            chatHistory.push({ role: 'user', content: text });

            // Bot Response (Simulation for UI Phase)
            const typingId = showTyping();

            try {
                // Live Server Endpoint (Local for now, change to production URL later)
                const response = await fetch('http://127.0.0.1:8081/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: text,
                        history: chatHistory.slice(-10) // Send last 10 messages for context
                    })
                });

                removeTyping(typingId);

                if (response.ok) {
                    const data = await response.json();
                    let botReply = data.response;

                    if (data.error) {
                        botReply = "Error: " + data.error;
                    }

                    addMessage(formatResponse(botReply), 'bot');
                    chatHistory.push({ role: 'assistant', content: botReply });
                } else {
                    addMessage("Sorry, I am having trouble connecting to my neural network.", 'bot');
                }
            } catch (error) {
                console.error("Chat API Error:", error);
                removeTyping(typingId);
                addMessage("Systems are offline. Please call us at (866) 518-2906.", 'bot');
            }
        }

        // Event Listeners
        console.log("Attaching event listeners to Chatbot...");
        if (toggleBtn) toggleBtn.addEventListener('click', toggleChat);
        if (closeBtn) closeBtn.addEventListener('click', toggleChat);

        if (sendBtn) sendBtn.addEventListener('click', handleSend);
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }
        console.log("Chatbot Initialization Complete.");
    }

    // Run initialization safely preventing race condition
    console.log("Chatbot script loaded. Ready state:", document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
