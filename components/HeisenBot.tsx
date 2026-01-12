import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function HeisenBot() {
  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const [inputData, setInputData] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="heisenbot-container">
      {/* Header */}
      <header className="heisenbot-header">
        <div className="heisenbot-logo">
          <span className="scifi-icon">⚛</span>
        </div>
        <div>
          <h1 className="heisenbot-title">HeisenBot</h1>
          <p className="heisenbot-subtitle">Quantum-Entangled Assistant</p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="heisenbot-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="large-icon">🌌</div>
            <h2>Uncertainty Principle Detected</h2>
            <p>Ready to collapse wavefunctions into answers.</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`message-row ${m.role === "user" ? "user-row" : "bot-row"}`}
          >
            <div className={`message-bubble ${m.role}`}>
              {m.role === "assistant" && <div className="bot-avatar">⚛</div>}
              <div className="message-content">
                {m.parts.map((part, index) =>
                  part.type === 'text' ? <span key={index}><ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown></span> : null,
                )}
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="message-row bot-row">
            <div className="message-bubble assistant error-bubble">
              <div className="bot-avatar error-avatar">!</div>
              <div className="message-content">
                <div>Quantum fluctuation detected: {error.message}</div>
                <button
                  onClick={() => regenerate()}
                  className="retry-btn"
                  type="button"
                >
                  ↻ Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="message-row bot-row">
            <div className="message-bubble assistant">
              <div className="bot-avatar">⚛</div>
              <div className="typing-indicator">
                <span>•</span><span>•</span><span>•</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="heisenbot-input-area">
        <form onSubmit={e => {
          e.preventDefault();
          if (inputData.trim()) {
            sendMessage({ text: inputData });
            setInputData('');
          }
        }} className="input-form">
          <input
            className="heisenbot-input"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="Ask anything..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="send-btn">
            {isLoading ? "..." : "SEND"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .heisenbot-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 140px); /* Fit within layout */
          background: rgba(2, 6, 23, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 40px rgba(0,0,0,0.2);
        }

        .heisenbot-header {
          padding: 20px;
          background: rgba(2, 6, 23, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .scifi-icon {
          font-size: 2rem;
          color: var(--accent, #22d3ee);
          text-shadow: 0 0 10px var(--accent, #22d3ee);
        }

        .heisenbot-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .heisenbot-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted, #94a3b8);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .heisenbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #94a3b8);
          opacity: 0.7;
          text-align: center;
        }
        .large-icon { font-size: 4rem; margin-bottom: 1rem; }

        .message-row {
          display: flex;
        }
        .user-row { justify-content: flex-end; }
        .bot-row { justify-content: flex-start; }

        .message-bubble {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          display: flex;
          gap: 12px;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .user .message-bubble {
          /* Note: .message-bubble.user isn't nested in DOM structure properly if we do .user .message-bubble, 
             but we rendered <div className="message-bubble user"> */
        }

        .message-bubble.user {
          background: linear-gradient(135deg, var(--accent, #22d3ee), var(--accent-2, #818cf8));
          color: #000;
          font-weight: 500;
          border-bottom-right-radius: 4px;
        }

        .message-bubble.assistant {
          background: rgba(30, 41, 59, 0.6);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-bottom-left-radius: 4px;
        }

        .bot-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #000;
          color: var(--accent, #22d3ee);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
          border: 1px solid var(--accent, #22d3ee);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-bubble {
          border-color: #ef4444 !important;
          color: #fecaca !important;
          background: rgba(127, 29, 29, 0.4) !important;
        }

        .error-avatar {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: var(--text-muted, #94a3b8);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .heisenbot-input-area {
          padding: 20px;
          background: rgba(2, 6, 23, 0.9);
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }

        .input-form {
          display: flex;
          gap: 12px;
          background: rgba(15, 23, 42, 0.8);
          padding: 6px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          transition: border-color 0.2s;
        }
        .input-form:focus-within {
          border-color: var(--accent, #22d3ee);
          box-shadow: 0 0 15px rgba(34, 211, 238, 0.15);
        }

        .heisenbot-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0 16px;
          color: #fff;
          font-family: inherit;
          font-size: 1rem;
          outline: none;
        }

        .send-btn {
          background: var(--accent, #22d3ee);
          color: #000;
          border: none;
          padding: 0 20px;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .send-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .retry-btn {
          margin-top: 8px;
          padding: 4px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #fecaca;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .send-btn:disabled {
          background: #334155;
          color: #64748b;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );

}
