import { describe, expect, it } from "vitest";

import { parseMultyCommand } from "./command.js";

describe("parseMultyCommand", () => {
  it("parses /multy topic", () => {
    const result = parseMultyCommand("/multy HBO TV series Peacemaker");
    expect(result?.topic).toBe("HBO TV series Peacemaker");
  });

  it("parses /muly alias", () => {
    const result = parseMultyCommand("/muly test topic");
    expect(result?.topic).toBe("test topic");
  });

  it("parses /multy@bot mention", () => {
    const result = parseMultyCommand("/multy@clawdis_bot topic here");
    expect(result?.topic).toBe("topic here");
  });

  it("returns empty topic when missing", () => {
    const result = parseMultyCommand("/multy");
    expect(result?.topic).toBe("");
  });

  it("returns null for unrelated text", () => {
    const result = parseMultyCommand("hello there");
    expect(result).toBeNull();
  });
});
