/** JSON.parse validates syntax; this pass rejects duplicate keys before JSON.parse can hide them. */
export function parseUniqueJson(source) {
  const parsed = JSON.parse(source);
  const tokens =
    source.match(
      /"(?:\\[\s\S]|[^"\\])*"|[{}\[\],:]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    ) ?? [];
  let cursor = 0;
  const visit = () => {
    if (tokens[cursor] === "{") {
      cursor++;
      const keys = new Set();
      while (tokens[cursor] !== "}") {
        const key = JSON.parse(tokens[cursor++]);
        if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
        keys.add(key);
        cursor++;
        visit();
        if (tokens[cursor] === ",") cursor++;
      }
      cursor++;
    } else if (tokens[cursor] === "[") {
      cursor++;
      while (tokens[cursor] !== "]") {
        visit();
        if (tokens[cursor] === ",") cursor++;
      }
      cursor++;
    } else cursor++;
  };
  visit();
  return parsed;
}
export const translationTokens = (value) =>
  [...value.matchAll(/{{.*?}}|<\/?[\w]+[^>]*>|%[sd]|\{[\w]+(?=\s*[,}])/g)].map((x) => x[0]).sort();

export const markupSequence = (value) => [...value.matchAll(/<\/?[\w]+[^>]*>/g)].map((x) => x[0]);
