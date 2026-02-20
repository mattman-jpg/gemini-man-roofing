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

        // TODO: Replace with real API call to Python Backend when ready for full LLM integration
        setTimeout(() => {
            removeTyping(typingId);
            
            const lowerText = text.toLowerCase();
            let response = "I'm the Gemini Man Assistant. I can help answer questions about roof replacements, hail damage, insurance claims, or scheduling a free inspection. How can I help?";
            
            // Smarter local roofing knowledge base
            if (lowerText.match(/price|cost|much|estimate/)) {
                response = "Roof replacements in Texas typically range from <strong>$4.50 to $6.50 per sq ft</strong> for 30-year architectural shingles. Commercial roofs depend on the system. <br><br>Would you like to schedule a free drone inspection to get an exact quote?";
            } else if (lowerText.match(/hail|storm|wind|damage/)) {
                response = "We closely track storm data across Texas and Oklahoma. If you suspect hail or wind damage, it's critical to get it documented before filing a claim. <br><br>I can pull a free specialized hail report for your exact address. What is your address?";
            } else if (lowerText.match(/insurance|claim|deductible/)) {
                response = "Navigating insurance is our specialty. We help you document the damage correctly so the adjuster sees exactly what we see. We work with all major carriers. <br><br>Have you already filed a claim, or are you just getting started?";
            } else if (lowerText.match(/how long|time|schedule|duration/)) {
                response = "A typical residential roof replacement takes just <strong>1 to 2 days</strong> to complete once materials arrive. We clean up magnetic sweeps for nails daily. <br><br>Are you looking to get this done soon?";
            } else if (lowerText.match(/hello|hi|hey/)) {
                response = "Hello there! I can help you with roofing estimates, hail inspections, or general questions about our process. What's on your mind today?";
            } else if (lowerText.match(/metal|standing seam|tpo|commercial/)) {
                response = "Yes, we specialize in advanced commercial systems including TPO, Silicone Coatings, and Standing Seam Metal. These systems can often be written off as maintenance for tax purposes! <br><br>Are you looking at a commercial property?";
            } else if (lowerText.match(/inspect|free|appointment|book/)) {
                response = "Awesome. The fastest way to get on our schedule is to fill out our <a href='#storm-center' style='color:#00d2ff; text-decoration:underline;'>Booking Form here</a>, or call us directly at (866) 518-2906.";
            }

            addMessage(response, 'bot');
        }, 1200);
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
