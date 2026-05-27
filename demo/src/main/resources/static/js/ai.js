/**
 * ai.js - STOCKER AI Chatbot İşlemleri
 */

/**
 * Keşfet sekmesi içindeki Piyasa Keşfi ve STOCKER AI panellerini değiştirir.
 * @param {string} mode - 'piyasa' veya 'ai'
 */
window.kesfetAltSekmeGoster = function(mode) {
    // İçerik alanlarını ayarla
    document.getElementById('kesfetPiyasaPaneli').style.display = (mode === 'piyasa') ? 'block' : 'none';
    document.getElementById('kesfetAiPaneli').style.display     = (mode === 'ai') ? 'block' : 'none';

    // Butonların aktiflik durumunu güncelle
    const btns = document.querySelectorAll('.kesfet-mode-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    if (mode === 'piyasa') {
        document.getElementById('btnModePiyasa').classList.add('active');
    } else {
        document.getElementById('btnModeAi').classList.add('active');
    }
}

/**
 * Mesaj kutusunda Enter tuşuna basıldığında mesajı gönderir.
 */
function aiChatEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        aiChatSend();
    }
}

/**
 * Kullanıcı mesajını backend /api/ai/chat endpointine gönderir ve yanıtı bekler.
 */
async function aiChatSend() {
    const inputEl = document.getElementById('aiChatInput');
    const message = inputEl.value.trim();

    if (!message) return;

    // Kullanıcı mesajını ekle
    addAiMessage(message, 'user');
    inputEl.value = '';

    // Düşünüyor (Loading) mesajını ekle
    const loadingId = addAiMessage('STOCKER AI düşünüyor...', 'bot', true);

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        removeAiLoading(loadingId);

        if (data.durum === 'basarili' && data.answer) {
            addAiMessage(data.answer, 'bot');
        } else {
            addAiMessage(`⚠️ Hata: ${data.mesaj || 'Yanıt alınamadı.'}`, 'bot');
        }

    } catch (error) {
        removeAiLoading(loadingId);
        addAiMessage(`⚠️ Sunucuya bağlanılamadı: ${error.message}`, 'bot');
    }
}

/**
 * Sohbet ekranına mesaj ekler.
 * @param {string} text - Mesaj içeriği
 * @param {string} type - 'user' veya 'bot'
 * @param {boolean} isLoading - Bu mesaj geçici bir loading mesajı mı?
 * @returns {string} Eklenen mesaj elementinin DOM ID'si (loading silmek için)
 */
function addAiMessage(text, type, isLoading = false) {
    const chatBox = document.getElementById('aiChatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${type}`;
    
    const uniqueId = 'msg_' + Date.now();
    msgDiv.id = uniqueId;

    if (isLoading) {
        msgDiv.classList.add('loading');
    }

    // Basit markdown veya satır sonlarını <br> yapma
    let formattedText = escapeHtml(text);
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    // Bold metinleri işle (**kalın**)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    msgDiv.innerHTML = formattedText;
    chatBox.appendChild(msgDiv);

    // Otomatik en alta kaydır
    chatBox.scrollTop = chatBox.scrollHeight;

    return uniqueId;
}

/**
 * Loading mesajını DOM'dan siler.
 * @param {string} id - Silinecek mesajın ID'si
 */
function removeAiLoading(id) {
    const el = document.getElementById(id);
    if (el) {
        el.remove();
    }
}

/**
 * Örnek soru (chip) tıklandığında direkt olarak inputa yazıp gönderir.
 * @param {string} question - Tıklanan örnek soru metni
 */
function sendAiSuggestion(question) {
    const inputEl = document.getElementById('aiChatInput');
    inputEl.value = question;
    aiChatSend();
}
