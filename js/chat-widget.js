/**
 * Live Chat Widget Simulation
 * Provides an interactive chat experience for customer support
 */

class ChatWidget {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.init();
  }

  init() {
    this.createWidget();
    this.setupEventListeners();
    this.loadPredefinedMessages();
  }

  createWidget() {
    const widget = document.createElement('div');
    widget.className = 'chat-widget';
    widget.innerHTML = `
      <div class="chat-toggle" id="chat-toggle">
        <div class="chat-icon">💬</div>
        <div class="chat-notification" id="chat-notification">1</div>
      </div>
      
      <div class="chat-window" id="chat-window">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-avatar">👨‍💼</div>
            <div class="chat-details">
              <div class="chat-name">GenZ Support</div>
              <div class="chat-status">Online</div>
            </div>
          </div>
          <button class="chat-close" id="chat-close">×</button>
        </div>
        
        <div class="chat-messages" id="chat-messages">
          <div class="chat-message bot-message">
            <div class="message-avatar">👨‍💼</div>
            <div class="message-content">
              <div class="message-text">Hi! Welcome to GenZLaundry. How can I help you today?</div>
              <div class="message-time">${this.getCurrentTime()}</div>
            </div>
          </div>
        </div>
        
        <div class="chat-quick-replies" id="chat-quick-replies">
          <button class="quick-reply" data-message="I want to book a pickup">📅 Book Pickup</button>
          <button class="quick-reply" data-message="What are your prices?">💰 Pricing</button>
          <button class="quick-reply" data-message="What services do you offer?">🧺 Services</button>
          <button class="quick-reply" data-message="What are your working hours?">⏰ Hours</button>
        </div>
        
        <div class="chat-input-container">
          <input type="text" class="chat-input" id="chat-input" placeholder="Type your message...">
          <button class="chat-send" id="chat-send">➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    this.addStyles();
  }

  addStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
      .chat-widget {
        position: fixed;
        bottom: 100px;
        right: 30px;
        z-index: var(--z-modal);
        font-family: var(--font-primary);
      }

      .chat-toggle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--gradient-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--shadow-xl);
        transition: var(--transition);
        position: relative;
      }

      .chat-toggle:hover {
        transform: scale(1.1);
        box-shadow: var(--shadow-2xl);
      }

      .chat-icon {
        font-size: 24px;
        color: white;
      }

      .chat-notification {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #e74c3c;
        color: white;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      }

      .chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: var(--border-radius-xl);
        box-shadow: var(--shadow-2xl);
        display: flex;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px) scale(0.9);
        transition: var(--transition);
        overflow: hidden;
      }

      .chat-window.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      .chat-header {
        background: var(--gradient-primary);
        color: white;
        padding: var(--spacing-md);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chat-header-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .chat-avatar {
        font-size: 24px;
      }

      .chat-name {
        font-weight: 600;
        font-size: var(--fs-base);
      }

      .chat-status {
        font-size: var(--fs-xs);
        opacity: 0.9;
      }

      .chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
      }

      .chat-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .chat-messages {
        flex: 1;
        padding: var(--spacing-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .chat-message {
        display: flex;
        gap: var(--spacing-sm);
        animation: fadeInUp 0.3s ease;
      }

      .chat-message.user-message {
        flex-direction: row-reverse;
      }

      .message-avatar {
        font-size: 20px;
        flex-shrink: 0;
      }

      .message-content {
        max-width: 80%;
      }

      .message-text {
        background: var(--color-bg);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-lg);
        font-size: var(--fs-sm);
        line-height: 1.4;
      }

      .user-message .message-text {
        background: var(--gradient-primary);
        color: white;
      }

      .message-time {
        font-size: var(--fs-xs);
        color: var(--color-text-lighter);
        margin-top: var(--spacing-xs);
        text-align: right;
      }

      .user-message .message-time {
        color: rgba(255, 255, 255, 0.7);
      }

      .chat-quick-replies {
        padding: var(--spacing-sm) var(--spacing-md);
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
        border-top: 1px solid var(--color-border-light);
      }

      .quick-reply {
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--fs-xs);
        cursor: pointer;
        transition: var(--transition);
      }

      .quick-reply:hover {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }

      .chat-input-container {
        display: flex;
        padding: var(--spacing-md);
        border-top: 1px solid var(--color-border-light);
        gap: var(--spacing-sm);
      }

      .chat-input {
        flex: 1;
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: var(--fs-sm);
        outline: none;
        transition: var(--transition);
      }

      .chat-input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.1);
      }

      .chat-send {
        background: var(--gradient-primary);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-send:hover {
        transform: scale(1.1);
      }

      .typing-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-bg);
        border-radius: var(--border-radius-lg);
        font-size: var(--fs-sm);
        color: var(--color-text-light);
      }

      .typing-dots {
        display: flex;
        gap: 2px;
      }

      .typing-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--color-text-lighter);
        animation: typing 1.4s infinite;
      }

      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }

      @media (max-width: 768px) {
        .chat-widget {
          bottom: 80px;
          right: 20px;
        }

        .chat-window {
          width: 300px;
          height: 450px;
        }
      }

      @media (max-width: 480px) {
        .chat-window {
          width: calc(100vw - 40px);
          right: -10px;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  setupEventListeners() {
    const toggle = document.getElementById('chat-toggle');
    const close = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const quickReplies = document.getElementById('chat-quick-replies');

    toggle.addEventListener('click', () => this.toggleChat());
    close.addEventListener('click', () => this.closeChat());
    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    quickReplies.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-reply')) {
        const message = e.target.getAttribute('data-message');
        this.sendUserMessage(message);
      }
    });
  }

  loadPredefinedMessages() {
    this.responses = {
      'book': {
        keywords: ['book', 'pickup', 'schedule', 'appointment'],
        response: "Great! I'd be happy to help you book a pickup. You can either click the 'Book Pickup' button on our website or call us at +91 8233853727. What's your preferred time?"
      },
      'pricing': {
        keywords: ['price', 'cost', 'rate', 'charge', 'fee'],
        response: "Our pricing is very competitive! Wash & Fold starts at ₹15/kg, Dry Cleaning from ₹50/piece. Would you like to see our complete pricing list?"
      },
      'services': {
        keywords: ['service', 'offer', 'do', 'provide'],
        response: "We offer Wash & Fold, Dry Cleaning, Professional Ironing, and Specialty Care for ethnic wear. All with free pickup and delivery in Jodhpur!"
      },
      'hours': {
        keywords: ['hour', 'time', 'open', 'close', 'available'],
        response: "We're available Monday to Saturday, 8 AM to 8 PM. Sunday 10 AM to 6 PM. Pickup and delivery available during these hours!"
      },
      'location': {
        keywords: ['location', 'address', 'where', 'area'],
        response: "We serve all areas of Jodhpur! Our main service areas include Ratanada, Shastri Nagar, Paota, and surrounding localities."
      },
      'default': "Thanks for your message! For immediate assistance, please call us at +91 8233853727 or WhatsApp us. Our team will be happy to help you!"
    };
  }

  toggleChat() {
    const window = document.getElementById('chat-window');
    const notification = document.getElementById('chat-notification');
    
    this.isOpen = !this.isOpen;
    window.classList.toggle('open', this.isOpen);
    
    if (this.isOpen) {
      notification.style.display = 'none';
      document.getElementById('chat-input').focus();
    }
  }

  closeChat() {
    this.isOpen = false;
    document.getElementById('chat-window').classList.remove('open');
  }

  sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
      this.sendUserMessage(message);
      input.value = '';
    }
  }

  sendUserMessage(message) {
    this.addMessage(message, 'user');
    this.showTypingIndicator();
    
    setTimeout(() => {
      this.hideTypingIndicator();
      const response = this.generateResponse(message);
      this.addMessage(response, 'bot');
    }, 1500);
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const avatar = sender === 'user' ? '👤' : '👨‍💼';
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-text">${text}</div>
        <div class="message-time">${this.getCurrentTime()}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message typing-message';
    typingDiv.innerHTML = `
      <div class="message-avatar">👨‍💼</div>
      <div class="message-content">
        <div class="typing-indicator">
          <span>Typing</span>
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    const typingMessage = document.querySelector('.typing-message');
    if (typingMessage) {
      typingMessage.remove();
    }
  }

  generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, data] of Object.entries(this.responses)) {
      if (key === 'default') continue;
      
      if (data.keywords.some(keyword => lowerMessage.includes(keyword))) {
        return data.response;
      }
    }
    
    return this.responses.default;
  }

  getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

// Initialize chat widget
document.addEventListener('DOMContentLoaded', () => {
  new ChatWidget();
});