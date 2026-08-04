import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, RotateCcw } from "lucide-react";

export default function TestAI() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [currentStage, setCurrentStage] = useState<"intro" | "price_ask" | "needs_offer" | "not_interested">("intro");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const testAIMutation = trpc.system.testAI.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // Build transcript from conversation history
      const transcript = messages
        .map((m) => `${m.role === "user" ? "Seller" : "Agent"}: ${m.content}`)
        .join("\n");

      // Call testAI mutation
      const result = await testAIMutation.mutateAsync({
        currentStage,
        latestMessage: userMessage,
        transcript,
      });

      // Add AI response
      setMessages((prev) => [...prev, { role: "ai", content: result.reply }]);
      setCurrentStage(result.next_stage as any);
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Error: Could not generate response. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentStage("intro");
    setInput("");
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "intro":
        return "bg-blue-100 text-blue-800";
      case "price_ask":
        return "bg-purple-100 text-purple-800";
      case "needs_offer":
        return "bg-green-100 text-green-800";
      case "not_interested":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Test AI Agent
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate seller responses to test how the AI responds
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-card rounded-lg border">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Start a conversation by typing a seller response below</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a seller response..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={loading}
              />
              <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
            <Button onClick={handleReset} variant="outline" className="w-full" disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Conversation
            </Button>
          </div>
        </div>

        {/* Sidebar - Current Stage & Prompts */}
        <div className="w-80 space-y-4">
          {/* Current Stage */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Current Stage</h3>
            <Badge className={`${getStageColor(currentStage)} text-base px-3 py-1`}>
              {currentStage.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </Card>

          {/* Stage Description */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">Stage Description</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentStage === "intro" &&
                "AI is asking if the seller is interested in selling. Listen for yes/no or questions."}
              {currentStage === "price_ask" &&
                "AI has asked for the seller's price. Waiting for a price, offer request, or decline."}
              {currentStage === "needs_offer" &&
                "Seller is ready for an offer. VA will take over from here."}
              {currentStage === "not_interested" &&
                "Seller declined. Conversation is closed."}
            </p>
          </Card>

          {/* Tips */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold mb-2 text-blue-900">Test Scenarios</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Try saying "yes" or "maybe"</li>
              <li>• Give a price like "$150,000"</li>
              <li>• Say "make me an offer"</li>
              <li>• Mention hardship (death, foreclosure)</li>
              <li>• Say "no" or "stop texting"</li>
              <li>• Ask a clarifying question</li>
            </ul>
          </Card>

          {/* Message Count */}
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">
              Messages: <span className="font-semibold">{messages.length}</span>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
