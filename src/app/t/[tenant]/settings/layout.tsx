// src/app/t/[tenant]/settings/layout.tsx
"use client";

import { type ReactNode } from "react";

interface SettingsLayoutProps {
    children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <div className="max-w-6xl mx-auto">
            {children}
        </div>
    );
}
