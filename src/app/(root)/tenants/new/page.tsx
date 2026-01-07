// app/(root)/tenants/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    legal_name: '',
    country_code: 'EC',
    timezone: 'America/Guayaquil',
    currency_code: 'USD',
    subscription_plan: 'starter',
    max_users: 5,
  })

  // Auto-generar slug desde el nombre
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    setFormData({ ...formData, name, slug })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validaciones
      if (!formData.name.trim()) {
        throw new Error('El nombre es requerido')
      }
      if (!formData.slug.trim()) {
        throw new Error('El slug es requerido')
      }
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        throw new Error('El slug solo puede contener letras minúsculas, números y guiones')
      }

      // En producción, guardar en Supabase:
      // const supabase = getSupabaseBrowserClient()
      // const { error: insertError } = await supabase.from('tenants').insert({
      //   ...formData,
      //   status: 'trial',
      // })
      // if (insertError) throw insertError

      // Por ahora, simular éxito
      console.log('Crear tenant:', formData)
      
      // Redirigir a la lista
      router.push('tenants')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="tenants"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-2"
        >
          ← Volver a tenants
        </Link>
        <h1 className="text-2xl font-bold">Nuevo Tenant</h1>
        <p className="text-muted-foreground">
          Registra una nueva empresa en la plataforma.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Información básica */}
        <div className="space-y-4 p-6 rounded-lg border bg-card">
          <h2 className="font-semibold">Información básica</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre de la empresa *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Elviz Studio"
                required
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug (URL) *
              </label>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-1">/t/</span>
                <input
                  id="slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  placeholder="elviz-studio"
                  required
                  className="flex-1 h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="legal_name" className="text-sm font-medium">
              Razón social
            </label>
            <input
              id="legal_name"
              type="text"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              placeholder="Elviz Studio S.A.S."
              className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Configuración regional */}
        <div className="space-y-4 p-6 rounded-lg border bg-card">
          <h2 className="font-semibold">Configuración regional</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="country_code" className="text-sm font-medium">
                País
              </label>
              <select
                id="country_code"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="EC">Ecuador</option>
                <option value="CO">Colombia</option>
                <option value="PE">Perú</option>
                <option value="MX">México</option>
                <option value="VE">Venezuela</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency_code" className="text-sm font-medium">
                Moneda
              </label>
              <select
                id="currency_code"
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="USD">USD - Dólar</option>
                <option value="COP">COP - Peso Colombiano</option>
                <option value="PEN">PEN - Sol Peruano</option>
                <option value="MXN">MXN - Peso Mexicano</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="text-sm font-medium">
                Zona horaria
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="America/Guayaquil">Ecuador (GMT-5)</option>
                <option value="America/Bogota">Colombia (GMT-5)</option>
                <option value="America/Lima">Perú (GMT-5)</option>
                <option value="America/Mexico_City">México (GMT-6)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="space-y-4 p-6 rounded-lg border bg-card">
          <h2 className="font-semibold">Plan de suscripción</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="subscription_plan" className="text-sm font-medium">
                Plan
              </label>
              <select
                id="subscription_plan"
                value={formData.subscription_plan}
                onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="starter">Starter (5 usuarios)</option>
                <option value="pro">Pro (15 usuarios)</option>
                <option value="enterprise">Enterprise (ilimitado)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="max_users" className="text-sm font-medium">
                Máximo de usuarios
              </label>
              <input
                id="max_users"
                type="number"
                min="1"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 5 })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creando...' : 'Crear Tenant'}
          </button>
          <Link
            href="tenants"
            className="h-10 px-6 rounded-md border text-sm font-medium hover:bg-accent transition-colors inline-flex items-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}