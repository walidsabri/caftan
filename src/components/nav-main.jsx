"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function NavMain({
  items
}) {
  return (
    <>
      {items.map((group, index) => (
        <div key={group.label}>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm text-bold text-gray-500">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton tooltip={item.title} asChild className="h-10 py-3 text-gray-500">
                      <a href={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {index < items.length - 1 && <Separator className="my-2" />}
        </div>
      ))}
    </>
  );
}
