/** Text-only subset: no URLs, executable attributes or embedded resources. */
export function prepareOfflineText(source: string) {
  const document = new DOMParser().parseFromString(source, "text/html");
  const allowed = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "UL",
    "OL",
    "LI",
    "STRONG",
    "EM",
    "B",
    "I",
    "U",
    "S",
    "BR",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
    "HR",
    "TABLE",
    "TBODY",
    "THEAD",
    "TR",
    "TH",
    "TD",
  ]);
  const removed = new Set([
    "SCRIPT",
    "STYLE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "VIDEO",
    "AUDIO",
    "IMG",
    "SVG",
    "MATH",
    "TEMPLATE",
    "INPUT",
    "FORM",
  ]);
  let hadUnsupported = false;
  for (const node of [...document.body.querySelectorAll("*")].reverse()) {
    if (removed.has(node.tagName)) {
      hadUnsupported = true;
      node.remove();
    } else if (!allowed.has(node.tagName)) {
      hadUnsupported = true;
      node.replaceWith(...node.childNodes);
    } else for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
  }
  return { html: document.body.innerHTML, hadUnsupported };
}
