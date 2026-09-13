import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/skyloop/AppShell";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Skyloop Control" },
      {
        name: "description",
        content:
          "Accede al panel financiero de Skyloop con tu correo y contraseña para ver clientes, ingresos, gastos y rentabilidad.",
      },
      { property: "og:title", content: "Entrar — Skyloop Control" },
      {
        property: "og:description",
        content: "Acceso privado al control financiero de la agencia Skyloop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Cuenta creada", {
            description: "Revisa tu correo para confirmarla y luego entra.",
          });
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) {
      toast.error("No se pudo continuar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-panel">
        <BrandMark size="large" />
        <p className="mt-5 text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
          SKYLOOP
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
          Control financiero de tu agencia.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administra clientes, ingresos, gastos, proveedores y rentabilidad desde cualquier
          dispositivo.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Tu nombre
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? "Un momento…"
              : mode === "signup"
                ? "Crear cuenta"
                : "Entrar al dashboard"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "signin"
            ? "¿Primera vez? Crear una cuenta"
            : "Ya tengo cuenta, quiero entrar"}
        </button>
      </div>
    </div>
  );
}
