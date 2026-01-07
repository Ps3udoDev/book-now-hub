// src/components/shared/app-header.tsx
"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItemType[];
}

export function AppHeader({ breadcrumbs }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        {breadcrumbs?.length ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={`${item.label}-${item.href ?? "page"}-${index}`}>
                    {index > 0 && <BreadcrumbSeparator />}

                    <BreadcrumbItem>
                      {item.href && !isLast ? (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle variant="dropdown" />
      </div>
    </header>
  );
}
