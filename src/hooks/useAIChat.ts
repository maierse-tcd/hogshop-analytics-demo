import { useState, useCallback, useRef, useEffect } from "react";
import { trackEvent, posthog } from "@/lib/posthog";
import { startSpan, traceparent, SpanKind, SpanStatus } from "@/lib/otel";

type Message = { 
  role: "user" | "assistant"; 
  content: string;
  timestamp?: number;
};

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const traceIdRef = useRef<string | null>(null);
  const conversationStartRef = useRef<number | null>(null);
  const tokenCountRef = useRef({ input: 0, output: 0 });

  useEffect(() => {
    if (isOpen && !traceIdRef.current) {
      traceIdRef.current = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversationStartRef.current = Date.now();
      
      trackEvent("chat_opened", {
        trace_id: traceIdRef.current,
        timestamp: new Date().toISOString(),
      });
      
      posthog.capture('$set', {
        $set: { ai_interaction: true }
      });
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const userMsg: Message = { 
      role: "user", 
      content: userMessage,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    trackEvent("chat_message_sent", {
      trace_id: traceIdRef.current,
      span_id: spanId,
      message_length: userMessage.length,
      message_number: Math.floor(messages.length / 2) + 1,
    });

    const generationStartTime = Date.now();

    // Start a browser-side root span for this chat round-trip. The traceparent
    // header propagates to the ai-chat edge function so PostHog stitches
    // browser → edge → "Gemini" spans into one distributed trace.
    const chatSpan = startSpan("chat.send_message", {
      kind: SpanKind.CLIENT,
      attributes: {
        "chat.message_length": userMessage.length,
        "chat.message_number": Math.floor(messages.length / 2) + 1,
      },
    });

    try {
      const allMessages = [...messages, userMsg];
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            traceparent: traceparent(chatSpan),
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.reply || "Sorry, I didn't understand that.";

      const latencyMs = Date.now() - generationStartTime;

      // Simulate realistic token counts
      const inputTokens = Math.ceil(allMessages.map(m => m.content).join('').length / 4);
      const outputTokens = Math.ceil(assistantContent.length / 4);
      tokenCountRef.current.input += inputTokens;
      tokenCountRef.current.output += outputTokens;

      setMessages(prev => [...prev, { role: "assistant", content: assistantContent, timestamp: Date.now() }]);

      // Track AI generation with PostHog LLM analytics
      const conversationHistory = allMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      trackEvent("$ai_generation", {
        $ai_trace_id: traceIdRef.current,
        $ai_span_id: spanId,
        $ai_span_name: "chat_response",
        $ai_model: "google/gemini-2.5-flash",
        $ai_provider: "google",
        $ai_input: conversationHistory,
        $ai_output: assistantContent,
        $ai_output_choices: [assistantContent],
        $ai_input_tokens: inputTokens,
        $ai_output_tokens: outputTokens,
        $ai_total_tokens: inputTokens + outputTokens,
        $ai_latency: latencyMs / 1000,
        $ai_stream: false,
        conversation_turn: Math.floor(messages.length / 2) + 1,
        response_length: assistantContent.length,
      });

      chatSpan.setAttributes({
        "chat.input_tokens": inputTokens,
        "chat.output_tokens": outputTokens,
        "chat.latency_ms": latencyMs,
        "http.status_code": response.status,
      });
      chatSpan.end({ code: SpanStatus.OK });

    } catch (error) {
      console.error("Chat error:", error);

      trackEvent("$ai_generation", {
        $ai_trace_id: traceIdRef.current,
        $ai_span_id: spanId,
        $ai_model: "google/gemini-2.5-flash",
        $ai_provider: "google",
        $ai_is_error: true,
        $ai_error: error instanceof Error ? error.message : "Unknown error",
        $ai_input: [...messages, userMsg].map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      trackEvent("ai_error", {
        trace_id: traceIdRef.current,
        span_id: spanId,
        error_message: error instanceof Error ? error.message : "Unknown error",
        error_type: "chat_generation_failed",
      });

      chatSpan.recordException(error);
      chatSpan.end();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const closeChat = useCallback(() => {
    if (isOpen && traceIdRef.current && conversationStartRef.current) {
      const conversationDuration = Date.now() - conversationStartRef.current;
      
      trackEvent("$ai_trace", {
        $ai_trace_id: traceIdRef.current,
        $ai_total_input_tokens: tokenCountRef.current.input,
        $ai_total_output_tokens: tokenCountRef.current.output,
        $ai_total_tokens: tokenCountRef.current.input + tokenCountRef.current.output,
        conversation_duration_seconds: Math.floor(conversationDuration / 1000),
        total_messages: messages.length,
        total_user_messages: Math.ceil(messages.length / 2),
      });

      trackEvent("chat_closed", {
        trace_id: traceIdRef.current,
        duration_seconds: Math.floor(conversationDuration / 1000),
        messages_count: messages.length,
      });

      traceIdRef.current = null;
      conversationStartRef.current = null;
      tokenCountRef.current = { input: 0, output: 0 };
    }
    
    setIsOpen(false);
  }, [isOpen, messages.length]);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    openChat,
    closeChat,
  };
};
