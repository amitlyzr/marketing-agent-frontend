/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Chat Interface for Interview System
 * 
 * Features:
 * 1. Public chat interface (no auth required)
 * 2. Uses session_id as URL path parameter format: user_id+email
 * 3. Agent_id as query parameter
 * 4. Integrates with Lyzr chat API
 * 5. Auto-completes interview after 5 messages
 * 6. Processes interview completion (PDF generation, S3 upload, KB training)
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertCircle, MessageCircle, Send, User, Bot } from "lucide-react";

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
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        console.log('Agent_id from query:', agent_id);
    }, [agent_id]);

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
                setMessages(data.messages || []);
                setSession(data.session);
                setCanComplete(data.message_count >= 5);
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

        try {
            // Send message to interview endpoint (streaming with message count)
            const response = await fetch(`${BACKEND_API_URL}/chat/interview/send/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: sessionData.user_id,
                    agent_id: agent_id || "",
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
            let receivedMessageCount = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            break;
                        }

                        // Handle both JSON and plain text responses
                        try {
                            const parsed = JSON.parse(data);
                            
                            // Handle message count metadata
                            if (parsed.message_count) {
                                receivedMessageCount = parsed.message_count;
                            }
                            
                            // Handle content
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
            }

            // Update session state with message count from backend
            if (receivedMessageCount > 0) {
                setSession(prev => prev ? {
                    ...prev,
                    message_count: receivedMessageCount
                } : null);
                
                setCanComplete(receivedMessageCount >= 5);
            } else {
                // Fallback if message count wasn't received
                const estimatedCount = messages.length + 2;
                setSession(prev => prev ? {
                    ...prev,
                    message_count: estimatedCount
                } : null);
                
                setCanComplete(estimatedCount >= 5);
            }

        } catch (err: any) {
            setError(`Failed to send message: ${err.message}`);
            console.error('Error sending message:', err);
            
            // Remove the user message on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setSending(false);
        }
    };

    const completeInterview = async () => {
        if (!session_id) return;
    
        setCompleting(true);
        setError(null);
    
        try {
            const sessionData = parseSessionId(session_id);
            
            const response = await fetch('/api/complete-interview', {
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
        <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header - Fixed at top */}
            <div className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <MessageCircle className="h-6 w-6 text-blue-600" />
                            <div>
                                <h1 className="font-semibold text-lg text-gray-900">Interview Chat</h1>
                                {session && (
                                    <p className="text-sm text-gray-600">
                                        {session.email} • {messages.length} messages • 
                                        <span className={`font-medium ml-1 ${completed ? 'text-green-600' : 'text-blue-600'}`}>
                                            {completed ? 'Completed' : 'Active'}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Status indicators */}
                        <div className="flex items-center space-x-2">
                            {completed && (
                                <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Completed</span>
                                </div>
                            )}
                            {sending && (
                                <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Typing...</span>
                                </div>
                            )}
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
                <div className="h-full bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                    {/* Messages Container */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-6">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-12">
                                        <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                        <h3 className="text-lg font-medium mb-2">Start your conversation</h3>
                                        <p>Welcome to your interview! Feel free to introduce yourself or ask any questions.</p>
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
                                                        ) : message.role === 'assistant' ? (
                                                            <div className="flex items-center space-x-1 py-1">
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                                                            </div>
                                                        ) : null}
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

                    {/* Input Area - Fixed at bottom */}
                    {!completed && (
                        <div className="border-t bg-gray-50 p-4">
                            <div className="flex space-x-3">
                                <div className="flex-1">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message..."
                                        disabled={sending}
                                        className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <Button
                                    onClick={sendMessage}
                                    disabled={sending || !newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 px-6"
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
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-green-800">
                                                        Ready to complete your interview?
                                                    </p>
                                                    <p className="text-xs text-green-700">
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
