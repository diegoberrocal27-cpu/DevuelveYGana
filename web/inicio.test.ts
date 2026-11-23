import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import Home from "./app/page";

// Fuera de Next.js, <Link> se reemplaza por un enlace simple.
vi.mock("next/link", () => ({
  default: ({ href, children, ...resto }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...resto }, children),
}));

test("la página de inicio muestra un título principal", () => {
  const html = renderToStaticMarkup(createElement(Home));
  expect(html).toMatch(/<h1\b[^>]*>[\s\S]*?<\/h1>/);
});

test("la página de inicio lleva a «Perdí algo» y a «Encontré algo»", () => {
  const html = renderToStaticMarkup(createElement(Home));
  expect(html).toContain('href="/perdi"');
  expect(html).toContain('href="/encontre"');
});
