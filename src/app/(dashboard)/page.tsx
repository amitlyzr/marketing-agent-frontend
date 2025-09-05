"use client"

import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/components/providers/AuthProvider";
import { DashboardPage } from "@/components/pages/DashboardPage";
import AgentChatPage from "@/components/pages/ChatAgent";
import { KnowledgeBasePage } from "@/components/pages/KnowledgeBasePage";
import { EmailsPage } from "@/components/pages/EmailsPage";
import { SettingsPage } from "@/components/pages/SettingsPage";

export default function Home() {
  const { isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 54)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset>
        <SiteHeader activeTab={activeTab} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <DashboardPage />
            <AgentChatPage />
            <KnowledgeBasePage />
            <EmailsPage />
            <SettingsPage />
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
