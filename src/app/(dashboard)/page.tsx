"use client"

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { EmailsPage } from "@/components/pages/EmailsPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { KnowledgeBasePage } from "@/components/pages/KnowledgeBasePage";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <DashboardPage />
      <EmailsPage />
      <SettingsPage />
      <KnowledgeBasePage />
    </MainLayout>
  );
}
