import { APP_VERSION } from "@/version";
import { useState, useCallback, useRef, useEffect } from "react";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { trackEvent, posthog, captureException } from "@/lib/posthog";
import { startSpan, traceparent, SpanKind, SpanStatus } from "@/lib/otel";

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
const MAX_RETRIES = 3;

const AI_MODEL = "gemini-2.5-flash";
const AI_PROVIDER = "google";
const PROMPT_NAME = "hogshop-assistant-system";

declare global {
  interface Window {
    __HOGSHOP_EXTERNAL_LLM_TRACING__?: boolean;
  }
}

/** Read at emit time — bots may set the flag after mount. */
const isExternalTracing = () =>
  typeof window !== "undefined" && window.__HOGSHOP_EXTERNAL_LLM_TRACING__ === true;

const randId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempt = 0,
): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (TRANSIENT_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, init, attempt + 1);
    }
    return res;
  } catch (networkErr) {
    if (attempt < MAX_RETRIES) {
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, init, attempt + 1);
    }
    throw networkErr;
  }
}

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const conversationStartRef = useRef<number | null>(null);

  const promptVariant = useFeatureFlagVariantKey("assistant-prompt-version");
  const promptVersion = promptVariant === "v2" ? 2 : 1;
  const promptVersionRef = useRef(promptVersion);
  promptVersionRef.current = promptVersion;

  useEffect(() => {
    if (isOpen && !conversationIdRef.current) {
      conversationIdRef.current = randId("conv");
      conversationStartRef.current = Date.now();

      if (!isExternalTracing()) {
        trackEvent("chat_opened", {
          conversation_id: conversationIdRef.current,
          timestamp: new Date().toISOString(),
        });
        posthog.capture("$set", { $set: { ai_interaction: true } });
      }
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Conversation may have been reset; re-mint so events aren't orphaned.
    if (conversationIdRef.current === null) {
      conversationIdRef.current = randId("conv");
      conversationStartRef.current = Date.now();
      if (!isExternalTracing()) {
        trackEvent("chat_resumed", { conversation_id: conversationIdRef.current });
      }
    }

    const conversationId = conversationIdRef.current;
    const traceId = randId("trace");
    const spanId = randId("span");
    const turn = Math.floor(messages.length / 2) + 1;
    const promptProps = {
      $ai_prompt_name: PROMPT_NAME,
      $ai_prompt_version: promptVersionRef.current,
    };

    const userMsg: Message = { role: "user", content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    if (!isExternalTracing()) {
      trackEvent("chat_message_sent", {
        conversation_id: conversationId,
        trace_id: traceId,
        span_id: spanId,
        message_length: userMessage.length,
        message_number: turn,
      });
    }

    const generationStartTime = Date.now();

    const chatSpan = startSpan("chat.send_message", {
      kind: SpanKind.CLIENT,
      attributes: {
        "chat.message_length": userMessage.length,
        "chat.message_number": turn,
      },
    });

    const allMessages = [...messages, userMsg];
    const aiInput = allMessages.map(m => ({ role: m.role, content: m.content }));

    const emitTurnTrace = (reply: string, isError: boolean) => {
      if (isExternalTracing()) return;
      trackEvent("$ai_trace", {
        $ai_trace_id: traceId,
        $ai_session_id: conversationId,
        $ai_span_name: "hogshop-assistant",
        $ai_input_state: { message: userMessage },
        $ai_output_state: { reply },
        $ai_latency: (Date.now() - generationStartTime) / 1000,
        $ai_is_error: isError,
        ...promptProps,
        conversation_turn: turn,
      });
    };

    try {
      const response = await fetchWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            traceparent: traceparent(chatSpan),
            "x-app-version": APP_VERSION,
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

      const inputTokens = Math.ceil(allMessages.map(m => m.content).join('').length / 4);
      const outputTokens = Math.ceil(assistantContent.length / 4);

      setMessages(prev => [...prev, { role: "assistant", content: assistantContent, timestamp: Date.now() }]);

      if (!isExternalTracing()) {
        trackEvent("$ai_generation", {
          $ai_trace_id: traceId,
          $ai_session_id: conversationId,
          $ai_span_id: spanId,
          $ai_parent_id: traceId,
          $ai_span_name: "chat_response",
          $ai_model: AI_MODEL,
          $ai_provider: AI_PROVIDER,
          ...promptProps,
          $ai_input: aiInput,
          $ai_output_choices: [{ role: "assistant", content: assistantContent }],
          $ai_input_tokens: inputTokens,
          $ai_output_tokens: outputTokens,
          $ai_total_tokens: inputTokens + outputTokens,
          $ai_latency: latencyMs / 1000,
          $ai_stream: false,
          $ai_stop_reason: "stop",
          conversation_turn: turn,
          response_length: assistantContent.length,
        });
      }
      emitTurnTrace(assistantContent, false);

      chatSpan.setAttributes({
        "chat.input_tokens": inputTokens,
        "chat.output_tokens": outputTokens,
        "chat.latency_ms": latencyMs,
        "http.status_code": response.status,
      });
      chatSpan.end({ code: SpanStatus.OK });

    } catch (error) {
      console.error("Chat error:", error);

      const msg = error instanceof Error ? error.message : String(error);
      const statusMatch = /HTTP (\d+)/.exec(msg);
      const status = statusMatch ? Number(statusMatch[1]) : null;
      const fallback =
        status === 400
          ? "I can't process that request right now — could you try rephrasing?"
          : status === 401 || status === 403
            ? "I'm having trouble authenticating with the assistant. Please try again in a moment."
            : status && status >= 500
              ? "The assistant is overloaded right now. Please try again in a few seconds."
              : "Sorry, I encountered an error. Please try again.";

      if (!isExternalTracing()) {
        trackEvent("$ai_generation", {
          $ai_trace_id: traceId,
          $ai_session_id: conversationId,
          $ai_span_id: spanId,
          $ai_parent_id: traceId,
          $ai_span_name: "chat_response",
          $ai_model: AI_MODEL,
          $ai_provider: AI_PROVIDER,
          ...promptProps,
          $ai_is_error: true,
          $ai_error: error instanceof Error ? error.message : "Unknown error",
          ...(status !== null ? { $ai_http_status: status } : {}),
          $ai_input: aiInput,
          $ai_latency: (Date.now() - generationStartTime) / 1000,
          conversation_turn: turn,
        });
      }
      emitTurnTrace(fallback, true);

      trackEvent("ai_error", {
        trace_id: traceId,
        span_id: spanId,
        error_message: error instanceof Error ? error.message : "Unknown error",
        error_type: "chat_generation_failed",
      });

      captureException(
        error instanceof Error ? error : new Error(String(error)),
        "chat_request_failed",
        {
          trace_id: traceId,
          span_id: spanId,
          http_status:
            error instanceof Error && /HTTP (\d+)/.exec(error.message)?.[1]
              ? Number(/HTTP (\d+)/.exec(error.message)![1])
              : undefined,
          message_number: turn,
        }
      );

      chatSpan.recordException(error);
      chatSpan.end({ code: SpanStatus.ERROR });

      // Even with the retry/backoff above, a residual fraction of generations still
      // fail terminally and surface a "Sorry, I encountered an error" message.
      // Repeated failures within one session are a known frustration point — see the
      // chat_request_failed exceptions in error tracking for volume.
      setMessages(prev => [...prev, {
        role: "assistant",
        content: fallback,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const closeChat = useCallback(() => {
    if (isOpen && conversationIdRef.current && conversationStartRef.current) {
      const conversationDuration = Date.now() - conversationStartRef.current;

      if (!isExternalTracing()) {
        trackEvent("chat_closed", {
          conversation_id: conversationIdRef.current,
          duration_seconds: Math.floor(conversationDuration / 1000),
          messages_count: messages.length,
        });
      }

      conversationIdRef.current = null;
      conversationStartRef.current = null;
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
