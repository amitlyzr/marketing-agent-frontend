/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/providers/AuthProvider';
import { emailApi, smtpApi, schedulerApi, emailThreadApi, accountApi, emailContentApi, api } from '@/lib/api';

interface Email {
    _id?: string;
    user_id: string;
    email: string;
    status: string;
    follow_up_count: number;
    last_sent_at?: string;
    created_at: string;
    updated_at: string;
}

// Sample data for charts
const areaData = [
    { name: 'Jan', emails: 400, opens: 240, clicks: 100 },
    { name: 'Feb', emails: 300, opens: 139, clicks: 80 },
    { name: 'Mar', emails: 200, opens: 980, clicks: 390 },
    { name: 'Apr', emails: 278, opens: 390, clicks: 300 },
    { name: 'May', emails: 189, opens: 480, clicks: 200 },
    { name: 'Jun', emails: 239, opens: 380, clicks: 300 },
];

const barData = [
    { name: 'Mon', sent: 20, opened: 15, clicked: 8 },
    { name: 'Tue', sent: 35, opened: 25, clicked: 12 },
    { name: 'Wed', sent: 45, opened: 32, clicked: 18 },
    { name: 'Thu', sent: 25, opened: 18, clicked: 9 },
    { name: 'Fri', sent: 40, opened: 28, clicked: 15 },
    { name: 'Sat', sent: 15, opened: 10, clicked: 5 },
    { name: 'Sun', sent: 10, opened: 7, clicked: 3 },
];

