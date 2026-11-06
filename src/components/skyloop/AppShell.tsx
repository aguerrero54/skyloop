import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Settings2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { monthLabel } from "@/lib/finance";
import { SkyloopProvider, useSkyloop } from "@/lib/skyloop-context";
import { RecordModal } from "@/components/skyloop/RecordModal";
import { DashboardCustomizer } from "@/components/skyloop/DashboardCustomizer";

export const navItems = [
  { to: "/dashboard", icon: "◫", label: "Dashboard", eyebrow: "RESUMEN FINANCIERO" },
  { to: "/clientes", icon: "◎", label: "Clientes", eyebrow: "CARTERA DE MARCAS" },
  { to: "/servicios", icon: "◇", label: "Servicios", eyebrow: "CATÁLOGO DE SKYLOOP" },
  { to: "/equipo", icon: "♙", label: "Equipo / Proveedores", eyebrow: "SUBCONTRATADOS" },
  { to: "/entregables", icon: "☑", label: "Entregables", eyebrow: "CUMPLIMIENTO POR CLIENTE" },
  { to: "/facturas", icon: "🧾", label: "Facturas", eyebrow: "FACTURACIÓN DE CLIENTES" },
  { to: "/ingresos", icon: "↗", label: "Ingresos", eyebrow: "FACTURACIÓN Y COBROS" },
  { to: "/gastos", icon: "↘", label: "Gastos", eyebrow: "COSTOS DE LA AGENCIA" },
  { to: "/gastos-fijos", icon: "▦", label: "Gastos fijos", eyebrow: "COSTOS FIJOS DE LA AGENCIA" },
  { to: "/por-cobrar", icon: "◷", label: "Cuentas por cobrar", eyebrow: "CLIENTES / PENDIENTES" },
  { to: "/por-pagar", icon: "◴", label: "Cuentas por pagar", eyebrow: "PROVEEDORES / OBLIGACIONES" },
  { to: "/reportes", icon: "▤", label: "Reportes", eyebrow: "MARGEN POR CLIENTE Y EXPORTACIÓN" },
  { to: "/configuracion", icon: "⚙", label: "Configuración", eyebrow: "PREFERENCIAS" },
] as const;

function BrandMark({ size = "small" }: { size?: "small" | "large" }) {
  return (
    <div
      className={cn(
        "grid place-items-center bg-gradient-to-br from-brand to-brand/65 font-black text-brand-foreground shadow-brand",
        size === "large" ? "size-14 rounded-[18px] text-2xl" : "size-9 rounded-xl text-base",
      )}
    >
      S
    </div>
  );
}

export { BrandMark };

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", auth.user.id)
        .maybeSingle();
      return {
        name: data?.display_name ?? auth.user.email?.split("@")[0] ?? "Usuario",
      };
    },
  });

  const name = profile.data?.name ?? "…";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar px-3.5 py-6">
      <div className="flex items-center gap-3 px-2 pb-7">
        <BrandMark />
        <div>
          <strong className="block text-[17px] leading-tight text-foreground">Skyloop</strong>
          <span className="text-[11px] text-muted-foreground">Control</span>
        </div>
      </div>

      <nav className="grid gap-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-sidebar-nav-muted transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            activeProps={{ className: "active font-semibold" }}
          >
            <span className="w-5 text-center opacity-90">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="leading-tight">
            <b className="block text-sm text-foreground">{name}</b>
            <small className="text-[10px] text-muted-foreground">Administrador</small>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Cerrar sesión"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function TopBar({
  onOpenMenu,
  onCustomize,
}: {
  onOpenMenu: () => void;
  onCustomize: () => void;
}) {
  const { month, months, setMonth } = useSkyloop();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active =
    navItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ??
    navItems[0];
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-5 py-4 backdrop-blur-lg lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg border border-border p-2 text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-4" />
        </button>
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
            {active.eyebrow}
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-foreground lg:text-2xl">{active.label}</h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!/^\/clientes\/[^/]+/.test(pathname) && pathname !== "/entregables" && (
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            aria-label="Mes"
          >
            {months.map((item) => (
              <option key={item} value={item}>
                {monthLabel(item)}
              </option>
            ))}
          </select>
        )}

        <NotificationBell />
        {isDashboard && (
          <button
            type="button"
            onClick={onCustomize}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            <Settings2 className="size-4" />
            Personalizar
          </button>
        )}
      </div>
    </header>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read).length;
  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative rounded-lg border border-border p-2 text-foreground transition-colors hover:bg-secondary"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1.5">
            <b className="text-sm text-foreground">Notificaciones</b>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-primary-soft hover:underline">
                Marcar todo como leído
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sin notificaciones</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={cn("rounded-lg px-2 py-2", !n.read && "bg-secondary")}>
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("es-DO")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShellBody({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { isLoading, error } = useSkyloop();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[235px] lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px]">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-2 top-2 z-10 text-muted-foreground"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:ml-[235px]">
        <TopBar
          onOpenMenu={() => setMenuOpen(true)}
          onCustomize={() => setCustomizeOpen(true)}
        />
        <main className="px-5 py-6 lg:px-8">
          {error ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
              No se pudieron cargar los datos: {error.message}
            </div>
          ) : isLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Cargando datos…</div>
          ) : (
            children
          )}
        </main>
      </div>

      <RecordModal />
      <DashboardCustomizer open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SkyloopProvider>
      <ShellBody>{children}</ShellBody>
    </SkyloopProvider>
  );
}
