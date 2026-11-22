import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "./app/page";

test("la página de inicio muestra un título principal", () => {
  const html = renderToStaticMarkup(createElement(Home));
  expect(html).toMatch(/<h1\b[^>]*>[\s\S]*?<\/h1>/);
});