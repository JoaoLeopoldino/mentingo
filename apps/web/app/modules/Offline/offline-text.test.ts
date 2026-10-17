import { describe, expect, it } from "vitest";

import { prepareOfflineText } from "./offline-text";
describe("offline text isolation", () => {
  it("retains formatting without executable attributes or requests", () => {
    const result = prepareOfflineText(
      '<h2 onclick="alert(1)">Protecção</h2><p>Use <strong>capacete</strong>.</p><img src="https://private.test/image"><script>fetch("/secret")</script><a href="https://test">Manual</a>',
    );
    expect(result.html).toBe("<h2>Protecção</h2><p>Use <strong>capacete</strong>.</p>Manual");
    expect(result.hadUnsupported).toBe(true);
  });
  it("preserves Portuguese Unicode and removes embedded media", () => {
    expect(
      prepareOfflineText('<p>Acção de formação — Huíla</p><iframe src="https://test"></iframe>'),
    ).toEqual({ html: "<p>Acção de formação — Huíla</p>", hadUnsupported: true });
  });
});
