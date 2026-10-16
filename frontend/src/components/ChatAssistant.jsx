import React, { useState, useEffect, useRef } from "react";
import { sendMessageToAI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const MAX_HISTORY = 10;
const LANGUAGE_KEY = "cropmind_chat_language";

const GREETINGS = {
  en: "Hello! I'm CropMind AI. Ask me about crops, weather, irrigation, or market prices in India.",
  hi: "नमस्ते! मैं CropMind AI हूँ। फसल, मौसम, सिंचाई या मंडी भाव के बारे में पूछें।",
};

// Browser speech-to-text (Chrome / Edge / Android); hidden where unsupported.
const SpeechRecognition = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

const readSavedLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
};

const greetingFor = (language, email) => ({
  sender: "bot",
  greeting: true,
  text: email && language === "en" ? GREETINGS.en.replace("Hello!", `Hello, ${email}!`) : GREETINGS[language],
});

export default function ChatAssistant() {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(readSavedLanguage);
  const [messages, setMessages] = useState(() => [greetingFor(readSavedLanguage(), "")]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // A new user (login, logout, account switch) starts a fresh conversation.
  useEffect(() => {
    setMessages([greetingFor(language, userEmail)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const toggleLanguage = () => {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // storage unavailable (private mode); the choice still applies for this visit
    }
    setMessages((prev) => (prev.length === 1 && prev[0].greeting ? [greetingFor(next, userEmail)] : prev));
  };

  const toggleListening = () => {
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => () => recognitionRef.current?.abort(), []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const parseInlineMarkdown = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  const renderMessageContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    
    const elements = [];
    let listItems = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const itemContent = trimmed.substring(2);
        listItems.push(<li key={`li-${idx}`}>{parseInlineMarkdown(itemContent)}</li>);
      } else {
        if (listItems.length > 0) {
          elements.push(<ul key={`ul-${idx}`}>{listItems}</ul>);
          listItems = [];
        }
        
        if (trimmed.startsWith("### ")) {
          elements.push(<h4 key={idx}>{parseInlineMarkdown(trimmed.substring(4))}</h4>);
        } else if (trimmed.startsWith("## ")) {
          elements.push(<h3 key={idx}>{parseInlineMarkdown(trimmed.substring(3))}</h3>);
        } else if (trimmed === "") {
          elements.push(<div key={idx} className="chat-spacer" />);
        } else {
          elements.push(<p key={idx}>{parseInlineMarkdown(trimmed)}</p>);
        }
      }
    });

    if (listItems.length > 0) {
      elements.push(<ul key={`ul-end`}>{listItems}</ul>);
    }

    return elements;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    // Earlier real turns (no greeting, no error notices) give the model context for follow-ups.
    const history = messages
      .filter((msg) => !msg.greeting && !msg.error)
      .slice(-MAX_HISTORY)
      .map((msg) => ({ role: msg.sender === "bot" ? "assistant" : "user", text: msg.text }));

    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");

    if (!user) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", error: true, text: "Please **log in** to chat with CropMind AI. This keeps the AI service from being misused." }
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const data = await sendMessageToAI(userText, history, language);
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Chat message error:", error);
      const serverMessage = error.response?.data?.message;
      setMessages((prev) => [
        ...prev,
        { sender: "bot", error: true, text: serverMessage || "Sorry, CropMind AI is currently having trouble reaching the server. Please check your backend connection." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        className={`chat-toggle ${isOpen ? "open" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        <span className="chat-label">{isOpen ? "Close" : "AI Assistant"}</span>
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-avatar">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4M8 15h.01M16 15h.01"></path>
              </svg>
            </div>
            <div>
              <h3>CropMind AI</h3>
              <div className="chat-status-block">
                <span className="pulse-dot"></span>
                <span className="chat-status">Online Assistant</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-lang-toggle"
              onClick={toggleLanguage}
              aria-label={language === "en" ? "Switch replies to Hindi" : "Switch replies to English"}
              title={language === "en" ? "Reply in Hindi" : "Reply in English"}
            >
              {language === "en" ? "हिं" : "EN"}
            </button>
          </div>

          <div className="chat-body">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={msg.sender === "bot" ? "bot-msg" : "user-msg"}
              >
                <div className="msg-avatar">
                  {msg.sender === "bot" ? (
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                      <circle cx="12" cy="5" r="2"></circle>
                      <path d="M12 7v4M8 15h.01M16 15h.01"></path>
                    </svg>
                  ) : (
                    userEmail ? (
                      <span className="user-avatar-initials" title={userEmail}>
                        {userEmail.substring(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )
                  )}
                </div>
                <div className="msg-content">
                  {renderMessageContent(msg.text)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="bot-msg typing-msg">
                <div className="msg-avatar">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4M8 15h.01M16 15h.01"></path>
                  </svg>
                </div>
                <div className="msg-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={language === "hi" ? "फसल, मिट्टी, मौसम के बारे में पूछें..." : "Ask about crops, soils, weather..."}
              maxLength={1000}
              disabled={isLoading}
            />
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`chat-mic-btn ${isListening ? "listening" : ""}`}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                title={isListening ? "Listening... click to stop" : "Speak your question"}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <rect x="9" y="2" width="6" height="12" rx="3"></rect>
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v5"></path>
                </svg>
              </button>
            )}
            <button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="chat-send-btn"
              aria-label="Send Message"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
