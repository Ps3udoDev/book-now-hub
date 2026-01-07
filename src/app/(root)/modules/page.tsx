// app/(root)/modules/page.tsx

import { JSX } from "react"

export default function ModulesPage() {
    // En producción, cargar de Supabase
    const modules = [
        // Core modules
        { id: '1', slug: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', category: 'core', is_core: true, status: 'active' },
        { id: '2', slug: 'appointments', name: 'Citas', icon: 'Calendar', category: 'core', is_core: true, status: 'active' },
        { id: '3', slug: 'inventory', name: 'Inventario', icon: 'Package', category: 'core', is_core: true, status: 'active' },
        { id: '4', slug: 'staff', name: 'Personal', icon: 'Users', category: 'core', is_core: true, status: 'active' },
        { id: '5', slug: 'pos', name: 'Punto de Venta', icon: 'CreditCard', category: 'core', is_core: true, status: 'active' },
        { id: '6', slug: 'reports', name: 'Reportes', icon: 'BarChart3', category: 'core', is_core: true, status: 'active' },
        // Addon modules
        { id: '7', slug: 'ecommerce', name: 'E-Commerce', icon: 'ShoppingCart', category: 'addon', is_core: false, status: 'active' },
        { id: '8', slug: 'campaigns', name: 'Campañas', icon: 'Megaphone', category: 'addon', is_core: false, status: 'active' },
        { id: '9', slug: 'cafeteria', name: 'Cafetería', icon: 'Coffee', category: 'addon', is_core: false, status: 'beta' },
    ]

    const coreModules = modules.filter(m => m.is_core)
    const addonModules = modules.filter(m => !m.is_core)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Módulos</h1>
                <p className="text-muted-foreground">
                    Gestiona los módulos disponibles en la plataforma.
                </p>
            </div>

            {/* Core Modules */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Módulos Core</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Estos módulos están incluidos en todos los planes y se activan automáticamente.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {coreModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </div>

            {/* Addon Modules */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Módulos Addon</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Módulos opcionales que se pueden activar por tenant según sus necesidades.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {addonModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </div>
        </div>
    )
}

interface Module {
    id: string
    slug: string
    name: string
    icon: string
    category: string
    is_core: boolean
    status: string
}

function ModuleCard({ module }: { module: Module }) {
    return (
        <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ModuleIcon name={module.icon} />
                    </div>
                    <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-sm text-muted-foreground">{module.slug}</p>
                    </div>
                </div>
                <StatusBadge status={module.status} />
            </div>
            <div className="mt-4 flex items-center gap-2">
                {module.is_core && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Core
                    </span>
                )}
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">
                    {module.category}
                </span>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        beta: 'bg-blue-100 text-blue-700',
        deprecated: 'bg-yellow-100 text-yellow-700',
        coming_soon: 'bg-gray-100 text-gray-700',
    }

    return (
        <span className={`text-xs px-2 py-0.5 rounded ${styles[status] || styles.coming_soon}`}>
            {status === 'coming_soon' ? 'Próximamente' : status}
        </span>
    )
}

// Iconos simplificados (en producción usa lucide-react)
function ModuleIcon({ name }: { name: string }) {
    const icons: Record<string, JSX.Element> = {
        LayoutDashboard: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
        ),
        Calendar: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        Package: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
        Users: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        CreditCard: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        BarChart3: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        ShoppingCart: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        Megaphone: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
        ),
        Coffee: (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16m-7 8h3a4 4 0 004-4V9H4v4a4 4 0 004 4h3m0 0v4m0-4h-3m3 0h3" />
            </svg>
        ),
    }

    return icons[name] || icons.Package
}