/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Mail, Clock, Save, CheckCircle, Bot, Brain } from "lucide-react";
import { useAuth } from '@/components/providers/AuthProvider';
import { smtpApi, schedulerApi, accountApi, agentApi } from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface SMTPForm {
    username: string;
    password: string;
    server: string;
    host: string;
}

interface SchedulerForm {
    max_limit: number;
    interval: number;
    time: string;
}

interface SMTPConfig {
    username: string;
    password: string;
    server: string;
    host: string;
    created_at: string;
}

interface SchedulerConfig {
    max_limit: number;
    interval: number;
    time: string;
    created_at: string;
}

interface AgentForm {
    name: string;
    description: string;
}

interface AccountConfig {
    user_id: string;
    api_key: string;
    agent_id?: string;
    rag_id?: string;
    chat_agent_id?: string;
    created_at?: string;
    updated_at?: string;
}

export function SettingsPage() {
    const { userId, token } = useAuth();
    const [smtpConfig, setSMTPConfig] = useState<SMTPConfig | null>(null);
    const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig | null>(null);
    const [accountConfig, setAccountConfig] = useState<AccountConfig | null>(null);
    const [smtpLoading, setSMTPLoading] = useState(false);
    const [schedulerLoading, setSchedulerLoading] = useState(false);
    const [agentLoading, setAgentLoading] = useState(false);
    const [chatAgentLoading, setChatAgentLoading] = useState(false);
    const [loadingConfigs, setLoadingConfigs] = useState(true);

    const smtpForm = useForm<SMTPForm>({
        defaultValues: {
            username: '',
            password: '',
            server: '',
            host: ''
        }
    });

    const schedulerForm = useForm<SchedulerForm>({
        defaultValues: {
            max_limit: 10,
            interval: 60,
            time: '09:00'
        }
    });

    const agentForm = useForm<AgentForm>({
        defaultValues: {
            name: 'Interview Agent',
            description: 'AI agent for conducting interviews'
        }
    });

    const chatAgentForm = useForm<AgentForm>({
        defaultValues: {
            name: 'Chat Agent',
            description: 'AI chat agent with knowledge base access'
        }
    });

    // Load existing configurations
    const loadConfigurations = useCallback(async () => {
        if (!userId) return;

        try {
            setLoadingConfigs(true);

            // Load SMTP configuration
            try {
                const smtp = await smtpApi.getSMTP(userId);
                setSMTPConfig(smtp);
                smtpForm.reset({
                    username: smtp.username,
                    password: smtp.password,
                    server: smtp.server,
                    host: smtp.host
                });
            } catch {
                console.log('No SMTP configuration found');
                setSMTPConfig(null);
            }

            // Load Scheduler configuration
            try {
                const scheduler = await schedulerApi.getScheduler(userId);
                setSchedulerConfig(scheduler);
                schedulerForm.reset({
                    max_limit: scheduler.max_limit,
                    interval: scheduler.interval,
                    time: scheduler.time
                });
            } catch {
                console.log('No scheduler configuration found');
                setSchedulerConfig(null);
            }

            // Load Account configuration (for agent settings)
            try {
                const account = await accountApi.getAccount(userId);
                setAccountConfig(account);
                // No need to reset form since we don't store agent prompts anymore
            } catch {
                console.log('No account configuration found');
                setAccountConfig(null);
            }
        } catch (error) {
            console.error('Error loading configurations:', error);
        } finally {
            setLoadingConfigs(false);
        }
    }, [userId, smtpForm, schedulerForm]);

    useEffect(() => {
        loadConfigurations();
    }, [loadConfigurations]);

    const handleSMTPSubmit = async (data: SMTPForm) => {
        if (!userId) return;

        try {
            setSMTPLoading(true);
            await smtpApi.saveSMTP(userId, data.username, data.password, data.host);
            toast.success('SMTP configuration saved successfully');
            await loadConfigurations(); // Reload to get updated config
        } catch (error: any) {
            console.error('Error saving SMTP configuration:', error);
            toast.error(error.message || 'Failed to save SMTP configuration');
        } finally {
            setSMTPLoading(false);
        }
    };

    const handleSchedulerSubmit = async (data: SchedulerForm) => {
        if (!userId) return;

        try {
            setSchedulerLoading(true);
            console.log(data.time)
            await schedulerApi.saveScheduler(userId, data.max_limit, data.interval, data.time);
            toast.success('Scheduler configuration saved successfully');
            await loadConfigurations(); // Reload to get updated config
        } catch (error: any) {
            console.error('Error saving scheduler configuration:', error);
            toast.error(error.message || 'Failed to save scheduler configuration');
        } finally {
            setSchedulerLoading(false);
        }
    };

    const handleAgentSubmit = async (data: AgentForm) => {
        if (!userId) return;

        try {
            setAgentLoading(true);
            
            if (accountConfig?.agent_id) {
                // Agent already exists, show message
                toast.info('Interview agent already exists. System prompts are predefined and cannot be modified.');
            } else {
                // Create new agent and KB
                if (!token) {
                    throw new Error('Authentication token not available');
                }
                
                const result = await agentApi.createAgentWithKB(
                    userId, 
                    token,
                    data.name,
                    data.description
                );
                toast.success('Interview agent and knowledge base created successfully');
                console.log('Agent creation result:', result);
            }
            
            await loadConfigurations(); // Reload to get updated config
        } catch (error: any) {
            console.error('Error saving agent configuration:', error);
            toast.error(error.message || 'Failed to save agent configuration');
        } finally {
            setAgentLoading(false);
        }
    };

    const handleChatAgentSubmit = async (data: AgentForm) => {
        if (!userId) return;

        try {
            setChatAgentLoading(true);
            
            if (accountConfig?.chat_agent_id) {
                // Chat agent already exists, show message
                toast.info('Chat agent already exists. System prompts are predefined and cannot be modified.');
            } else {
                // Create new chat agent and link with existing KB
                if (!token) {
                    throw new Error('Authentication token not available');
                }
                
                if (!accountConfig?.rag_id) {
                    throw new Error('No knowledge base found. Please create an interview agent first.');
                }
                
                const result = await agentApi.createChatAgent(
                    userId, 
                    token,
                    data.name,
                    data.description
                );
                toast.success('Chat agent created and linked with knowledge base successfully');
                console.log('Chat agent creation result:', result);
            }
            
            await loadConfigurations(); // Reload to get updated config
        } catch (error: any) {
            console.error('Error saving chat agent configuration:', error);
            toast.error(error.message || 'Failed to save chat agent configuration');
        } finally {
            setChatAgentLoading(false);
        }
    };

    if (loadingConfigs) {
        return (
            <TabsContent value="settings" className="space-y-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        );
    }

    return (
        <TabsContent value="settings" className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Settings className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Settings</h2>
            </div>

            <Tabs defaultValue="email-credentials" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="email-credentials" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Credentials
                    </TabsTrigger>
                    <TabsTrigger value="trigger" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Trigger Settings
                    </TabsTrigger>
                    <TabsTrigger value="interview-agent" className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Interview Agent
                    </TabsTrigger>
                    <TabsTrigger value="chat-agent" className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Chat Agent
                    </TabsTrigger>
                </TabsList>

                {/* Email Credentials Tab */}
                <TabsContent value="email-credentials" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                SMTP Configuration
                                {smtpConfig && (
                                    <Badge variant="outline" className="ml-2">
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                        Configured
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Configure your email server settings to send marketing emails
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={smtpForm.handleSubmit(handleSMTPSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username/Email</Label>
                                        <Input
                                            id="username"
                                            placeholder="your-email@example.com"
                                            {...smtpForm.register('username', { required: true })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Your email password"
                                            {...smtpForm.register('password', { required: true })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* <div className="space-y-2">
                                        <Label htmlFor="server">SMTP Server</Label>
                                        <Input
                                            id="server"
                                            placeholder="smtp.gmail.com"
                                            {...smtpForm.register('server', { required: true })}
                                        />
                                    </div> */}
                                    <div className="space-y-2">
                                        <Label htmlFor="host">Host</Label>
                                        <Input
                                            id="host"
                                            placeholder="smtp.gmail.com"
                                            {...smtpForm.register('host', { required: true })}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={smtpLoading}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {smtpLoading ? 'Saving...' : 'Save SMTP Settings'}
                                </Button>
                            </form>

                            {smtpConfig && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-green-800">SMTP Configured</span>
                                    </div>
                                    <p className="text-sm text-green-700">
                                        Last updated: {new Date(smtpConfig.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trigger Settings Tab */}
                <TabsContent value="trigger" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Email Scheduling Configuration
                                {schedulerConfig && (
                                    <Badge variant="outline" className="ml-2">
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                        Active
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Set up automated email sending schedules and limits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={schedulerForm.handleSubmit(handleSchedulerSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Start Time</Label>
                                        <Input
                                            id="time"
                                            type="time"
                                            step="60"
                                            {...schedulerForm.register('time', { required: true })}
                                        />
                                        <p className="text-xs text-gray-500">When to start sending emails daily</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interval">Interval (minutes)</Label>
                                        <Input
                                            id="interval"
                                            type="number"
                                            min="1"
                                            placeholder="60"
                                            {...schedulerForm.register('interval', {
                                                required: true,
                                                valueAsNumber: true,
                                                min: 1
                                            })}
                                        />
                                        <p className="text-xs text-gray-500">Time between email batches</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max_limit">No. of Follow-Ups</Label>
                                        <Input
                                            id="max_limit"
                                            type="number"
                                            min="1"
                                            max="1000"
                                            placeholder="10"
                                            {...schedulerForm.register('max_limit', {
                                                required: true,
                                                valueAsNumber: true,
                                                min: 1,
                                                max: 1000
                                            })}
                                        />
                                        <p className="text-xs text-gray-500">Maximum no. of follow-ups</p>
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={schedulerLoading}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {schedulerLoading ? 'Saving...' : 'Save Trigger Settings'}
                                </Button>
                            </form>

                            {schedulerConfig && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-blue-800">Scheduler Active</span>
                                    </div>
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <p>Start time: {schedulerConfig.time}</p>
                                        <p>Interval: {schedulerConfig.interval} minutes</p>
                                        <p>Batch size: {schedulerConfig.max_limit} emails</p>
                                        <p>Last updated: {new Date(schedulerConfig.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Interview Agent Tab */}
                <TabsContent value="interview-agent" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                Interview Agent Configuration
                                {accountConfig?.agent_id && (
                                    <Badge variant="outline" className="ml-2">
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                        Agent Created
                                    </Badge>
                                )}
                                {accountConfig?.rag_id && (
                                    <Badge variant="outline" className="ml-1">
                                        <Brain className="h-3 w-3 mr-1 text-purple-600" />
                                        KB Linked
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Configure your AI interview agent&apos;s name and description. The system prompt is predefined for optimal interview performance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={agentForm.handleSubmit(handleAgentSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="agent-name">Agent Name</Label>
                                    <Input
                                        id="agent-name"
                                        {...agentForm.register('name')}
                                        placeholder="Interview Agent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agent-description">Agent Description</Label>
                                    <Textarea
                                        id="agent-description"
                                        {...agentForm.register('description')}
                                        placeholder="AI agent for conducting interviews"
                                        rows={3}
                                        className="resize-none"
                                    />
                                    <p className="text-sm text-gray-500">
                                        A brief description of what this agent does. The system prompt is predefined and optimized for conducting professional interviews.
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={agentLoading}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {agentLoading ? 'Creating...' : (accountConfig?.agent_id ? 'Agent Already Created' : 'Create Agent & Knowledge Base')}
                                </Button>
                            </form>

                            {accountConfig?.agent_id && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-green-800">Agent Configuration</span>
                                    </div>
                                    <div className="text-sm text-green-700 space-y-1">
                                        <p><strong>Agent ID:</strong> {accountConfig.agent_id}</p>
                                        {accountConfig.rag_id && <p><strong>Knowledge Base ID:</strong> {accountConfig.rag_id}</p>}
                                        <p><strong>Last Updated:</strong> {accountConfig.updated_at ? new Date(accountConfig.updated_at).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            )}

                            {!accountConfig?.agent_id && (
                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot className="h-4 w-4 text-yellow-600" />
                                        <span className="font-medium text-yellow-800">No Agent Created</span>
                                    </div>
                                    <p className="text-sm text-yellow-700">
                                        Create an interview agent to start conducting AI-powered interviews. The system will automatically create a knowledge base and link it to your agent.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Chat Agent Tab */}
                <TabsContent value="chat-agent" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                Chat Agent Configuration
                                {accountConfig?.chat_agent_id && (
                                    <Badge variant="outline" className="ml-2">
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                        Agent Created
                                    </Badge>
                                )}
                                {accountConfig?.rag_id && (
                                    <Badge variant="outline" className="ml-1">
                                        <Brain className="h-3 w-3 mr-1 text-purple-600" />
                                        KB Linked
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Create a chat agent that can answer questions using your knowledge base. Requires an existing interview agent with knowledge base.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={chatAgentForm.handleSubmit(handleChatAgentSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="chat-agent-name">Agent Name</Label>
                                    <Input
                                        id="chat-agent-name"
                                        {...chatAgentForm.register('name')}
                                        placeholder="Chat Agent"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="chat-agent-description">Agent Description</Label>
                                    <Textarea
                                        id="chat-agent-description"
                                        {...chatAgentForm.register('description')}
                                        placeholder="AI chat agent with knowledge base access"
                                        rows={3}
                                        className="resize-none"
                                    />
                                    <p className="text-sm text-gray-500">
                                        A brief description of what this chat agent does. It will have access to your knowledge base to answer questions.
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={chatAgentLoading || !accountConfig?.rag_id}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {chatAgentLoading ? 'Creating...' : (accountConfig?.chat_agent_id ? 'Agent Already Created' : 'Create Chat Agent')}
                                </Button>
                                {!accountConfig?.rag_id && (
                                    <p className="text-sm text-orange-600">
                                        Please create an interview agent first to establish a knowledge base.
                                    </p>
                                )}
                            </form>

                            {accountConfig?.chat_agent_id && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-green-800">Chat Agent Configuration</span>
                                    </div>
                                    <div className="text-sm text-green-700 space-y-1">
                                        <p><strong>Chat Agent ID:</strong> {accountConfig.chat_agent_id}</p>
                                        {accountConfig.rag_id && <p><strong>Knowledge Base ID:</strong> {accountConfig.rag_id}</p>}
                                        <p><strong>Last Updated:</strong> {accountConfig.updated_at ? new Date(accountConfig.updated_at).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            )}

                            {!accountConfig?.chat_agent_id && accountConfig?.rag_id && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-700">
                                        Create a chat agent to enable knowledge base-powered conversations. This agent will be automatically linked to your existing knowledge base.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>
    );
}
