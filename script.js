// DOMContentLoaded wrapper removed for immediate execution
console.log('Gemini Manager Script v4 (Serverless) Loaded');

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCwXLl7jo_oMWq_I0rkG_1GlI51ATSFb0o",
    authDomain: "solid-binder-487301-q0.firebaseapp.com",
    projectId: "solid-binder-487301-q0",
    storageBucket: "solid-binder-487301-q0.firebasestorage.app",
    messagingSenderId: "103616089821",
    appId: "1:103616089821:web:de204022bd01b7b5c31534"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- EMAILJS INITIALIZATION ---
// SMOOTH SCROLLING FOR ANCHOR LINKS
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// FORM SUBMISSION (Placeholder)
// Placeholder form logic removed.
// Real logic is handled below in 'FORM HANDLING' section.


// ROOFING CALCULATOR LOGIC
// Elements
const lInput = document.getElementById('length');
const wInput = document.getElementById('width');
const baseAreaDisplay = document.getElementById('base-area');
const resultAreaDisplay = document.getElementById('result-area');
const resultPriceDisplay = document.getElementById('result-price');

const pitchBtns = document.querySelectorAll('.pitch-btn');
const pitchRatioInput = document.getElementById('pitch-ratio');
const pitchDegInput = document.getElementById('pitch-deg');
const inputRatioGroup = document.getElementById('input-ratio');
const inputDegGroup = document.getElementById('input-deg');

const materialCards = document.querySelectorAll('.material-card');

// State
let currentPitchMode = 'ratio';
let selectedPrice = 3.50;

// Event Listeners
[lInput, wInput, pitchRatioInput, pitchDegInput].forEach(el => {
    if (el) el.addEventListener('input', calculate);
});

pitchBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        // Toggle active class
        pitchBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Toggle inputs
        currentPitchMode = this.dataset.mode;
        if (currentPitchMode === 'ratio') {
            inputRatioGroup.classList.remove('hidden');
            inputDegGroup.classList.add('hidden');
        } else {
            inputRatioGroup.classList.add('hidden');
            inputDegGroup.classList.remove('hidden');
        }
        calculate();
    });
});

materialCards.forEach(card => {
    card.addEventListener('click', function () {
        materialCards.forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedPrice = parseFloat(this.dataset.price);
        calculate();
    });
});

function calculate() {
    const length = parseFloat(lInput.value) || 0;
    const width = parseFloat(wInput.value) || 0;
    const baseArea = length * width;

    if (baseAreaDisplay) baseAreaDisplay.innerText = baseArea.toLocaleString() + ' ft²';

    // Calculate Multiplier
    let multiplier = 1.0;
    if (currentPitchMode === 'ratio') {
        const rise = parseFloat(pitchRatioInput.value) || 0;
        // Pythagorean: sqrt(12^2 + rise^2) / 12
        multiplier = Math.sqrt(144 + (rise * rise)) / 12;
    } else {
        const deg = parseFloat(pitchDegInput.value) || 0;
        // 1 / cos(deg)
        multiplier = 1 / Math.cos(deg * (Math.PI / 180));
    }

    // Total Area with 10% Waste
    const totalArea = Math.ceil(baseArea * multiplier * 1.10);

    // Total Cost
    const totalCost = totalArea * selectedPrice;

    // Display
    if (resultAreaDisplay) resultAreaDisplay.innerText = totalArea.toLocaleString() + ' ft²';
    if (resultPriceDisplay) {
        resultPriceDisplay.innerText = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(totalCost);
    }
}

// Initial Calc
calculate();

// ZIP CODE CHECKER LOGIC
const checkZipBtn = document.getElementById('checkZipBtn');
if (checkZipBtn) {
    checkZipBtn.addEventListener('click', checkZip);
}

// Also allow 'Enter' key
const zipInput = document.getElementById('zipInput');
if (zipInput) {
    zipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkZip();
    });
}

function checkZip() {
    const input = document.getElementById("zipInput").value.trim();
    const msg = document.getElementById("resultMsg");
    const zip = parseInt(input);

    // REGIONAL LOGIC (100-mile radius approx)
    // Wichita Falls: 763xx
    // Dallas/FW: 750xx - 762xx (Broad North Texas)
    // OKC: 730xx - 731xx (Broad Central OK)

    let isCovered = false;
    let region = "";

    if (!isNaN(zip)) {
        if (zip >= 76300 && zip <= 76399) {
            isCovered = true;
            region = "Wichita Falls";
        } else if (zip >= 75000 && zip <= 76299) {
            isCovered = true;
            region = "Dallas / Fort Worth";
        } else if (zip >= 73000 && zip <= 73199) {
            isCovered = true;
            region = "Oklahoma City";
        }
    }

    if (isCovered) {
        msg.style.color = "#00d2ff"; // Primary Cyan
        msg.innerText = `✅ Yes! We are currently scheduling in ${region} (${input}).`;
    } else if (input.length !== 5 || isNaN(input)) {
        msg.style.color = "#ff3d00"; // Accent Orange
        msg.innerText = "⚠️ Please enter a valid 5-digit Zip Code.";
    } else {
        msg.style.color = "#ff9900"; // Yellow/Orange
        msg.innerText = `📍 You are just outside our primary zone. Call (866) 518-2906 to verify coverage for ${input}.`;
    }
}

