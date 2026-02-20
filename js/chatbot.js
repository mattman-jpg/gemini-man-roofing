document.addEventListener('DOMContentLoaded', () => {
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

    // Functions
    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            chatWindow.classList.add('active');
            chatInput.focus();
        } else {
            chatWindow.classList.remove('active');
        }
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.classList.add('message', sender);
        div.innerHTML = text; // Allow HTML for line breaks
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
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

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // User Message
        addMessage(text, 'user');
        chatInput.value = '';

        // Bot Response (Simulation for UI Phase)
        const typingId = showTyping();

        // TODO: Replace with real API call to Python Backend
        setTimeout(() => {
            removeTyping(typingId);
            
            // Mock Response Logic
            let response = "I'm connecting to the Gemini Ultra neural network...";
            if (text.toLowerCase().includes('price') || text.toLowerCase().includes('cost')) {
                response = "Roof replacements in Dallas typically range from <strong>$4.50 to $6.50 per sq ft</strong> for 30-year architectural shingles. <br><br>Would you like a more precise estimate based on your address?";
            } else if (text.toLowerCase().includes('hail')) {
                response = "We tracked significant hail (1.75 inch) in Plano on May 4th. <br><br>I can pull a free hail report for your specific address. What is it?";
            }

            addMessage(response, 'bot');
        }, 1500);
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
