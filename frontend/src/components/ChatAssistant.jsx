import React, { useState, useEffect, useRef } from "react";
import { sendMessageToAI } from "../services/api";

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm CropMind AI. Ask me about crops, weather, irrigation, or market prices in India."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const getUserEmail = () => {
    const token = localStorage.getItem("cropmind_token");
    if (!token) return "";
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload).email || "";
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  useEffect(() => {
    const updateGreeting = () => {
      const email = getUserEmail();
      setMessages((prev) => {
        if (prev.length <= 1) {
          return [
            {
              sender: "bot",
              text: email 
                ? `Hello, ${email}! I'm CropMind AI. Ask me about crops, weather, irrigation, or market prices in India.`
                : "Hello! I'm CropMind AI. Ask me about crops, weather, irrigation, or market prices in India."
            }
          ];
        }
        return prev;
      });
    };

    updateGreeting();
    window.addEventListener("auth-change", updateGreeting);
    return () => window.removeEventListener("auth-change", updateGreeting);
  }, []);

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

    const userText = input;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await sendMessageToAI(userText);
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Chat message error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, CropMind AI is currently having trouble reaching the server. Please check your backend connection." }
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
                    getUserEmail() ? (
                      <span className="user-avatar-initials" title={getUserEmail()}>
                        {getUserEmail().substring(0, 2).toUpperCase()}
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
              placeholder="Ask about crops, soils, weather..."
              disabled={isLoading}
            />
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
