/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
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
    Sparkles,
    Brain,
    Settings,
    Moon,
    Sun
} from "lucide-react";
import { accountApi, agentApi, chatApi } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { useTheme } from 'next-themes';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

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
    const { theme, setTheme } = useTheme();
    const [accountConfig, setAccountConfig] = useState<AccountConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [chatting, setChatting] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Chat agent creation form
    const [chatAgentForm, setChatAgentForm] = useState({
        name: "Chat Assistant",
        prompt: ""
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
                chatAgentForm.name
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
        setIsTyping(true);

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
                    setIsTyping(false);
                },
                // onComplete callback
                () => {
                    setChatting(false);
                    setIsTyping(false);
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
            <TabsContent value="agent-chat" className="space-y-6 mt-6">
                <div className="flex items-center justify-center py-8 min-h-[200px]">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading chat configuration...</span>
                    </div>
                </div>
            </TabsContent>
        );
    }

    // Show CTA if no chat agent exists
    const needsChatAgent = !accountConfig?.chat_agent_id;
    // Show knowledge base CTA only on this page when no RAG/KB exists
    const needsKnowledgeBase = !accountConfig?.rag_id;

    if (needsKnowledgeBase) {
        return (
            <TabsContent value="agent-chat" className="space-y-6 mt-6">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <MessageCircle className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Agent Chat</h1>
                    </div>

                    <Card className="max-w-2xl mx-auto">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                <Alert className="h-6 w-6 text-orange-600" />
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
                                Go to Settings to Create Interview Agent
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        );
    }

    if (needsChatAgent) {
        return (
            <TabsContent value="agent-chat" className="space-y-6 mt-6">
                <div>
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
            </TabsContent>
        );
    }

    // Show chat interface if chat agent exists
    return (
        <TabsContent value="agent-chat" className="space-y-6 mt-6">
            <div className="h-[calc(100vh-6rem)] flex flex-col">
                {/* Chat Container */}
                <div className="flex-1 flex flex-col bg-background border rounded-lg overflow-hidden shadow-sm">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                                {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-4">
                                            <div className="flex flex-col items-center mb-8">
                                                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                                    <MessageCircle className="h-10 w-10 text-primary" />
                                                </div>
                                                <h2 className="text-2xl font-semibold mb-3 text-foreground">Welcome to Marketing Chat</h2>
                                                <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                                                    Ask questions about your marketing interviews, get insights from your knowledge base, or explore team insights.
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto w-full">
                                                <div className="p-4 bg-muted/30 rounded-xl border border-muted hover:bg-muted/50 transition-colors">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                                        <Bot className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <h3 className="font-medium mb-2 text-center">Ask Questions</h3>
                                                    <p className="text-sm text-muted-foreground text-center">Get answers about marketing strategies and insights</p>
                                                </div>
                                                
                                                <div className="p-4 bg-muted/30 rounded-xl border border-muted hover:bg-muted/50 transition-colors">
                                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                                        <Brain className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <h3 className="font-medium mb-2 text-center">Explore Data</h3>
                                                    <p className="text-sm text-muted-foreground text-center">Discover insights from interview data</p>
                                                </div>
                                                
                                                <div className="p-4 bg-muted/30 rounded-xl border border-muted hover:bg-muted/50 transition-colors">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                                                        <Sparkles className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                    <h3 className="font-medium mb-2 text-center">Get Insights</h3>
                                                    <p className="text-sm text-muted-foreground text-center">Analyze trends and patterns</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                    {/* Avatar */}
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                        {message.role === 'user' ? (
                                                            <User className="h-4 w-4" />
                                                        ) : (
                                                            <Bot className="h-4 w-4" />
                                                        )}
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`px-4 py-3 rounded-2xl ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                                                            {message.content ? (
                                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                                                        components={{
                                                                            code: ({ className, children, ...props }: any) => {
                                                                                const match = /language-(\w+)/.exec(className || '');
                                                                                const isInline = !className?.includes('language-');
                                                                                return !isInline && match ? (
                                                                                    <pre className="bg-muted/50 rounded-md p-3 overflow-x-auto">
                                                                                        <code className={className} {...props}>
                                                                                            {children}
                                                                                        </code>
                                                                                    </pre>
                                                                                ) : (
                                                                                    <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                                                                                        {children}
                                                                                    </code>
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        {message.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 py-1">
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" />
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Timestamp */}
                                                        <p className={`text-xs text-muted-foreground px-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
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
                    <div className="border-t bg-background/50 p-4">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <Input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Send a message..."
                                    disabled={chatting}
                                    className="min-h-[44px] resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <Button
                                onClick={sendMessage}
                                disabled={chatting || !newMessage.trim()}
                                size="sm"
                                className="h-11 px-4"
                            >
                                {chatting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>
    );
}
