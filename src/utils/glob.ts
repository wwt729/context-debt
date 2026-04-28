export function matchesGlob(value: string, pattern: string): boolean {
  const regex = new RegExp(`^${globToRegexSource(pattern)}$`, "u");
  return regex.test(value);
}

function globToRegexSource(pattern: string): string {
  let source = "";
  let index = 0;

  while (index < pattern.length) {
    const current = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];

    if (current === "*" && next === "*" && afterNext === "/") {
      source += "(?:.*/)?";
      index += 3;
      continue;
    }

    if (current === "*" && next === "*") {
      source += ".*";
      index += 2;
      continue;
    }

    if (current === "*") {
      source += "[^/]*";
      index += 1;
      continue;
    }

    source += escapeRegexCharacter(current);
    index += 1;
  }

  return source;
}

function escapeRegexCharacter(value: string): string {
  return /[.+^${}()|[\]\\]/u.test(value) ? `\\${value}` : value;
}
