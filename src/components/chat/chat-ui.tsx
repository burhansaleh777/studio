"use client";

import { useState, useRef, useEffect } from "react";
import { insuranceFAQChatbot, type InsuranceFAQChatbotInput, type InsuranceFAQChatbotOutput } from "@/ai/flows/insurance-faq-chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export function ChatUi() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  
  // Initial greeting from bot
  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        text: "Hello! I'm the Bima Hub AI assistant. How can I help you with your insurance questions today?",
        sender: "bot",
        timestamp: new Date(),
      }
    ]);
  }, []);


  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const input: InsuranceFAQChatbotInput = { question: userMessage.text };
      const result: InsuranceFAQChatbotOutput = await insuranceFAQChatbot(input);
      
      const botMessage: Message = {
        id: crypto.randomUUID(),
        text: result.answer,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error calling chatbot:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        text: "Sorry, I encountered an error. Please try again later or contact human support.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const commonQuestions = [
    "How do I file a claim?",
    "What does my policy cover?",
    "How can I renew my insurance?",
    "Where can I find my policy documents?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    // Optionally, auto-send the message
    // handleSendMessage(); // Be cautious with auto-sending UX
  };


  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-4rem)] bg-card shadow-lg rounded-lg overflow-hidden"> {/* Adjust height based on header/nav */}
      <header className="p-4 border-b flex items-center space-x-3 bg-primary/5">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-semibold text-primary">Bima Hub AI Support</h2>
      </header>

      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end space-x-2 max-w-[85%]",
              msg.sender === "user" ? "ml-auto flex-row-reverse space-x-reverse" : ""
            )}
          >
            <Avatar className="h-8 w-8 self-start">
               {msg.sender === 'bot' ? (
                 <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot />
                 </AvatarFallback>
               ) : (
                 <AvatarFallback>
                    <User />
                 </AvatarFallback>
               )}
            </Avatar>
            <div
              className={cn(
                "p-3 rounded-xl shadow",
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className="text-xs mt-1 opacity-70 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-end space-x-2">
             <Avatar className="h-8 w-8">
               <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot />
               </AvatarFallback>
             </Avatar>
            <div className="p-3 rounded-lg bg-muted shadow">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t bg-background">
        <div className="flex flex-wrap gap-2 mb-3">
            {commonQuestions.map((q, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => handleQuickQuestion(q)} className="text-xs">
                {q}
              </Button>
            ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <Input
            type="text"
            placeholder="Type your question here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || inputValue.trim() === ""} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          For complex issues, please <a href="https://wa.me/YOUR_WHATSAPP_NUMBER" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">chat with a live agent via WhatsApp</a>.
        </p>
      </div>
    </div>
  );
}
