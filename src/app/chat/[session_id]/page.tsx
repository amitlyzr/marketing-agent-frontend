/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertCircle, MessageCircle, Send, User, Bot, Settings, Moon, Sun } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { useTheme } from 'next-themes';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface ChatSession {
    user_id: string;
    email: string;
    agent_id: string;
    message_count: number;
    session_status: string;
}

export default function ChatPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Extract session_id from params (decode URL encoding) and agent_id from query
    const rawSessionId = decodeURIComponent(params.session_id as string);
    // Clean session_id by removing any query parameters that might have gotten mixed in
    const session_id = rawSessionId.split('&')[0].split('?')[0];
    
    // Extract agent_id from the malformed URL (since it's in the path instead of query)
    let agent_id = searchParams.get('agent_id');
    if (!agent_id && rawSessionId.includes('&agent_id=')) {
        // Extract agent_id from the path parameter where it was incorrectly included
        const agentIdMatch = rawSessionId.match(/&agent_id=([^&]*)/);
        agent_id = agentIdMatch ? agentIdMatch[1] : null;
    }
    // Fallback to manual URL parsing
    if (!agent_id && typeof window !== 'undefined') {
        agent_id = new URLSearchParams(window.location.search).get('agent_id');
    }

    // Debug logging
    useEffect(() => {
        console.log('=== SESSION DEBUG INFO ===');
        console.log('Raw params.session_id:', params.session_id);
        console.log('Raw session_id (decoded):', rawSessionId);
        console.log('Final session_id:', session_id);
        console.log('Agent_id from query:', agent_id);
        console.log('========================');
    }, [agent_id, rawSessionId, session_id]);

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Session state
    const [session, setSession] = useState<ChatSession | null>(null);
    const [canComplete, setCanComplete] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Parse session_id to get user_id and email
    const parseSessionId = (sessionId: string) => {
        const lastPlusIndex = sessionId.lastIndexOf('+');
        const parts: string[] = [
                sessionId.substring(0, lastPlusIndex),
                sessionId.substring(lastPlusIndex + 1)
            ];
        return {
            user_id: parts[0],
            email: parts[1],
            session_id: `${parts[0]}+${parts[1]}`
        };
    };

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history from backend
    const loadChatHistory = useCallback(async () => {
        try {
            if (!session_id) {
                throw new Error('No session_id found in URL');
            }
            
            // Parse session_id to validate format
            parseSessionId(session_id);

            let url = `${BACKEND_API_URL}/chat/history/${session_id}`;
            if (agent_id) {
                url += `?agent_id=${agent_id}`;
            }
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const loadedMessages = data.messages || [];
                
                // Simply load messages without any predefined content
                setMessages(loadedMessages);
                
                setSession(data.session || {
                    user_id: parseSessionId(session_id).user_id,
                    email: parseSessionId(session_id).email,
                    agent_id: agent_id || "",
                    message_count: data.message_count || 0,
                    session_status: "active"
                });
                setCanComplete((data.session?.message_count || data.message_count || 0) >= 5);
                setCompleted(data.session?.session_status === 'completed' || data.session?.session_status === 'processed');
            } else {
                // Create new session if chat history doesn't exist
                const sessionData = parseSessionId(session_id);
                setSession({
                    user_id: sessionData.user_id,
                    email: sessionData.email,
                    agent_id: agent_id || "",
                    message_count: 0,
                    session_status: "active"
                });
                
                // Start with empty messages - no predefined content
                setMessages([]);
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Failed to load chat history:', err);
        } finally {
            setLoading(false);
        }
    }, [session_id, agent_id]);

    // Send message to interview endpoint (streaming with message count)
    const sendMessage = async () => {
        if (!newMessage.trim() || sending || !session_id) return;

        const sessionData = parseSessionId(session_id);
        
        setSending(true);
        setError(null);

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: newMessage.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentMessage = newMessage.trim();
        setNewMessage("");

        // Set a timeout as safety measure to reset sending state
        const timeoutId = setTimeout(() => {
            console.warn('Stream timeout - forcing reset of sending state');
            setSending(false);
        }, 30000); // 30 second timeout

        try {
            console.log('=== SENDING MESSAGE DEBUG ===');
            console.log('sessionData.user_id:', sessionData.user_id);
            console.log('agent_id:', agent_id);
            console.log('session_id being sent:', session_id);
            console.log('message:', currentMessage);
            console.log('============================');
            
            // Use single chat agent endpoint for all messages - keep it simple
            const response = await fetch(`${BACKEND_API_URL}/chat/agent/send/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: sessionData.user_id,
                    agent_id: agent_id || "", // This will be ignored - backend will use chat_agent_id from user account
                    session_id: session_id,
                    message: currentMessage
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Create assistant message placeholder
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "",
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Read streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No reader available');
            }

            let fullResponse = "";
            let streamCompleted = false;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            
                            if (data === '[DONE]') {
                                console.log('Stream completed: [DONE] received');
                                streamCompleted = true;
                                break;
                            }

                            // Handle both JSON and plain text responses
                            try {
                                const parsed = JSON.parse(data);
                                
                                // Handle content from chat agent response
                                if (parsed.content) {
                                    fullResponse += parsed.content;
                                    
                                    // Update the assistant message content in real-time
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === assistantMessage.id 
                                            ? { ...msg, content: fullResponse }
                                            : msg
                                    ));
                                }
                            } catch {
                                // If not JSON, treat as plain text content
                                if (data.trim()) {
                                    fullResponse += data;
                                    
                                    // Update the assistant message content in real-time
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === assistantMessage.id 
                                            ? { ...msg, content: fullResponse }
                                            : msg
                                    ));
                                }
                            }
                        }
                    }

                    // Break out of the outer loop when stream is completed
                    if (streamCompleted) {
                        console.log('Breaking out of stream loop - completion detected');
                        break;
                    }
                }

                console.log('Stream reading completed successfully');
            } finally {
                // Ensure reader is properly closed
                try {
                    reader.releaseLock();
                } catch (e) {
                    console.warn('Error releasing reader lock:', e);
                }
            }

            // Simple message count update - since we're using chat agent endpoint only
            // Chat agent endpoint doesn't return message count, so we increment locally
            const estimatedCount = (session?.message_count || 0) + 1;
            console.log('Updating session with estimated message count:', estimatedCount);
            setSession(prev => prev ? {
                ...prev,
                message_count: estimatedCount
            } : null);
            
            setCanComplete(estimatedCount >= 5);

            console.log('Message sent successfully, clearing error state');
            setError(null); // Clear any previous errors on successful completion

        } catch (err: any) {
            setError(`Failed to send message: ${err.message}`);
            console.error('Error sending message:', err);
            
            // Remove the user message on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            // Clear the timeout and always reset sending state
            clearTimeout(timeoutId);
            console.log('Resetting sending state to false');
            setSending(false);
        }
    };

    const completeInterview = async () => {
        if (!session_id) return;
    
        setCompleting(true);
        setError(null);
    
        try {
            const sessionData = parseSessionId(session_id);
            const response = await fetch(`/api/complete-interview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id,
                    user_id: sessionData.user_id,
                    email: sessionData.email
                })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.error || 'Failed to complete interview');
            }
    
            console.log('Interview completed via API:', result);
            setCompleted(true);
            setSession(prev => prev ? { ...prev, session_status: 'completed' } : null);
    
        } catch (err: any) {
            setError(`Failed to complete interview: ${err.message}`);
            console.error('Error completing interview:', err);
        } finally {
            setCompleting(false);
        }
    };

    // Load chat history on component mount
    useEffect(() => {
        loadChatHistory();
    }, [loadChatHistory]);

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin mr-3" />
                        <span>Loading chat interface...</span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-600">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Error
                        </CardTitle>
                        <CardDescription>
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header - Fixed at top */}
            <div className="border-b bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">Marketing Team Interview</h1>
                                {session && (
                                    <p className="text-sm text-muted-foreground">
                                        {session.email} • {messages.length} messages • 
                                        <span className={`font-medium ml-1 ${completed ? 'text-green-600' : 'text-primary'}`}>
                                            {completed ? 'Interview Completed' : 'Interview Active'}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {completed && (
                                <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Completed</span>
                                </div>
                            )}
                            {sending && (
                                <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded-full text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Typing...</span>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="h-8 w-8 p-0"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts - Only show when needed */}
            {(completed || error) && (
                <div className="container mx-auto px-4 py-2">
                    {completed && (
                        <Alert className="mb-2 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Interview completed successfully! Thank you for your participation.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {error && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Chat Messages - Flexible height */}
            <div className="flex-1 container mx-auto px-4 pb-4 min-h-0">
                <div className="h-full bg-background rounded-lg border overflow-hidden flex flex-col shadow-sm">
                    {/* Messages Container */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                                <MessageCircle className="h-12 w-12 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2">Start your conversation</h3>
                                            <p className="text-muted-foreground max-w-sm">
                                                Welcome to your interview! Feel free to introduce yourself or ask any questions.
                                            </p>
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
                                                            ) : message.role === 'assistant' ? (
                                                                <div className="flex items-center gap-1 py-1">
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" />
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                                                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                                                                </div>
                                                            ) : null}
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

                    {/* Input Area - Fixed at bottom */}
                    {!completed && (
                        <div className="border-t bg-background/50 p-4">
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <Input
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Send a message..."
                                        disabled={sending}
                                        className="min-h-[44px] resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <Button
                                    onClick={sendMessage}
                                    disabled={sending || !newMessage.trim()}
                                    size="sm"
                                    className="h-11 px-4"
                                >
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Complete Interview Button */}
                            {canComplete && !completed && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        Ready to complete your interview?
                                                    </p>
                                                    <p className="text-xs text-green-700 dark:text-green-300">
                                                        You&apos;ve had a good conversation. You can finish now or continue chatting.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={completeInterview}
                                                disabled={completing}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                size="sm"
                                            >
                                                {completing ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        Completing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        Complete Interview
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
