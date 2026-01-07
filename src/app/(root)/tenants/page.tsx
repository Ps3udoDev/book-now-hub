// app/(root)/tenants/page.tsx
import Link from 'next/link'
// import { createClient } from '@/lib/supabase/server'

export default async function TenantsPage() {
  // En producción, cargar de Supabase:
  // const supabase = await createClient()
  // const { data: tenants } = await supabase.from('tenants').select('*')
  
  // Datos de ejemplo por ahora
  const tenants = [
    {
      id: '1',
      name: 'Elviz Studio',
      slug: 'elviz-studio',
      status: 'active',
      subscription_plan: 'pro',
      created_at: '2025-01-01',
      max_users: 10,
    },
    {
      id: '2',
      name: 'Denti Med',
      slug: 'denti-med',
      status: 'trial',
      subscription_plan: 'starter',
      created_at: '2025-01-05',
      max_users: 5,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas registradas en la plataforma.
          </p>
        </div>
        <Link
          href="tenants/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Tenant
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium">Empresa</th>
              <th className="text-left p-4 font-medium">Slug / URL</th>
              <th className="text-left p-4 font-medium">Plan</th>
              <th className="text-left p-4 font-medium">Estado</th>
              <th className="text-left p-4 font-medium">Usuarios</th>
              <th className="text-left p-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Creado: {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    /t/{tenant.slug}
                  </code>
                </td>
                <td className="p-4">
                  <span className="capitalize">{tenant.subscription_plan}</span>
                </td>
                <td className="p-4">
                  <StatusBadge status={tenant.status} />
                </td>
                <td className="p-4 text-muted-foreground">
                  Max: {tenant.max_users}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`tenants/${tenant.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Ver
                    </Link>
                    <span className="text-muted-foreground">|</span>
                    <Link
                      href={`tenants/${tenant.id}/modules`}
                      className="text-sm text-primary hover:underline"
                    >
                      Módulos
                    </Link>
                    <span className="text-muted-foreground">|</span>
                    <Link
                      href={`/t/${tenant.slug}/login`}
                      className="text-sm text-muted-foreground hover:text-foreground"
                      target="_blank"
                    >
                      Abrir ↗
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay tenants registrados.</p>
          <Link
            href="tenants/new"
            className="text-primary hover:underline mt-2 inline-block"
          >
            Crear el primero
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const labels: Record<string, string> = {
    active: 'Activo',
    trial: 'Prueba',
    suspended: 'Suspendido',
    cancelled: 'Cancelado',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.cancelled}`}>
      {labels[status] || status}
    </span>
  )
}