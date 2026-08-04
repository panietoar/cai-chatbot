"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import SafeActionLink from "./SafeActionLink";
import type {
  ChatTurn,
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
} from "../lib/chat/contracts";
import { CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_HISTORY_TURNS } from "../lib/chat/contracts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ label: string; url: string }>;
}

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // Allow typing but warn/prevent at limit
    if (text.length <= CHAT_MAX_MESSAGE_LENGTH) {
      setInput(text);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitForm();
  };

  const handleSubmitForm = async () => {
    if (!input.trim()) {
      setError("Please enter a message.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare request
      const chatRequest: ChatRequest = {
        message: input,
        history: history.slice(-CHAT_MAX_HISTORY_TURNS),
      };

      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatRequest),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        const errorData = data as ChatErrorResponse;
        const errorMessage =
          errorData.error?.message || "An unexpected error occurred. Please try again.";
        setError(errorMessage);
        return;
      }

      // Handle success response
      const successData = data as ChatSuccessResponse;
      const newTurn: ChatTurn = {
        userMessage: input,
        assistantMessage: successData.message,
        actions: successData.actions,
      };

      // Update history
      setHistory((prev) => [...prev, newTurn]);
      setInput("");

      // Clear error if any
      setError(null);
    } catch (err) {
      // Network error or parsing error
      const errorMessage = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Focus back on textarea for keyboard users
      textareaRef.current?.focus();
    }
  };

  const messages: ChatMessage[] = [];
  history.forEach((turn) => {
    messages.push({ role: "user", content: turn.userMessage });
    messages.push({ 
      role: "assistant", 
      content: turn.assistantMessage,
      actions: turn.actions,
    });
  });

  const charCount = input.length;

  return (
    <main className="chat-interface">
      {/* Purpose and Limitations */}
      <section className="chat-header">
        <h1>Cadre AI Support Assistant</h1>
        <p className="chat-purpose">
          Ask questions about Cadre&apos;s AI services, industries we serve, our AI Maturity Index,
          LLM selection approach, data security, and how to book a strategy call.
        </p>
        <p className="chat-limitations">
          <strong>Limitations:</strong> This assistant cannot answer private account questions,
          book meetings, authenticate users, or provide pricing or implementation guarantees.
        </p>
      </section>

      {/* Message History */}
      <section
        className="chat-history"
        role="log"
        aria-label="Conversation history"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <p className="chat-empty">Start a conversation by typing a question below.</p>
        )}
        {messages.map((msg, idx) => (
          <article
            key={idx}
            className={`message message-${msg.role}`}
            role="article"
            aria-label={`${msg.role === "user" ? "Your" : "Assistant"} message`}
          >
            <div className="message-label">{msg.role === "user" ? "You" : "Cadre"}</div>
            <div className="message-content">
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
              <div className="message-actions" aria-label="Available actions">
                {msg.actions.map((action, actionIdx) => (
                  <SafeActionLink key={actionIdx} label={action.label} url={action.url} />
                ))}
              </div>
            )}
          </article>
        ))}
        {loading && (
          <div className="message message-loading" role="status" aria-live="assertive">
            <div className="loading-indicator">
              <span className="loading-spinner"></span>
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Error Display */}
      {error && (
        <div
          className="chat-error"
          role="alert"
          aria-live="assertive"
          aria-label="Error message"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Input Form */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here... (Shift+Enter for newline)"
            className="chat-textarea"
            disabled={loading}
            aria-label="Message input"
            aria-describedby="char-count"
          />
          <div className="char-counter" id="char-count">
            <span className={charCount > CHAT_MAX_MESSAGE_LENGTH ? "char-limit-exceeded" : ""}>
              {charCount} / {CHAT_MAX_MESSAGE_LENGTH}
            </span>
            {charCount > CHAT_MAX_MESSAGE_LENGTH * 0.9 && charCount <= CHAT_MAX_MESSAGE_LENGTH && (
              <span className="char-warning">Approaching limit</span>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="chat-submit"
          disabled={loading || !input.trim()}
          aria-busy={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
