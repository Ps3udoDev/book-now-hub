// src/app/t/[tenant]/workstations/new/page.tsx
"use client";

import { WorkstationForm } from "@/components/workstations";

export default function NewWorkstationPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Nuevo puesto de trabajo
                </h1>
                <p className="text-muted-foreground">
                    Configura una nueva estación en tu salón
                </p>
            </div>
            <WorkstationForm />
        </div>
    );
}