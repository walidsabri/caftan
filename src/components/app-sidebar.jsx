"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import Image from "next/image"
import logo from "../../public/logo.png"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CommandIcon, LayoutDashboardIcon, ShoppingBagIcon, Truck, Package, Layers} from "lucide-react"

const data = {
  navMain: [
    {
      label: "OVERVIEW",
      items: [
        {
          title: "Aperçu",
          url: "/admin",
          icon: (
            <LayoutDashboardIcon />
          ),
        },
        {
          title: "Commandes",
          url: "/admin/orders",
          icon: (
            <ShoppingBagIcon />
          ),
        },
        {
          title: "Suivre les commandes",
          url: "/admin/tracking",
          icon: (
            <Truck />
          ),
        },
      ],
    },
    {
      label: "STORE",
      items:[
        {
          title: "Produits",
          url:"/admin/products",
          icon:(
            <Package/>
          )
        },
        {
          title:'Catégories',
          url:'/admin/categories',
          icon:(
            <Layers/>
          )
        }
      ]
    }
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/admin" className="mb-5">
                <Image src={logo} alt="CAFTAN logo" width={50} height={50}/>
                <span className="text-base">Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  );
}
