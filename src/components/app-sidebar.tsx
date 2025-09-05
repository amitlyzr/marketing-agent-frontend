"use client"

import * as React from "react"
import {
    IconDashboard,
    IconDatabase,
    IconFileAi,
    IconMail,
    IconInnerShadowTop,
    IconSettings
} from "@tabler/icons-react"

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { useTheme } from "next-themes"

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "#",
            icon: IconDashboard,
            value: "dashboard"
        },
        {
            title: "Generate Content",
            url: "#",
            icon: IconFileAi,
            value: "agent-chat"
        },
        {
            title: "Knowledge Base",
            url: "#",
            icon: IconDatabase,
            value: "knowledge-base"
        },
        {
            title: "Emails",
            url: "#",
            icon: IconMail,
            value: "emails"
        },
        {
            title: "Settings",
            url: "#",
            icon: IconSettings,
            value: "settings"
        }
    ]
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
    const { setTheme } = useTheme()

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">LyzrAI</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} activeTab={activeTab} onTabChange={onTabChange} />
            </SidebarContent>
        </Sidebar>
    )
}