// BEFORE & AFTER SLIDER LOGIC
const sliderContainer = document.querySelector('.ba-slider');
if (sliderContainer) {
    // The 'Before' image is the top layer (Storm Damage) that gets clipped
    // The 'After' image is the background layer (Restored)
    const topLayer = document.querySelector('.ba-image-before');
    const handle = document.querySelector('.ba-handle');

    function updateSlider(clientX) {
        const rect = sliderContainer.getBoundingClientRect();
        let x = clientX - rect.left;

        // Constrain
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;

        // Percentage
        const percentage = (x / rect.width) * 100;

        // Clip the Top Layer (Before Image)
        // inset(top right bottom left)
        // We want to clip the right side based on percentage
        // Example: 50% slider -> Clip right side by 50% -> Shows 50% of image
        topLayer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        handle.style.left = `${percentage}%`;
    }

    // Mouse Events
    sliderContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        sliderContainer.addEventListener('mousemove', onMouseMove);
        updateSlider(e.clientX);
    });

    window.addEventListener('mouseup', () => {
        sliderContainer.removeEventListener('mousemove', onMouseMove);
    });

    function onMouseMove(e) {
        updateSlider(e.clientX);
    }

    // Touch Events
    sliderContainer.addEventListener('touchstart', (e) => {
        // e.preventDefault(); // Don't block scroll completely unless horizontal
        sliderContainer.addEventListener('touchmove', onTouchMove);
        updateSlider(e.touches[0].clientX);
    });

    window.addEventListener('touchend', () => {
        sliderContainer.removeEventListener('touchmove', onTouchMove);
    });

    function onTouchMove(e) {
        updateSlider(e.touches[0].clientX);
    }
}

// --- ANATOMY HOVER EFFECTS (3D) ---
const layers = document.querySelectorAll('.stack-layer');
const infoCards = document.querySelectorAll('.info-card');

if (layers.length > 0) {
    layers.forEach(layer => {
        // MOUSE EVENTS
        layer.addEventListener('mouseenter', () => {
            activateLayer(layer);
        });

        // TOUCH EVENTS (Mobile)
        layer.addEventListener('touchstart', (e) => {
            // e.preventDefault(); // Optional: prevent scroll if strict
            activateLayer(layer);
        });
    });
}

function activateLayer(layer) {
    // Remove active class from all text cards
    infoCards.forEach(card => card.classList.remove('active'));

    // Remove touch visual from all layers
    layers.forEach(l => l.classList.remove('touched'));

    // Get the target ID
    const targetId = layer.getAttribute('data-target');
    const targetCard = document.getElementById(targetId);

    // Add active class to target text
    if (targetCard) targetCard.classList.add('active');

    // Add visual state to layer
    layer.classList.add('touched');
}

// FAQ ACCORDION
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach(q => {
    q.addEventListener('click', () => {
        const answer = q.nextElementSibling;
        const parent = q.parentElement;

        // Toggle Active Class
        q.classList.toggle('active');

        // Toggle Max Height
        if (q.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + 'px';
        } else {
            answer.style.maxHeight = 0;
        }

        // Close others (Optional, for clean look)
        faqQuestions.forEach(otherQ => {
            if (otherQ !== q) {
                otherQ.classList.remove('active');
                otherQ.nextElementSibling.style.maxHeight = 0;
            }
        });
    });
});

// CHATBOT LOGIC
const chatWindow = document.getElementById('chat-window');
const chatTrigger = document.getElementById('chat-trigger');
const closeChat = document.getElementById('close-chat');
const chatMessages = document.getElementById('chat-messages');
const chatControls = document.getElementById('chat-controls');

// Toggle Chat
if (chatTrigger) {
    chatTrigger.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden') && chatMessages.children.length === 0) {
            // Initial Greeting if empty
            botReply("Hello! Welcome to Gemini Man Roofing. How can I help you today?");
            showOptions([
                { label: "Request Inspection", action: "inspection" },
                { label: "Get a Quote", action: "quote" },
                { label: "Services", action: "services" }
            ]);
        }
    });
}

