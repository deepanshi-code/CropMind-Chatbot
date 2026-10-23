import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { sendMessageToAI, getChatHistory, clearChatHistory, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

// Browser speech-to-text (Chrome / Edge / Android); hidden where unsupported.
const SpeechRecognition = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// Minimal markdown: **bold**, "* " / "- " bullet lists, ## / ### headings.
const inline = (text) => text.split(/\*\*(.*?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));

function MessageContent({ text }) {
  const elements = [];
  let items = [];
  const flush = (key) => {
    if (items.length) elements.push(<ul key={`ul-${key}`}>{items}</ul>);
    items = [];
  };
  text.split("\n").forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      items.push(<li key={idx}>{inline(trimmed.slice(2))}</li>);
      return;
    }
    flush(idx);
    if (trimmed.startsWith("### ")) elements.push(<h4 key={idx}>{inline(trimmed.slice(4))}</h4>);
    else if (trimmed.startsWith("## ")) elements.push(<h3 key={idx}>{inline(trimmed.slice(3))}</h3>);
    else if (trimmed) elements.push(<p key={idx}>{inline(trimmed)}</p>);
  });
  flush("end");
  return <>{elements}</>;
}

const BotIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
    <circle cx="12" cy="5" r="2"></circle>
    <path d="M12 7v4M8 15h.01M16 15h.01"></path>
  </svg>
);

export default function ChatAssistant() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const greeting = user?.name ? t("chat.greetingName", { name: user.name }) : t("chat.greeting");

  // A different user (login, logout, switch) gets their own saved conversation.
  useEffect(() => {
    setMessages([]);
    setHistoryLoaded(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen || !user || historyLoaded) return;
    getChatHistory()
      .then((saved) => setMessages(saved.map((m) => ({ role: m.role, text: m.text }))))
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [isOpen, user, historyLoaded]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    if (!user) {
      setMessages((prev) => [...prev, { role: "assistant", text: t("chat.loginRequired"), local: true }]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await sendMessageToAI(text, language);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: errorMessage(err, t("chat.error")), local: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch {
      // keep the current conversation if clearing failed
    }
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

  return (
    <>
      <button
        type="button"
        className={`chat-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="chat-window"
        aria-label={isOpen ? t("chat.close") : t("chat.open")}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
        <span className="chat-label">{isOpen ? t("common.close") : t("chat.open")}</span>
      </button>

      {isOpen && (
        <div className="chat-window" id="chat-window" role="dialog" aria-label={t("chat.title")}>
          <div className="chat-header">
            <div className="chat-header-avatar" aria-hidden="true"><BotIcon /></div>
            <div>
              <h3>{t("chat.title")}</h3>
              <div className="chat-status-block">
                <span className="pulse-dot" aria-hidden="true"></span>
                <span className="chat-status">{language === "hi" ? t("chat.replyLangHi") : t("chat.replyLang")}</span>
              </div>
            </div>
            {user && messages.length > 0 && (
              <button type="button" className="chat-lang-toggle" onClick={startNewConversation} title={t("chat.clear")} aria-label={t("chat.clear")}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
              </button>
            )}
          </div>

          <div className="chat-body" ref={bodyRef} aria-live="polite">
            <div className="bot-msg">
              <div className="msg-avatar" aria-hidden="true"><BotIcon /></div>
              <div className="msg-content">
                <p>{greeting}</p>
                {!user && <p><Link to="/login">{t("nav.login")}</Link></p>}
              </div>
            </div>
            {messages.map((msg, index) => (
              <div key={index} className={msg.role === "assistant" ? "bot-msg" : "user-msg"}>
                <div className="msg-avatar" aria-hidden="true">
                  {msg.role === "assistant" ? <BotIcon /> : <span className="user-avatar-initials">{(user?.name || user?.email || "?").substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className="msg-content"><MessageContent text={msg.text} /></div>
              </div>
            ))}
            {isLoading && (
              <div className="bot-msg typing-msg" role="status">
                <div className="msg-avatar" aria-hidden="true"><BotIcon /></div>
                <div className="msg-content"><div className="typing-indicator"><span></span><span></span><span></span></div></div>
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <label htmlFor="chat-input-field" className="visually-hidden">{t("chat.placeholder")}</label>
            <input
              id="chat-input-field"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              maxLength={1000}
              disabled={isLoading}
              autoComplete="off"
            />
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`chat-mic-btn ${isListening ? "listening" : ""}`}
                aria-label={isListening ? t("chat.micStop") : t("chat.micStart")}
                aria-pressed={isListening}
                title={isListening ? t("chat.micStop") : t("chat.micStart")}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <rect x="9" y="2" width="6" height="12" rx="3"></rect>
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v5"></path>
                </svg>
              </button>
            )}
            <button type="submit" disabled={isLoading || !input.trim()} className="chat-send-btn" aria-label={t("chat.send")}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
