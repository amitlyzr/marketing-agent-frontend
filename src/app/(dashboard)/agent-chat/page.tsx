/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { 
    MessageCircle, 
    Bot, 
    User, 
    Send, 
    Loader2, 
    AlertCircle, 
    Plus,
    Sparkles,
    Brain
} from "lucide-react";
import { accountApi, agentApi, chatApi } from "@/lib/api";
import { toast } from "sonner";

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface AccountConfig {
    user_id: string;
    api_key: string;
    agent_id?: string;
    rag_id?: string;
    chat_agent_id?: string;
    agent_prompt?: string;
    created_at?: string;
    updated_at?: string;
}

export default function AgentChatPage() {
    const { userId, token } = useAuth();
    const [accountConfig, setAccountConfig] = useState<AccountConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [chatting, setChatting] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Chat agent creation form
    const [chatAgentForm, setChatAgentForm] = useState({
        name: "Chat Assistant",
        prompt: `You are a helpful AI chat assistant with access to a knowledge base of interview conversations and insights.

Your role is to:

1. **Answer Questions**: Provide helpful answers based on the knowledge base and general AI capabilities.

2. **Analyze Interviews**: Help analyze interview data, patterns, and insights from the knowledge base.

3. **Provide Recommendations**: Offer suggestions and recommendations based on interview history and best practices.

4. **Be Conversational**: Maintain a friendly, professional, and helpful tone in all interactions.

5. **Use Knowledge Base**: When relevant, reference information from the interview knowledge base to provide more accurate and contextual responses.

6. **Stay Professional**: Keep conversations professional while being approachable and helpful.

Remember to be concise, accurate, and helpful in your responses.`
    });

    // Load account configuration
    const loadAccountConfig = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const account = await accountApi.getAccount(userId);
            setAccountConfig(account);
        } catch (error) {
            console.error('Error loading account config:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadAccountConfig();
    }, [loadAccountConfig]);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Create chat agent
    const handleCreateChatAgent = async () => {
        if (!userId || !token) return;

        try {
            setCreating(true);
            
            await agentApi.createChatAgent(
                userId,
                chatAgentForm.prompt,
                token,
                chatAgentForm.name,
                "AI chat assistant with knowledge base access"
            );
            
            toast.success('Chat agent created and linked with knowledge base successfully!');
            
            await loadAccountConfig();
            
        } catch (error: any) {
            console.error('Error creating chat agent:', error);
            toast.error(error.message || 'Failed to create chat agent');
        } finally {
            setCreating(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !accountConfig?.chat_agent_id || chatting || !userId) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: newMessage.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentMessage = newMessage.trim();
        setNewMessage("");
        setChatting(true);

        // Create assistant message placeholder
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: "",
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Track accumulated content for streaming
        let accumulatedContent = "";

        try {
            // Send to chat API using streaming
            await chatApi.sendMessageStream(
                {
                    user_id: userId,
                    agent_id: accountConfig.chat_agent_id,
                    session_id: `chat_${userId}_${Date.now()}`,
                    message: currentMessage
                },
                // onMessage callback - accumulate and update the assistant message content
                (content: string) => {
                    accumulatedContent += content;
                    setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessageId 
                            ? { ...msg, content: accumulatedContent }
                            : msg
                    ));
                },
                // onError callback
                (error: string) => {
                    console.error('Error in streaming:', error);
                    setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessageId 
                            ? { ...msg, content: "Sorry, I encountered an error processing your request." }
                            : msg
                    ));
                    toast.error('Failed to get response');
                },
                // onComplete callback
                () => {
                    setChatting(false);
                }
            );

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.slice(0, -1)); // Remove assistant message on error
            toast.error('Failed to send message');
            setChatting(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading chat configuration...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show CTA if no chat agent exists
    const needsChatAgent = !accountConfig?.chat_agent_id;
    const needsKnowledgeBase = !accountConfig?.rag_id;

    if (needsKnowledgeBase) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">Agent Chat</h1>
                </div>

                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-orange-600" />
                        </div>
                        <CardTitle>Knowledge Base Required</CardTitle>
                        <CardDescription>
                            You need to create an interview agent and knowledge base first before you can create a chat agent.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button 
                            onClick={() => window.location.href = '/dashboard?tab=settings'}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Go to Settings to Create Interview Agent
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (needsChatAgent) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">Agent Chat</h1>
                </div>

                <Card className="max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <Bot className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle>Create Your Chat Agent</CardTitle>
                        <CardDescription>
                            Create a chat agent that will be linked with your existing knowledge base to answer questions and provide insights.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert>
                            <Brain className="h-4 w-4" />
                            <AlertDescription>
                                Your chat agent will have access to interview data from your knowledge base (KB ID: {accountConfig?.rag_id}).
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="agent-name">Agent Name</Label>
                                <Input
                                    id="agent-name"
                                    value={chatAgentForm.name}
                                    onChange={(e) => setChatAgentForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter agent name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="agent-prompt">Agent Instructions</Label>
                                <Textarea
                                    id="agent-prompt"
                                    value={chatAgentForm.prompt}
                                    onChange={(e) => setChatAgentForm(prev => ({ ...prev, prompt: e.target.value }))}
                                    placeholder="Enter agent instructions and behavior"
                                    rows={12}
                                    className="resize-none"
                                />
                            </div>

                            <Button
                                onClick={handleCreateChatAgent}
                                disabled={creating || !chatAgentForm.name.trim() || !chatAgentForm.prompt.trim()}
                                className="w-full"
                                size="lg"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Creating Chat Agent...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Create Chat Agent
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show chat interface if chat agent exists
    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)]">
            <div className="flex items-center gap-2 mb-6">
                <MessageCircle className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Agent Chat</h1>
                <div className="ml-auto text-sm text-gray-600">
                    Chat Agent ID: {accountConfig?.chat_agent_id}
                </div>
            </div>

            <Card className="h-[calc(100%-5rem)] flex flex-col">
                <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Chat with your AI Assistant
                    </CardTitle>
                    <CardDescription>
                        Your chat agent has access to interview knowledge base and can help answer questions.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-12">
                                        <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                        <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                                        <p>Ask questions about your interviews or get insights from your knowledge base.</p>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`flex items-start space-x-3 max-w-[80%] ${
                                                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                                }`}
                                            >
                                                {/* Avatar */}
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        message.role === 'user'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {message.role === 'user' ? (
                                                        <User className="h-5 w-5" />
                                                    ) : (
                                                        <Bot className="h-5 w-5" />
                                                    )}
                                                </div>
                                                
                                                {/* Message Content */}
                                                <div className="flex flex-col space-y-1">
                                                    <div
                                                        className={`px-4 py-3 rounded-2xl ${
                                                            message.role === 'user'
                                                                ? 'bg-blue-600 text-white rounded-br-md'
                                                                : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                                        }`}
                                                    >
                                                        {message.content ? (
                                                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                                                                {message.content}
                                                            </p>
                                                        ) : (
                                                            <div className="flex items-center space-x-1 py-1">
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Timestamp */}
                                                    <p className={`text-xs text-gray-500 px-1 ${
                                                        message.role === 'user' ? 'text-right' : 'text-left'
                                                    }`}>
                                                        {new Date(message.timestamp).toLocaleTimeString([], { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Input Area */}
                    <div className="border-t bg-gray-50 p-4 flex-shrink-0">
                        <div className="flex space-x-3">
                            <div className="flex-1">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    disabled={chatting}
                                    className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <Button
                                onClick={sendMessage}
                                disabled={chatting || !newMessage.trim()}
                                className="bg-blue-600 hover:bg-blue-700 px-6"
                            >
                                {chatting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
