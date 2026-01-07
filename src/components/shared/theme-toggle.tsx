// src/components/shared/theme-toggle.tsx
"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
    variant?: "dropdown" | "toggle" | "icon-only";
    className?: string;
}

export function ThemeToggle({ variant = "dropdown", className }: ThemeToggleProps) {
    const { mode, setMode, resolvedMode } = useTheme();

    // Variante simple: solo alterna entre light y dark
    if (variant === "toggle") {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
                            className={cn("h-9 w-9", className)}
                        >
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Cambiar tema</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Cambiar a modo {resolvedMode === "dark" ? "claro" : "oscuro"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Variante icon-only: sin tooltip, más compacto
    if (variant === "icon-only") {
        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
                className={cn("h-9 w-9", className)}
            >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
            </Button>
        );
    }

    // Variante dropdown: con opción de sistema
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Cambiar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => setMode("light")}
                    className={cn(mode === "light" && "bg-accent")}
                >
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setMode("dark")}
                    className={cn(mode === "dark" && "bg-accent")}
                >
                    <Moon className="mr-2 h-4 w-4" />
                    Oscuro
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setMode("system")}
                    className={cn(mode === "system" && "bg-accent")}
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    Sistema
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}