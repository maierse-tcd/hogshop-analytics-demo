import { useState, useCallback, useRef, useEffect } from "react";
import { trackEvent, posthog } from "@/lib/posthog";

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

  // Initialize trace ID and track chat opened
  useEffect(() => {
    if (isOpen && !traceIdRef.current) {
      traceIdRef.current = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversationStartRef.current = Date.now();
      
      trackEvent("chat_opened", {
        trace_id: traceIdRef.current,
        timestamp: new Date().toISOString(),
      });
      
      // Tag session replay
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

    // Generate unique span ID for this generation
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Track user message
    trackEvent("chat_message_sent", {
      trace_id: traceIdRef.current,
      span_id: spanId,
      message_length: userMessage.length,
      message_number: Math.floor(messages.length / 2) + 1,
    });

    let assistantContent = "";
    let actualInputTokens = 0;
    let actualOutputTokens = 0;
    let actualTotalTokens = 0;
    let actualCost = 0;
    const generationStartTime = Date.now();

    try {
      const allMessages = [...messages, userMsg];
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            // Capture actual usage data from the final chunk
            if (parsed.usage) {
              actualInputTokens = parsed.usage.prompt_tokens || 0;
              actualOutputTokens = parsed.usage.completion_tokens || 0;
              actualTotalTokens = parsed.usage.total_tokens || 0;
              actualCost = parsed.usage.cost || 0;
              
              // Update running totals
              tokenCountRef.current.input += actualInputTokens;
              tokenCountRef.current.output += actualOutputTokens;
            }
            
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent, timestamp: Date.now() }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) assistantContent += content;
          } catch { /* ignore */ }
        }
      }

      const generationEndTime = Date.now();
      const latencyMs = generationEndTime - generationStartTime;

      // Build conversation history for PostHog (full context)
      const conversationHistory = [...messages, userMsg].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Track AI generation with PostHog LLM analytics (proper format)
      trackEvent("$ai_generation", {
        // Core properties
        $ai_trace_id: traceIdRef.current,
        $ai_span_id: spanId,
        $ai_span_name: "chat_response",
        $ai_model: "google/gemini-2.5-flash",
        $ai_provider: "google",
        
        // Input/Output - properly formatted as PostHog expects
        $ai_input: conversationHistory, // Full conversation context
        $ai_output_choices: [{ 
          role: "assistant", 
          content: assistantContent 
        }],
        
        // Token counts (use actual if available, fallback to estimates)
        $ai_input_tokens: actualInputTokens || Math.ceil(conversationHistory.map(m => m.content).join('').length / 4),
        $ai_output_tokens: actualOutputTokens || Math.ceil(assistantContent.length / 4),
        $ai_total_tokens: actualTotalTokens || (actualInputTokens + actualOutputTokens),
        
        // Performance
        $ai_latency: latencyMs / 1000, // Convert to seconds
        
        // Cost (if available from API)
        ...(actualCost > 0 && { $ai_total_cost_usd: actualCost }),
        
        // Model parameters
        $ai_stream: true,
        
        // Custom properties
        conversation_turn: Math.floor(messages.length / 2) + 1,
        response_length: assistantContent.length,
      });

    } catch (error) {
      console.error("Chat error:", error);
      
      // Track AI error with proper PostHog format
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
      
      // Also track custom error event
      trackEvent("ai_error", {
        trace_id: traceIdRef.current,
        span_id: spanId,
        error_message: error instanceof Error ? error.message : "Unknown error",
        error_type: "chat_generation_failed",
      });

      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const closeChat = useCallback(() => {
    if (isOpen && traceIdRef.current && conversationStartRef.current) {
      const conversationDuration = Date.now() - conversationStartRef.current;
      
      // Track AI trace (full conversation)
      trackEvent("$ai_trace", {
        $ai_trace_id: traceIdRef.current,
        $ai_total_input_tokens: tokenCountRef.current.input,
        $ai_total_output_tokens: tokenCountRef.current.output,
        $ai_total_tokens: tokenCountRef.current.input + tokenCountRef.current.output,
        conversation_duration_seconds: Math.floor(conversationDuration / 1000),
        total_messages: messages.length,
        total_user_messages: Math.ceil(messages.length / 2),
      });

      // Track chat closed
      trackEvent("chat_closed", {
        trace_id: traceIdRef.current,
        duration_seconds: Math.floor(conversationDuration / 1000),
        messages_count: messages.length,
      });

      // Reset for next conversation
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
