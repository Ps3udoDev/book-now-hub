"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActiveCustomers } from "@/hooks/supabase/use-customers";
import { useActiveServices } from "@/hooks/supabase/use-services";
import { getPreset, getPresets } from "@/lib/campaigns/presets";
import { campaignsService } from "@/lib/services/campaigns";
import { segmentsService } from "@/lib/services/segments";
import type { CampaignType, SegmentRules } from "@/types";
import { CAMPAIGN_TYPE_LABELS } from "./campaign-meta";
import { MessageEditor } from "./message-editor";
import { RuleBuilder } from "./rule-builder";
import { SegmentPreview } from "./segment-preview";

interface CampaignWizardProps {
  tenantId: string;
  tenantSlug: string;
}

const STEPS = ["Tipo", "Segmento", "Mensaje", "Revisar"];

export function CampaignWizard({ tenantId, tenantSlug }: CampaignWizardProps) {
  const router = useRouter();
  const basePath = `/t/${tenantSlug}`;

  const { services } = useActiveServices(tenantId);
  const { customers } = useActiveCustomers(tenantId);
  const serviceOptions = useMemo(
    () => services.map((s) => ({ id: s.id, name: s.name })),
    [services],
  );

  const [step, setStep] = useState(0);
  const [type, setType] = useState<CampaignType>("custom");
  const [name, setName] = useState("");
  const [rules, setRules] = useState<SegmentRules>({
    match: "all",
    conditions: [],
  });
  const [message, setMessage] = useState("Hola {{first_name}}, ");
  const [saveAsSegment, setSaveAsSegment] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectPreset = (t: CampaignType) => {
    const preset = getPreset(t);
    setType(t);
    setRules(preset.defaultRules);
    setMessage(preset.defaultMessage);
    if (!name) setName(preset.name);
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return rules.conditions.length > 0;
    if (step === 2) return message.trim().length > 0;
    return true;
  };

  /** Crea la campaña (y opcionalmente el segmento). Devuelve el id. */
  const persist = async (): Promise<string> => {
    let segmentId: string | null = null;
    if (saveAsSegment && segmentName.trim()) {
      const segment = await segmentsService.create({
        tenant_id: tenantId,
        name: segmentName.trim(),
        rules,
      });
      segmentId = segment.id;
    }
    const campaign = await campaignsService.create({
      tenant_id: tenantId,
      name: name.trim() || CAMPAIGN_TYPE_LABELS[type],
      campaign_type: type,
      segment_id: segmentId,
      rules_snapshot: segmentId ? null : rules,
      message_template: message,
    });
    return campaign.id;
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await persist();
      toast.success("Campaña guardada como borrador");
      router.push(`${basePath}/campaigns`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialize = async () => {
    setSubmitting(true);
    try {
      const id = await persist();
      await campaignsService.materialize(id);
      toast.success("Destinatarios materializados");
      router.push(`${basePath}/campaigns/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-border" aria-hidden />
            )}
          </div>
        ))}
      </div>

      {/* Paso 1: Tipo/preset */}
      {step === 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {getPresets().map((preset) => (
            <Card
              key={preset.type}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                type === preset.type ? "border-primary ring-1 ring-primary" : ""
              }`}
              onClick={() => selectPreset(preset.type)}
            >
              <CardContent className="p-4">
                <p className="font-medium">{preset.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {preset.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paso 2: Segmento */}
      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Nombre de la campaña</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Reactivación julio"
                className="mt-1"
              />
            </div>
            <RuleBuilder
              rules={rules}
              onChange={setRules}
              services={serviceOptions}
            />
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="save-segment"
                checked={saveAsSegment}
                onCheckedChange={setSaveAsSegment}
              />
              <div className="flex-1">
                <Label htmlFor="save-segment">Guardar como segmento</Label>
                <p className="text-xs text-muted-foreground">
                  Reutilízalo en otras campañas.
                </p>
              </div>
            </div>
            {saveAsSegment && (
              <Input
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="Nombre del segmento"
              />
            )}
          </div>
          <SegmentPreview tenantId={tenantId} rules={rules} />
        </div>
      )}

      {/* Paso 3: Mensaje */}
      {step === 2 && (
        <MessageEditor
          value={message}
          onChange={setMessage}
          sampleCustomer={customers[0] ?? null}
        />
      )}

      {/* Paso 4: Revisar */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium">{name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span>{CAMPAIGN_TYPE_LABELS[type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condiciones</span>
                <span>{rules.conditions.length}</span>
              </div>
            </CardContent>
          </Card>
          <SegmentPreview tenantId={tenantId} rules={rules} />
          <div>
            <Label>Mensaje</Label>
            <div className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
              {message}
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar borrador
            </Button>
            <Button onClick={handleMaterialize} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Materializar destinatarios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
