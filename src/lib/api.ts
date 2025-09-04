/* eslint-disable @typescript-eslint/no-explicit-any */
// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiEndpoints = {
    accounts: '/accounts',
    emails: '/emails',
    smtp: '/smtp',
    scheduler: '/scheduler',
    interview: '/interview',
} as const;

// API utility functions
export const api = {
    post: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },

    postFormData: async (endpoint: string, formData: FormData) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },

    get: async (endpoint: string) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },

    put: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },

    patch: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },

    delete: async (endpoint: string) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    },
};

// Account API functions
export const accountApi = {
    createAccount: async (user_id: string, api_key: string) => {
        return api.post(apiEndpoints.accounts, { user_id, api_key });
    },

    getAccount: async (user_id: string) => {
        return api.get(`${apiEndpoints.accounts}/${user_id}`);
    },

    updateAccount: async (user_id: string, updates: any) => {
        return api.patch(`${apiEndpoints.accounts}/${user_id}`, updates);
    },
};

// Email API functions
export const emailApi = {
    uploadCSV: async (user_id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.postFormData(`${apiEndpoints.emails}/upload-csv?user_id=${user_id}`, formData);
    },

    getEmails: async (user_id: string) => {
        return api.get(`${apiEndpoints.emails}/${user_id}`);
    },

    getEmailThread: async (user_id: string, email: string) => {
        return api.get(`/email-thread/${user_id}/${email}`);
    },

    deleteEmailCascade: async (user_id: string, email: string) => {
        return api.delete(`${apiEndpoints.emails}/${user_id}/${email}`);
    },

    updateEmailStatus: async (userId: string, email: string, status: string, errorMessage?: string) => {
        return api.put(`/emails/${userId}/${email}/status`, {
            status,
            error_message: errorMessage || null
        });
    },
    
    patchEmailFields: async (userId: string, email: string, updates: any) => {
        return api.patch(`/emails/${userId}/${email}`, updates);
    }
};

// SMTP API functions
export const smtpApi = {
    saveSMTP: async (user_id: string, username: string, password: string, host: string) => {
        return api.post(apiEndpoints.smtp, {
            user_id,
            username,
            password,
            host,
            created_at: new Date().toISOString()
        });
    },

    getSMTP: async (user_id: string) => {
        return api.get(`${apiEndpoints.smtp}/${user_id}`);
    },
};

// Scheduler API functions
export const schedulerApi = {
    saveScheduler: async (user_id: string, max_limit: number, interval: number, time: string) => {
        return api.post(apiEndpoints.scheduler, {
            user_id,
            max_limit,
            interval,
            time,
            created_at: new Date().toISOString()
        });
    },

    getScheduler: async (user_id: string) => {
        return api.get(`${apiEndpoints.scheduler}/${user_id}`);
    },
};

// Interview API functions
export const interviewApi = {
    startInterview: async (user_id: string, email: string) => {
        return api.post(`${apiEndpoints.interview}/start?user_id=${user_id}&email=${email}`, {});
    },

    completeInterview: async (token: string) => {
        return api.post(`${apiEndpoints.interview}/complete/${token}`, {});
    },

    getInterviewStatus: async (user_id: string, email: string) => {
        return api.get(`${apiEndpoints.interview}/status/${user_id}/${email}`);
    },

    getInterview: async (token: string) => {
        return api.get(`${apiEndpoints.interview}/${token}`);
    },

    startBulkInterviews: async (user_id: string) => {
        // Get all emails for user and start interviews for each
        const emails = await emailApi.getEmails(user_id);
        const results = [];
        
        for (const emailRecord of emails) {
            try {
                const result = await interviewApi.startInterview(user_id, emailRecord.email);
                results.push({ email: emailRecord.email, success: true, result });
            } catch (error) {
                results.push({ email: emailRecord.email, success: false, error });
            }
        }
        
        return results;
    },
};

// Email Content API functions  
export const emailContentApi = {
    setEmailContent: async (user_id: string, email: string, content: string) => {
        return api.post('/email-content', {
            user_id,
            email,
            content,
            created_at: new Date().toISOString()
        });
    },

    getEmailContent: async (user_id: string, email: string) => {
        return api.get(`/email-content/${user_id}/${email}`);
    },

    listEmailContents: async (user_id: string) => {
        return api.get(`/email-content/${user_id}`);
    },

    deleteEmailContent: async (user_id: string, email: string) => {
        return api.delete(`/email-content/${user_id}/${email}`);
    },

    deleteAllEmailContents: async (user_id: string) => {
        return api.delete(`/email-content/${user_id}`);
    },
};

// Email Thread API functions
export const emailThreadApi = {
    getEmailThread: async (user_id: string, email: string) => {
        return api.get(`/email-thread/${user_id}/${email}`);
    },

    getAllEmailThreads: async (user_id: string) => {
        return api.get(`/email-threads/${user_id}`);
    },
};

// Agent API functions
export const agentApi = {
    createAgentWithKB: async (user_id: string, token: string, name: string = "Interview Agent", description: string = "AI agent for conducting interviews") => {
        return api.post('/agents/create', {
            user_id,
            name,
            description,
            token
        });
    },

    createChatAgent: async (user_id: string, token: string, name: string = "Chat Agent", description: string = "AI chat agent with knowledge base access") => {
        return api.post('/agents/chat/create', {
            user_id,
            name,
            description,
            token
        });
    },
};

// Chat API functions
export const chatApi = {
    // For interview agents (non-streaming with message count)
    sendInterviewMessage: async (data: {
        user_id: string;
        session_id: string;
        agent_id: string;
        message: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/chat/interview/send/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to send interview message');
        }

        return response;
    },

    // For chat agents (streaming, no message count)
    sendChatAgentMessage: async (data: {
        user_id: string;
        session_id: string;
        agent_id: string;
        message: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/chat/agent/send/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to send chat agent message');
        }

        return response;
    },

    // For streaming responses (chat agents only)
    sendMessageStream: async (
        data: {
            user_id: string;
            session_id: string;
            agent_id: string;
            message: string;
        },
        onMessage: (content: string) => void,
        onError: (error: string) => void,
        onComplete: () => void
    ) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat/agent/send/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to send message');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            onComplete();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                onMessage(parsed.content);
                            } else if (parsed.error) {
                                onError(parsed.error);
                            }
                        } catch (e) {
                            console.error('Failed to parse streaming data:', e);
                            // Try to extract content directly if it's plain text
                            if (data && data !== '[DONE]') {
                                onMessage(data);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Unknown error');
        }
    }
};
