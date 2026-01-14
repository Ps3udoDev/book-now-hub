// src/components/specialists/schedule-editor.tsx
"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Copy, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    schedulesService,
    DAYS_OF_WEEK,
    TIME_SLOTS,
    type DayOfWeek,
    type WeeklySchedule,
} from "@/lib/services/schedules";
import type { Tables } from "@/types";

type SpecialistSchedule = Tables["specialist_schedules"]["Row"];

interface DayScheduleFormProps {
    day: (typeof DAYS_OF_WEEK)[number];
    schedule: SpecialistSchedule | null;
    specialistId: string;
    branchId: string;
    tenantId: string;
    onUpdate: () => void;
}

function DayScheduleForm({
    day,
    schedule,
    specialistId,
    branchId,
    tenantId,
    onUpdate,
}: DayScheduleFormProps) {
    const [isEnabled, setIsEnabled] = useState(!!schedule?.is_active);
    const [startTime, setStartTime] = useState(schedule?.start_time?.substring(0, 5) || "09:00");
    const [endTime, setEndTime] = useState(schedule?.end_time?.substring(0, 5) || "18:00");
    const [breakStart, setBreakStart] = useState(
        schedule?.break_start?.substring(0, 5) || ""
    );
    const [breakEnd, setBreakEnd] = useState(
        schedule?.break_end?.substring(0, 5) || ""
    );
    const [hasBreak, setHasBreak] = useState(!!schedule?.break_start);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isEnabled) {
                await schedulesService.upsertSchedule({
                    specialist_id: specialistId,
                    branch_id: branchId,
                    tenant_id: tenantId,
                    day_of_week: day.value,
                    start_time: startTime,
                    end_time: endTime,
                    break_start: hasBreak ? breakStart : null,
                    break_end: hasBreak ? breakEnd : null,
                    is_active: true,
                });
            } else if (schedule) {
                await schedulesService.updateSchedule(schedule.id, { is_active: false });
            }
            toast.success(`Horario de ${day.label} guardado`);
            onUpdate();
        } catch (error) {
            toast.error("Error al guardar horario");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!schedule) return;
        setIsSaving(true);
        try {
            await schedulesService.deleteSchedule(schedule.id);
            setIsEnabled(false);
            toast.success(`Horario de ${day.label} eliminado`);
            onUpdate();
        } catch (error) {
            toast.error("Error al eliminar horario");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex items-center gap-3 w-32">
                <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    disabled={isSaving}
                />
                <span className="font-medium">{day.short}</span>
            </div>

            {isEnabled ? (
                <div className="flex-1 space-y-3">
                    {/* Horario principal */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Select value={startTime} onValueChange={setStartTime} disabled={isSaving}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">a</span>
                        <Select value={endTime} onValueChange={setEndTime} disabled={isSaving}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 ml-4">
                            <Switch
                                id={`break-${day.value}`}
                                checked={hasBreak}
                                onCheckedChange={setHasBreak}
                                disabled={isSaving}
                            />
                            <Label htmlFor={`break-${day.value}`} className="text-sm">
                                Descanso
                            </Label>
                        </div>
                    </div>

                    {/* Break/descanso */}
                    {hasBreak && (
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-sm text-muted-foreground">Descanso:</span>
                            <Select value={breakStart} onValueChange={setBreakStart} disabled={isSaving}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Inicio" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map((time) => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">a</span>
                            <Select value={breakEnd} onValueChange={setBreakEnd} disabled={isSaving}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Fin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map((time) => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 text-muted-foreground text-sm">No trabaja</div>
            )}

            <div className="flex items-center gap-1">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        "Guardar"
                    )}
                </Button>
                {schedule && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

interface ScheduleEditorProps {
    specialistId: string;
    branchId: string;
    tenantId: string;
    weeklySchedule: WeeklySchedule;
    onUpdate: () => void;
}

export function ScheduleEditor({
    specialistId,
    branchId,
    tenantId,
    weeklySchedule,
    onUpdate,
}: ScheduleEditorProps) {
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

    const applyTemplate = async (
        template: "fulltime" | "morning" | "afternoon" | "weekend"
    ) => {
        setIsApplyingTemplate(true);
        try {
            await schedulesService.applyStandardSchedule(
                specialistId,
                branchId,
                tenantId,
                template
            );
            toast.success("Plantilla aplicada exitosamente");
            onUpdate();
        } catch (error) {
            toast.error("Error al aplicar plantilla");
        } finally {
            setIsApplyingTemplate(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Plantillas rápidas */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plantillas rápidas</CardTitle>
                    <CardDescription>
                        Aplica un horario predefinido con un clic
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate("fulltime")}
                            disabled={isApplyingTemplate}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Tiempo completo (L-V 9-18)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate("morning")}
                            disabled={isApplyingTemplate}
                        >
                            Mañanas (L-V 8-14)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate("afternoon")}
                            disabled={isApplyingTemplate}
                        >
                            Tardes (L-V 14-20)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate("weekend")}
                            disabled={isApplyingTemplate}
                        >
                            Fines de semana (S-D 10-18)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Horario por día */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Horario semanal</CardTitle>
                    <CardDescription>
                        Configura el horario de trabajo para cada día
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => (
                        <DayScheduleForm
                            key={day.value}
                            day={day}
                            schedule={weeklySchedule[day.value]}
                            specialistId={specialistId}
                            branchId={branchId}
                            tenantId={tenantId}
                            onUpdate={onUpdate}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}