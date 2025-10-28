import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { trackEvent } from "@/lib/posthog";
import { useEffect as useEffectOnce } from "react";

export const AIChatWidget = () => {
  const { messages, isLoading, isOpen, sendMessage, openChat, closeChat } = useAIChat();
  const [input, setInput] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const proactivePrompt = useFeatureFlagEnabled("ai-chat-proactive-prompt");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show proactive prompt after 3 seconds (experiment)
  useEffectOnce(() => {
    if (proactivePrompt && !isOpen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        trackEvent("ai_proactive_prompt_shown", {
          variant: "tooltip",
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [proactivePrompt, isOpen]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleOpenChat = () => {
    openChat();
    setShowTooltip(false);
    
    if (proactivePrompt) {
      trackEvent("chat_opened_from_proactive_prompt", {
        variant: "tooltip",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {showTooltip && proactivePrompt && (
          <div className="absolute bottom-16 right-0 bg-primary text-primary-foreground p-3 rounded-lg shadow-lg max-w-xs mb-2 animate-in slide-in-from-bottom-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Need help finding the perfect hedgehog gift? 🦔
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setShowTooltip(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Button
          onClick={handleOpenChat}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
      <Card className="shadow-2xl border-2">
        <CardHeader className="pb-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Hedgehog Care Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-3 text-primary" />
                <p className="text-sm font-medium mb-1">Hi! I'm your Hedgehog Care Assistant 🦔</p>
                <p className="text-xs">Ask me about products, care tips, or subscriptions!</p>
              </div>
            )}
            
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-3">
          <div className="flex gap-2 w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about hedgehog care..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
