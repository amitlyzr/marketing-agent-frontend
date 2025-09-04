"use client"

import { ReactNode } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Mail, Settings, Book } from "lucide-react";

interface MainLayoutProps {
    children: ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export function MainLayout({ children, activeTab = "dashboard", onTabChange }: MainLayoutProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="p-6">
                        <h1 className="text-2xl font-bold text-center mb-4">Marketing Agent App</h1>
                        <p className="text-gray-600 text-center">
                            Welcome to your marketing automation platform. Please authenticate to continue.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Marketing Agent Dashboard</h1>
                    <p className="text-gray-600">Manage your email campaigns and automation</p>
                </div>

                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="emails" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Emails
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="knowledge-base" className="flex items-center gap-2" disabled={false}>
                            <Book className="h-4 w-4" />
                            Knowledge Base
                        </TabsTrigger>
                    </TabsList>

                    {children}
                </Tabs>
            </div>
        </div>
    );
}
