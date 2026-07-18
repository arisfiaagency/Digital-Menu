import { expect, test } from "@playwright/test";

test("removed welcome, menu, and QR routes return not found", async ({ request }) => {
  const paths = [
    "/demo",
    "/menu",
    "/demo/menu",
    "/demo/menu/category/coffee",
    "/demo/menu/item/americano",
    "/admin/qr-code",
    "/admin/qr-code/print"
  ];

  for (const path of paths) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});
