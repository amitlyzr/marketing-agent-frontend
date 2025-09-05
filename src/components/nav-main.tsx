"use client"

import { type Icon } from "@tabler/icons-react"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
    items,
    activeTab,
    onTabChange,
}: {
    items: {
        title: string
        url: string
        icon?: Icon
        value: string
    }[]
    activeTab?: string
    onTabChange?: (tab: string) => void
}) {
    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                                tooltip={item.title}
                                onClick={() => onTabChange?.(item.value)}
                                className={`transition-colors duration-200 ${
                                    activeTab === item.value 
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'hover:bg-accent hover:text-accent-foreground'
                                }`}
                                isActive={activeTab === item.value}
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
