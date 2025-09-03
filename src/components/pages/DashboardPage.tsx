"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/providers/AuthProvider';
import { emailApi, smtpApi, schedulerApi } from '@/lib/api';

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
}export function DashboardPage() {
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
        }
    });
    const [loading, setLoading] = useState(true);

    // Dynamic pie chart data based on real stats
    const getPieData = () => [
        { name: 'Pending', value: stats.emailStatusBreakdown.pending, color: '#94A3B8' },
        { name: 'Sent', value: stats.emailStatusBreakdown.sent, color: '#3B82F6' },
        { name: 'Delivered', value: stats.emailStatusBreakdown.delivered, color: '#10B981' },
        { name: 'Opened', value: stats.emailStatusBreakdown.opened, color: '#8B5CF6' },
        { name: 'Exhausted', value: stats.emailStatusBreakdown.exhausted, color: '#EF4444' },
    ].filter(item => item.value > 0); // Only show non-zero values

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!userId) return;

            try {
                setLoading(true);

                // Load email count
                const emails = await emailApi.getEmails(userId);
                const totalEmails = emails.length;

                // Check SMTP configuration
                let smtpConfigured = false;
                try {
                    await smtpApi.getSMTP(userId);
                    smtpConfigured = true;
                } catch (error) {
                    // SMTP not configured
                }

                // Check scheduler configuration
                let schedulerConfigured = false;
                try {
                    await schedulerApi.getScheduler(userId);
                    schedulerConfigured = true;
                } catch (error) {
                    // Scheduler not configured
                }

                // Calculate email status breakdown
                const emailStatusBreakdown = {
                    pending: (emails as Email[]).filter((e: Email) => e.status === 'pending').length,
                    sent: (emails as Email[]).filter((e: Email) => e.status === 'sent').length,
                    delivered: (emails as Email[]).filter((e: Email) => e.status === 'delivered').length,
                    opened: (emails as Email[]).filter((e: Email) => e.status === 'opened').length,
                    exhausted: (emails as Email[]).filter((e: Email) => e.status === 'exhausted').length,
                };

                // Calculate interview statistics (placeholder - we'll make real API calls later)
                const interviewsStarted = Math.floor(totalEmails * 0.8); // 80% started
                const interviewsCompleted = Math.floor(totalEmails * 0.3); // 30% completed

                setStats({
                    totalEmails,
                    smtpConfigured,
                    schedulerConfigured,
                    emailsSentToday: Math.floor(Math.random() * 50), // Placeholder for now
                    interviewsStarted,
                    interviewsCompleted,
                    emailStatusBreakdown,
                });
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [userId]);

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
        <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Setup Status */}
            {(!stats.smtpConfigured || !stats.schedulerConfigured) && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-800">Setup Required</CardTitle>
                        <CardDescription className="text-yellow-700">
                            Complete these steps to start your email automation
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {!stats.smtpConfigured && (
                                <p className="text-sm text-yellow-700">• Configure SMTP settings in the Settings tab</p>
                            )}
                            {!stats.schedulerConfigured && (
                                <p className="text-sm text-yellow-700">• Set up email scheduling in the Settings tab</p>
                            )}
                            {stats.totalEmails === 0 && (
                                <p className="text-sm text-yellow-700">• Upload email lists in the Emails tab</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEmails}</div>
                        <p className="text-xs text-muted-foreground">
                            Email addresses in database
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SMTP Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.smtpConfigured ? (
                                <span className="text-green-600">✓ Configured</span>
                            ) : (
                                <span className="text-red-600">✗ Not Set</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email server configuration
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Scheduler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.schedulerConfigured ? (
                                <span className="text-green-600">✓ Active</span>
                            ) : (
                                <span className="text-red-600">✗ Inactive</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email scheduling status
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.emailsSentToday}</div>
                        <p className="text-xs text-muted-foreground">
                            Sent in the last 24 hours
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Interview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interviews Started</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.interviewsStarted}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalEmails > 0 ? `${Math.round((stats.interviewsStarted / stats.totalEmails) * 100)}% of total` : '0% of total'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interviews Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.interviewsCompleted}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.interviewsStarted > 0 ? `${Math.round((stats.interviewsCompleted / stats.interviewsStarted) * 100)}% completion rate` : '0% completion rate'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Interviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-600">{stats.interviewsStarted - stats.interviewsCompleted}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting completion
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Email Performance Trend</CardTitle>
                        <CardDescription>Monthly email metrics overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={areaData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="emails" stackId="1" stroke="#8884d8" fill="#8884d8" />
                                <Area type="monotone" dataKey="opens" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                                <Area type="monotone" dataKey="clicks" stackId="1" stroke="#ffc658" fill="#ffc658" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Activity</CardTitle>
                        <CardDescription>Email activity by day of week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="sent" fill="#8884d8" />
                                <Bar dataKey="opened" fill="#82ca9d" />
                                <Bar dataKey="clicked" fill="#ffc658" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Line Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Conversion Rates</CardTitle>
                        <CardDescription>Open and click rates over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={areaData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="opens" stroke="#8884d8" strokeWidth={2} />
                                <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Email Status Distribution</CardTitle>
                        <CardDescription>Current breakdown of email statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.totalEmails > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={getPieData()}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {getPieData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                <div className="text-center">
                                    <p>No email data available</p>
                                    <p className="text-sm">Upload emails to see distribution</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