if (closeChat) {
    closeChat.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });
}

function botReply(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot-msg';
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function userReply(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-msg';
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showOptions(options) {
    chatControls.innerHTML = ''; // Clear old buttons
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.innerText = opt.label;
        btn.onclick = () => handleOption(opt);
        chatControls.appendChild(btn);
    });
}

function handleOption(opt) {
    userReply(opt.label);

    // Simple Decision Tree
    setTimeout(() => {
        if (opt.action === 'inspection') {
            botReply("Great! We offer 100% free digital roof inspections. Is this for a home or business?");
            showOptions([
                { label: "Home (Residential)", action: "res_insp" },
                { label: "Business (Commercial)", action: "comm_insp" }
            ]);
        } else if (opt.action === 'quote' || opt.action === 'res_insp' || opt.action === 'comm_insp') {
            botReply("Perfect. Please use our official request form to schedule immediately.");
            // Smooth scroll to form
            document.querySelector('#storm-center').scrollIntoView({ behavior: 'smooth' });
            chatWindow.classList.add('hidden'); // Close chat so they see form
        } else if (opt.action === 'services') {
            botReply("We specialize in Storm Restoration, TPO/Metal Commercial Systems, and Leak Repair. Which are you interested in?");
            showOptions([
                { label: "Storm Damage", action: "inspection" },
                { label: "Commercial Roofing", action: "comm_insp" },
                { label: "Repair", action: "inspection" }
            ]);
        }
    }, 500);
}

// FORM HANDLING
const form = document.getElementById('hail-form');
// GOOGLE APPS SCRIPT PROXY (SendGrid Bridge)
// GOOGLE CLOUD RUN BACKEND
const WEB_APP_URL = "https://hailstorm-backend-103616089821.us-central1.run.app/submit-lead";

