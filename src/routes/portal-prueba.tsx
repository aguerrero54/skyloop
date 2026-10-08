import { createFileRoute, redirect } from "@tanstack/react-router";

// Acceso rápido de prueba al portal del diseñador para editar su interfaz.
export const Route = createFileRoute("/portal-prueba")({
  head: () => ({
    meta: [
      { title: "Portal de prueba — Skyloop" },
      { name: "description", content: "Vista de prueba del portal del diseñador." },
      { property: "og:title", content: "Portal de prueba — Skyloop" },
      { property: "og:description", content: "Vista de prueba del portal del diseñador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({
      to: "/tareas/$token",
      params: { token: "0038cbb8e8818fd3f772996e4537625deefe73477f381478" },
    });
  },
});
