// app/page.tsx
import Link from 'next/link'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg" />
                        <span className="font-semibold text-lg">SaaS Platform</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Admin
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <main className="container mx-auto px-4 py-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                        Plataforma SaaS
                        <span className="block text-primary">Multi-Tenant</span>
                    </h1>
                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Gestiona múltiples negocios desde una sola plataforma.
                        Módulos personalizables, templates adaptables y configuración por cliente.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Acceder al Admin
                        </Link>
                        <Link
                            href="#demo"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            Ver Demo
                        </Link>
                    </div>
                </div>

                {/* Features Preview */}
                <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="p-6 rounded-lg border bg-card">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Multi-Tenant</h3>
                        <p className="text-sm text-muted-foreground">
                            Cada cliente tiene su propio espacio aislado con datos, configuración y branding personalizado.
                        </p>
                    </div>

                    <div className="p-6 rounded-lg border bg-card">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Módulos</h3>
                        <p className="text-sm text-muted-foreground">
                            Activa solo los módulos que cada cliente necesita. Desde citas hasta e-commerce.
                        </p>
                    </div>

                    <div className="p-6 rounded-lg border bg-card">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Temas & Templates</h3>
                        <p className="text-sm text-muted-foreground">
                            Personaliza colores, layout y componentes para cada cliente.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t mt-24">
                <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
                    © 2025 SaaS Platform. Built with Next.js, Supabase & shadcn/ui.
                </div>
            </footer>
        </div>
    )
}