function handleFormSubmit(formElement, typeOverride = null) {
    formElement.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitBtn = formElement.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        // Loading State
        submitBtn.innerText = 'Sending...';
        submitBtn.disabled = true;

        // Collect Data
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());

        // Normalization
        if (data['hail-size']) data.damageType = data['hail-size'];
        if (data['building-type']) data.damageType = "Commercial: " + data['building-type'];
        if (typeOverride) data.type = typeOverride;
        // Phone is already in 'data.phone' from input name="phone"
        if (!data.zip && data.address) data.zip = data.address;

        // Add Timestamp
        if (firebase.firestore) {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        data.status = 'PENDING';

        // 1. Save to Firestore (Directly) -- Optional Backup
        if (db) {
            db.collection('leads').add(data).then(() => console.log("Saved to Firestore Backup"));
        }

        // 2. Send to Cloud Run Backend
        fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                // Success Handling with Appointment Booking
                formElement.reset();
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;

                // Create and show the Booking Modal
                const preferredDate = data.preferred_date || "today";
                const preferredTime = data.preferred_time || "asap";

                const modalHtml = `
                    <div id="booking-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 3000;">
                        <div style="background: var(--card-bg); padding: 40px; border-radius: 12px; border: 1px solid var(--accent-color); text-align: center; max-width: 500px; width: 90%;">
                            <h2 style="color: #fff; margin-bottom: 20px;">✓ Request Received!</h2>
                            <p style="color: #ddd; margin-bottom: 20px;">We have received your request for an inspection.</p>
                            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                                <p style="color: #00d2ff; font-weight: bold; margin: 0;">Requested: ${preferredDate} @ ${preferredTime}</p>
                            </div>
                            <p style="color: #aaa; font-size: 0.9em; margin-bottom: 30px;">Our dispatch team will call you shortly to confirm availability.</p>
                            <button id="close-booking" class="btn btn-primary" style="width: 100%;">Close</button>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', modalHtml);

                document.getElementById('close-booking').addEventListener('click', () => {
                    document.getElementById('booking-modal').remove();
                });
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Submission failed. Error: " + error.message + "\n\nPlease call us directly at (866) 518-2906.");
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            });
    });
}

if (form) handleFormSubmit(form);

// COMMERCIAL FORM HANDLING
const commForm = document.getElementById('commercial-form');
if (commForm) {
    handleFormSubmit(commForm, 'commercial_lead');
}

// NAVBAR SCROLL EFFECT
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 14, 23, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    } else {
        navbar.style.background = 'rgba(10, 14, 23, 0.8)';
        navbar.style.boxShadow = 'none';
    }
});

// --- LOCALIZED TICKER LOGIC ---
const tickerItems = document.querySelectorAll('.ticker-item');

async function initGeoTicker() {
    try {
        // Fetch location from IP (Free service, no key needed)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const city = data.city || 'North Texas';
        const region = data.region_code || 'TX';
        // const localArea = `${city}, ${region}`; // Unused for now

        // Dynamic Messages based on location
        const messages = [
            `Just Completed: Full Restoration in ${city}`,
            `Inspection Scheduled: Near ${city}`,
            `Approved: Commercial TPO Replacement in ${city}`,
            `Storm Alert: Hail detected near ${city}`
        ];

        // Update DOM
        tickerItems.forEach((item, index) => {
            if (messages[index]) {
                item.innerText = messages[index];
            }
        });

    } catch (error) {
        console.log('Geo-location failed, using default ticker:', error);
        // Fallback is already in HTML
    }
}

// Run immediately
initGeoTicker();


// --- REFERRAL & QUOTE MODAL LOGIC ---

// 1. Referral Modal
// NOTE: We need to handle BOTH the main button AND the navbar link if it exists
const referralBtns = document.querySelectorAll('#referralBtn, a[href="#referral"]'); // Select multiple triggers
const referralModal = document.getElementById('referralModal');
const closeReferral = document.querySelector('.close-modal');
const referralForm = document.getElementById('referralForm');

if (referralModal) {
    // Open Logic
    function openModal(e) {
        if (e) e.preventDefault();
        referralModal.classList.remove('hidden');
        referralModal.style.display = 'flex';
    }

    if (referralBtns.length > 0) {
        referralBtns.forEach(btn => btn.addEventListener('click', openModal));
    }

    // Also check for specific ID if distinct
    const mainRefBtn = document.getElementById('referralBtn');
    if (mainRefBtn) mainRefBtn.addEventListener('click', openModal);

    closeReferral.addEventListener('click', () => {
        referralModal.classList.add('hidden');
        referralModal.style.display = 'none';
    });

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === referralModal) {
            referralModal.classList.add('hidden');
            referralModal.style.display = 'none';
        }
    });

    // Submit Referral
    referralForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = referralForm.querySelector('button');
        const originalText = btn.innerText;

        btn.innerText = 'Sending...';
        btn.disabled = true;

        const formData = new FormData(referralForm);
        const data = Object.fromEntries(formData.entries());
        data.type = 'referral';
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        // Save to Firestore Backup
        db.collection('referrals').add(data);

        // Send via GAS Proxy
        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        })
            .then(() => {
                alert("Referral Submitted! We will contact you regarding your reward once approved.");
                referralForm.reset();
                referralModal.classList.add('hidden');
                referralModal.style.display = 'none';
                btn.innerText = originalText;
                btn.disabled = false;
            })
            .catch(err => {
                console.error(err);
                alert("Error sending referral. Please call us.");
                btn.innerText = originalText;
                btn.disabled = false;
            });
    });
}

// 2. Email Quote Logic
const emailQuoteBtn = document.getElementById('emailQuoteBtn');
if (emailQuoteBtn) {
    emailQuoteBtn.addEventListener('click', () => {
        const area = document.getElementById('result-area').innerText;
        const price = document.getElementById('result-price').innerText;

        const email = prompt("Enter your email address to receive this estimate:");
        if (email && email.includes('@')) {
            const data = {
                type: 'quote',
                email: email,
                area: area,
                price: price,
                material: selectedPrice === 3.50 ? '3-Tab' : selectedPrice === 4.75 ? 'Arch. Shingle' : 'Metal'
            };

            emailQuoteBtn.innerText = 'Sending...';

            // Save to Firestore Backup
            const quoteData = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            db.collection('quotes').add(quoteData);

            // Send via GAS Proxy
            fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            })
                .then(() => {
                    alert(`Estimate sent to ${email}!`);
                    emailQuoteBtn.innerText = '📧 Email Me This Estimate';
                });
        }
    });
}
// --- GOOGLE PLACES AUTOCOMPLETE ---
function initAutocomplete() {
    // Target inputs: Main Lead Form, Neighbor Referral, and City Page Form
    const addressInputs = [
        document.getElementById('address'), // Main Hail Form
        document.querySelector('input[name="neighborAddress"]'), // Referral Form
        document.querySelector('input[name="address"]') // Generic selector for City Pages
    ];

    addressInputs.forEach(input => {
        if (input) {
            const autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: "us" },
                fields: ["address_components", "geometry", "icon", "name"],
                types: ["address"],
            });

            // Prevent "Enter" from submitting form when selecting address
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });
        }
    });
}

// Global callback for GMaps script
window.initMap = function () {
    // Initialize Map Widget (if present)
    if (typeof initServiceMap === 'function') initServiceMap();
    // Initialize Autocomplete
    initAutocomplete();
};