interface DashboardStats {
    totalEmails: number;
    smtpConfigured: boolean;
    schedulerConfigured: boolean;
    emailsSentToday: number;
    interviewsStarted: number;
    interviewsCompleted: number;
    emailStatusBreakdown: {
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        exhausted: number;
    };
    collectionsThisMonth: number;
    knowledgeItemsAdded: number;
    contentGenerated: number;
    activeCampaigns: number;
}
export function DashboardPage() {
    const { userId } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalEmails: 0,
        smtpConfigured: false,
        schedulerConfigured: false,
        emailsSentToday: 0,
        interviewsStarted: 0,
        interviewsCompleted: 0,
        emailStatusBreakdown: {
            pending: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            exhausted: 0,
        },
        collectionsThisMonth: 0,
        knowledgeItemsAdded: 0,
        contentGenerated: 0,
        activeCampaigns: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cardLoading, setCardLoading] = useState({
        collections: false,
        knowledge: false,
        content: false,
        campaigns: false,
    });
    const [recentCollections, setRecentCollections] = useState<{ name: string; type: string; date: string }[]>([]);
    const [contributors, setContributors] = useState<{ name: string; count: number }[]>([]);

    // Dynamic pie chart data based on real stats
    const getPieData = () => [
        { name: 'Pending', value: stats.emailStatusBreakdown.pending, color: '#94A3B8' },
        { name: 'Sent', value: stats.emailStatusBreakdown.sent, color: '#3B82F6' },
        { name: 'Delivered', value: stats.emailStatusBreakdown.delivered, color: '#10B981' },
        { name: 'Opened', value: stats.emailStatusBreakdown.opened, color: '#8B5CF6' },
        { name: 'Exhausted', value: stats.emailStatusBreakdown.exhausted, color: '#EF4444' },
    ].filter(item => item.value > 0); // Only show non-zero values

    // Extracted fetch logic so we can call it on refresh
    const fetchDashboard = useCallback(async (opts?: { cardsOnly?: boolean }) => {
        if (!userId) return;
        if (opts?.cardsOnly) {
            setCardLoading(prev => ({ ...prev, collections: true, knowledge: true, content: true, campaigns: true }));
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const results = await Promise.allSettled([
                emailApi.getEmails(userId),
                smtpApi.getSMTP(userId),
                schedulerApi.getScheduler(userId),
                emailThreadApi.getAllEmailThreads(userId),
                accountApi.getAccount(userId),
                api.get(`/knowledge-base/pdfs/${userId}`),
                api.get(`/knowledge-base/pdfs-categorized/${userId}`),
                emailContentApi.listEmailContents(userId),
            ]);

            const [emailsRes, smtpRes, schedulerRes, threadsRes, accountRes, pdfsRes, categorizedPdfsRes, emailContentsRes] = results;

            const emails = emailsRes.status === 'fulfilled' ? (emailsRes.value as Email[]) : [];
            const totalEmails = emails.length;

            const smtpConfigured = smtpRes.status === 'fulfilled' && !!smtpRes.value;
            const schedulerConfigured = schedulerRes.status === 'fulfilled' && !!schedulerRes.value;

            const emailStatusBreakdown = {
                pending: emails.filter((e: Email) => e.status === 'pending').length,
                sent: emails.filter((e: Email) => e.status === 'sent').length,
                delivered: emails.filter((e: Email) => e.status === 'delivered').length,
                opened: emails.filter((e: Email) => e.status === 'opened').length,
                exhausted: emails.filter((e: Email) => e.status === 'exhausted').length,
            };

            const now = new Date();
            const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const emailsSentToday = emails.reduce((acc, e) => {
                if (!e.last_sent_at) return acc;
                const d = new Date(e.last_sent_at);
                return d >= startOfToday ? acc + 1 : acc;
            }, 0);

            let interviewsStarted = 0;
            let interviewsCompleted = 0;
            if (threadsRes.status === 'fulfilled') {
                const maybeThreads = (threadsRes as PromiseFulfilledResult<unknown>).value;
                if (Array.isArray(maybeThreads)) {
                    const threads = maybeThreads as unknown[];
                    interviewsStarted = threads.filter(t => {
                        const rec = t as Record<string, unknown>;
                        const status = rec['session_status'];
                        const msgCount = rec['message_count'];
                        return String(status) === 'active' || (typeof msgCount === 'number' && (msgCount as number) > 0);
                    }).length;

                    interviewsCompleted = threads.filter(t => {
                        const rec = t as Record<string, unknown>;
                        const status = rec['session_status'];
                        const completedAt = rec['completed_at'];
                        return String(status) === 'completed' || !!completedAt;
                    }).length;
                }
            } else {
                interviewsStarted = Math.floor(totalEmails * 0.6);
                interviewsCompleted = Math.floor(totalEmails * 0.25);
            }

            const pdfs = (pdfsRes.status === 'fulfilled') ? (pdfsRes as PromiseFulfilledResult<unknown>).value : undefined;
            const categorizedPdfs = (categorizedPdfsRes.status === 'fulfilled') ? (categorizedPdfsRes as PromiseFulfilledResult<unknown>).value : undefined;
            const pdfsArr = Array.isArray(pdfs) ? (pdfs as unknown[]) : [];
            const categorizedArr = Array.isArray(categorizedPdfs) ? (categorizedPdfs as unknown[]) : [];
            const knowledgeItemsAdded = categorizedArr.length || pdfsArr.length || 0;

            // Build recent collections list (combine categorized + pdfs)
            const combinedItems = categorizedArr.concat(pdfsArr) as unknown[];
            const normalized = combinedItems.map(p => {
                const rec = p as Record<string, unknown>;
                const title = String(rec['title'] ?? rec['name'] ?? 'Untitled');
                let type = String(rec['category'] ?? rec['type'] ?? 'Other');
                const tLower = title.toLowerCase();
                if (type === 'Other') {
                    if (tLower.includes('case')) type = 'Case Study';
                    else if (tLower.includes('technical')) type = 'Technical Documentation';
                    else if (tLower.includes('thought')) type = 'Thought Leadership';
                }
                const date = String(rec['created_at'] ?? rec['createdAt'] ?? rec['created'] ?? '');
                return { title, type, date };
            }).filter(x => x.date).sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));

            const emailContents = (emailContentsRes.status === 'fulfilled') ? (emailContentsRes as PromiseFulfilledResult<unknown>).value : undefined;
            const contentGenerated = Array.isArray(emailContents) ? (emailContents as unknown[]).length : 0;

            setRecentCollections(normalized.slice(0, 6).map(r => ({ name: r.title, type: r.type, date: r.date })));

            // Derive contributors from emailContents (group by author/user)
            const emailContentsArr = Array.isArray(emailContents) ? (emailContents as unknown[]) : [];
            const contribMap = new Map<string, number>();
            for (const c of emailContentsArr) {
                const rec = c as Record<string, unknown>;
                const author = String(rec['created_by'] ?? rec['user_id'] ?? rec['author'] ?? 'unknown');
                contribMap.set(author, (contribMap.get(author) ?? 0) + 1);
            }
            const contribs = Array.from(contribMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
            setContributors(contribs);

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const collectionsThisMonth = pdfsArr.concat(categorizedArr).filter(p => {
                try {
                    const rec = p as Record<string, unknown>;
                    const created = rec['created_at'];
                    return created ? new Date(String(created)) >= thirtyDaysAgo : false;
                } catch {
                    return false;
                }
            }).length;

            const activeCampaigns = schedulerConfigured ? 1 : 0;

            setStats({
                totalEmails,
                smtpConfigured,
                schedulerConfigured,
                emailsSentToday,
                interviewsStarted,
                interviewsCompleted,
                emailStatusBreakdown,
                collectionsThisMonth,
                knowledgeItemsAdded,
                contentGenerated,
                activeCampaigns,
            });
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            if (opts?.cardsOnly) {
                setCardLoading({ collections: false, knowledge: false, content: false, campaigns: false });
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [userId]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    if (loading) {
        return (
            <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>
        );
    }

    return (
        <TabsContent value="dashboard" className="space-y-6 mt-6">
            <div className="space-y-6">
                {/* Top summary cards similar to screenshot */}
                <div className="flex items-center justify-between">
                    <div />
                    <div className="flex items-center gap-2">
                        <button className="text-sm px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200" onClick={() => fetchDashboard({ cardsOnly: true })} disabled={refreshing}>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Collections this month</p>
                            <h3 className="text-3xl font-bold mt-2">{cardLoading.collections ? (<span className="animate-pulse">...</span>) : stats.collectionsThisMonth}</h3>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Knowledge items added</p>
                            <h3 className="text-3xl font-bold mt-2">{cardLoading.knowledge ? (<span className="animate-pulse">...</span>) : stats.knowledgeItemsAdded}</h3>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3-.895-3-2 1.343-2 3-2z"/></svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Content generated</p>
                            <h3 className="text-3xl font-bold mt-2">{cardLoading.content ? (<span className="animate-pulse">...</span>) : stats.contentGenerated}</h3>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20l9-5-9-5-9 5 9 5z"/></svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Active campaigns</p>
                            <h3 className="text-3xl font-bold mt-2">{cardLoading.campaigns ? (<span className="animate-pulse">...</span>) : stats.activeCampaigns}</h3>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>
                </div>

                {/* Middle section: progress + contributors */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card className="p-6">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-lg font-semibold">Collection Progress</CardTitle>
                                <CardDescription className="text-sm text-muted-foreground">Overview of content collected and processed</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="space-y-6">
                                    {/* Progress item */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">Case Studies</div>
                                            <div className="text-sm text-gray-500">24</div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="h-3 rounded-full bg-emerald-500 w-2/3" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">Technical Documentation</div>
                                            <div className="text-sm text-gray-500">18</div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="h-3 rounded-full bg-sky-500 w-1/2" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">Thought Leadership</div>
                                            <div className="text-sm text-gray-500">12</div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="h-3 rounded-full bg-violet-500 w-4/5" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card className="p-6">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-lg font-semibold">Active Contributors</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">SJ</div>
                                            <div>
                                                <div className="font-medium">Sarah Johnson</div>
                                                <div className="text-xs text-gray-500">3 submissions</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">MC</div>
                                            <div>
                                                <div className="font-medium">Michael Chen</div>
                                                <div className="text-xs text-gray-500">2 submissions</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center">ER</div>
                                            <div>
                                                <div className="font-medium">Emma Rodriguez</div>
                                                <div className="text-xs text-gray-500">1 submission</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Submissions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>Recently processed transcripts and documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Each submission row */}
                            {[
                                {name: 'Sarah Johnson', type: 'Case Study', date: '12/15/2024'},
                                {name: 'Michael Chen', type: 'Technical Documentation', date: '12/14/2024'},
                                {name: 'Emma Rodriguez', type: 'Thought Leadership', date: '12/13/2024'},
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <Image src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=F3F4F6&color=6B21A8`} alt={item.name} className="rounded-full" width={40} height={40} unoptimized />
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-sm text-gray-500">{item.type}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`text-xs px-3 py-1 rounded-full ${item.type === 'Case Study' ? 'bg-emerald-50 text-emerald-600' : item.type === 'Technical Documentation' ? 'bg-violet-50 text-violet-600' : 'bg-yellow-50 text-yellow-700'}`}>
                                            {item.type}
                                        </div>
                                        <div className="text-sm text-gray-500">{item.date}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
