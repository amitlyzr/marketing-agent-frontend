"use client"

import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Dashboard() {
    const { isAuthenticated, userId, email, token } = useAuth();

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Marketing Agent Dashboard</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>Your account details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p><strong>User ID:</strong> {userId}</p>
                                <p><strong>Email:</strong> {email || 'Not available'}</p>
                                <p><strong>Status:</strong> <span className="text-green-600">Active</span></p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Email Management</CardTitle>
                            <CardDescription>Manage your email campaigns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full">
                                View Email Lists
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Configuration</CardTitle>
                            <CardDescription>Configure your email settings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline">
                                Setup SMTP
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Scheduler</CardTitle>
                            <CardDescription>Manage email scheduling</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline">
                                Configure Schedule
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Interviews</CardTitle>
                            <CardDescription>Manage interview processes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline">
                                View Interviews
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>View your campaign performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline">
                                View Reports
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
