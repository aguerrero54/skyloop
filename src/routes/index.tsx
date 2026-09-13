import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/skyloop/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skyloop Control — Gestión financiera de la agencia" },
      {
        name: "description",
        content:
          "Control financiero de Skyloop: clientes, ingresos, gastos, proveedores y rentabilidad por marca en un solo lugar.",
      },
      { property: "og:title", content: "Skyloop Control — Gestión financiera de la agencia" },
      {
        property: "og:description",
        content:
          "Panel privado para administrar clientes, ingresos, gastos, proveedores y rentabilidad de la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto w-fit">
          <BrandMark size="large" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Skyloop Control</h1>
        <p className="mt-2 text-sm text-muted-foreground">Abriendo tu panel financiero…</p>
      </div>
    </div>
  );
}
