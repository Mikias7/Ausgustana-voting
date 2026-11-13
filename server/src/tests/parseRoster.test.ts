import { describe, expect, it } from "vitest";
import { parseRoster, type ParseRosterOptions } from "../services/import/parseRoster";

const options: ParseRosterOptions = { allowedEmailDomains: ["ole.augie.edu"] };

/** Mirrors the shape (and deliberate defects) of the university's sample file. CRLF line endings. */
const SAMPLE = [
  "Lastname1|Firstname1|username1|username1@ole.augie.edu|FF",
  "Lastname2|Firstname2|username2|username2@ole.augie.edu|SR",
  "Lastname3|Firstname3|username3|username3le.augie.edu|JR",
  "Lastname4|Firstname4|username4username4ole.augie.edu|SO",
].join("\r\n");

const errorsOn = (issues: ReturnType<typeof parseRoster>["issues"], line: number) =>
  issues.filter((i) => i.line === line && i.severity === "ERROR");

describe("parseRoster — sample file", () => {
  const result = parseRoster(SAMPLE, options);

  it("keeps the two valid rows", () => {
    expect(result.rows).toEqual([
      { line: 1, lastName: "Lastname1", firstName: "Firstname1", username: "username1", email: "username1@ole.augie.edu", classStanding: "FR" },
      { line: 2, lastName: "Lastname2", firstName: "Firstname2", username: "username2", email: "username2@ole.augie.edu", classStanding: "SR" },
    ]);
  });

  it("rejects line 3 for an invalid email", () => {
    const errors = errorsOn(result.issues, 3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ username: "username3", message: expect.stringMatching(/invalid email/i) });
  });

  it("rejects line 4 for the wrong number of fields", () => {
    expect(errorsOn(result.issues, 4)).toEqual([{ line: 4, severity: "ERROR", message: "Expected 5 fields, found 4" }]);
  });

  it("reports nothing else", () => {
    expect(result.issues).toHaveLength(2);
  });
});

describe("parseRoster — line handling", () => {
  it("accepts LF line endings and a trailing newline", () => {
    const text = "Doe|Jane|jdoe|jdoe@ole.augie.edu|SO\nRoe|Rick|rroe|rroe@ole.augie.edu|JR\n";
    const { rows, issues } = parseRoster(text, options);
    expect(rows.map((r) => r.username)).toEqual(["jdoe", "rroe"]);
    expect(issues).toEqual([]);
  });

  it("skips blank lines but keeps physical line numbers", () => {
    const text = "\r\nDoe|Jane|jdoe|jdoe@ole.augie.edu|SO\r\n   \r\nRoe|Rick|rroe|rroe@ole.augie.edu|JR";
    const { rows } = parseRoster(text, options);
    expect(rows.map((r) => r.line)).toEqual([2, 4]);
  });

  it("strips a UTF-8 byte-order mark", () => {
    const { rows } = parseRoster("﻿Doe|Jane|jdoe|jdoe@ole.augie.edu|SO", options);
    expect(rows[0]?.lastName).toBe("Doe");
  });

  it("trims whitespace around fields", () => {
    const { rows } = parseRoster("  Doe | Jane | jdoe | jdoe@ole.augie.edu | so ", options);
    expect(rows[0]).toMatchObject({ lastName: "Doe", firstName: "Jane", username: "jdoe", classStanding: "SO" });
  });

  it("lowercases username and email", () => {
    const { rows, issues } = parseRoster("Doe|Jane|JDoe|JDOE@Ole.Augie.EDU|SR", options);
    expect(rows[0]).toMatchObject({ username: "jdoe", email: "jdoe@ole.augie.edu" });
    expect(issues).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(parseRoster("", options)).toEqual({ rows: [], issues: [] });
  });

  it("rejects lines with too many fields", () => {
    const { rows, issues } = parseRoster("Doe|Jane|jdoe|jdoe@ole.augie.edu|SO|extra", options);
    expect(rows).toEqual([]);
    expect(issues[0]?.message).toBe("Expected 5 fields, found 6");
  });
});

describe("parseRoster — class codes", () => {
  const classOf = (code: string) => parseRoster(`Doe|Jane|jdoe|jdoe@ole.augie.edu|${code}`, options);

  it.each([
    ["FF", "FR"],
    ["FR", "FR"],
    ["SO", "SO"],
    ["JR", "JR"],
    ["SR", "SR"],
    ["ff", "FR"],
    [" sr ", "SR"],
  ])("maps %j to %s", (code, expected) => {
    const { rows, issues } = classOf(code);
    expect(rows[0]?.classStanding).toBe(expected);
    expect(issues).toEqual([]);
  });

  it("imports unknown codes without a class and warns", () => {
    const { rows, issues } = classOf("GR");
    expect(rows[0]?.classStanding).toBeNull();
    expect(issues).toEqual([{ line: 1, username: "jdoe", severity: "WARNING", message: expect.stringContaining('"GR"') }]);
  });

  it("imports an empty code without a class and warns", () => {
    const { rows, issues } = classOf("");
    expect(rows[0]?.classStanding).toBeNull();
    expect(issues[0]).toMatchObject({ severity: "WARNING", message: expect.stringMatching(/missing class code/i) });
  });

  it("accepts a custom class-code map", () => {
    const { rows } = parseRoster("Doe|Jane|jdoe|jdoe@ole.augie.edu|1Y", { ...options, classCodeMap: { "1Y": "FR" } });
    expect(rows[0]?.classStanding).toBe("FR");
  });
});

describe("parseRoster — field validation", () => {
  it.each([
    ["|Jane|jdoe|jdoe@ole.augie.edu|SO", /last name/i],
    ["Doe||jdoe|jdoe@ole.augie.edu|SO", /first name/i],
    ["Doe|Jane||jdoe@ole.augie.edu|SO", /username is required/i],
    ["Doe|Jane|j doe|jdoe@ole.augie.edu|SO", /invalid characters/i],
    ["Doe|Jane|jdoe||SO", /email is required/i],
    ["Doe|Jane|jdoe|jdoe@|SO", /invalid email/i],
    ["Doe|Jane|jdoe|jdoe@gmail.com|SO", /domain "gmail.com" is not allowed/i],
  ])("rejects %j", (line, message) => {
    const { rows, issues } = parseRoster(line, options);
    expect(rows).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ line: 1, severity: "ERROR", message: expect.stringMatching(message) });
  });

  it("reports every problem on a row", () => {
    const { issues } = parseRoster("||jdoe|bad|SO", options);
    expect(issues.map((i) => i.message)).toHaveLength(3);
  });

  it("honours a configurable list of allowed domains", () => {
    const { rows } = parseRoster("Doe|Jane|jdoe|jdoe@augustana.edu|SO", { allowedEmailDomains: ["ole.augie.edu", "Augustana.edu"] });
    expect(rows).toHaveLength(1);
  });

  it("does not allow subdomains of an allowed domain", () => {
    const { rows } = parseRoster("Doe|Jane|jdoe|jdoe@evil.ole.augie.edu|SO", options);
    expect(rows).toHaveLength(0);
  });

  it("does not include the username on issues for rows without one", () => {
    const { issues } = parseRoster("Doe|Jane||jdoe@ole.augie.edu|SO", options);
    expect(issues[0]).not.toHaveProperty("username");
  });
});

describe("parseRoster — duplicates and warnings", () => {
  it("keeps the first of duplicate usernames (case-insensitive)", () => {
    const text = ["Doe|Jane|jdoe|jdoe@ole.augie.edu|SO", "Doe|John|JDOE|john.doe@ole.augie.edu|JR"].join("\n");
    const { rows, issues } = parseRoster(text, options);
    expect(rows.map((r) => r.firstName)).toEqual(["Jane"]);
    expect(issues).toEqual([
      { line: 2, username: "jdoe", severity: "ERROR", message: "Duplicate username (first seen on line 1)" },
    ]);
  });

  it("keeps the first of duplicate emails", () => {
    const text = ["Doe|Jane|jdoe|jdoe@ole.augie.edu|SO", "Doe|Jane|jdoe2|JDOE@ole.augie.edu|SO"].join("\n");
    const { rows, issues } = parseRoster(text, options);
    expect(rows.map((r) => r.username)).toEqual(["jdoe"]);
    expect(issues.filter((i) => i.severity === "ERROR").map((i) => i.message)).toEqual([
      "Duplicate email (first seen on line 1)",
    ]);
  });

  it("does not let a rejected row block a later valid row", () => {
    const text = ["Doe|Jane|jdoe|jdoe@gmail.com|SO", "Doe|Jane|jdoe|jdoe@ole.augie.edu|SO"].join("\n");
    const { rows } = parseRoster(text, options);
    expect(rows.map((r) => r.line)).toEqual([2]);
  });

  it("warns (but keeps the row) when the email local part differs from the username", () => {
    const { rows, issues } = parseRoster("Doe|Jane|jdoe|jane.doe@ole.augie.edu|SO", options);
    expect(rows).toHaveLength(1);
    expect(issues).toEqual([
      { line: 1, username: "jdoe", severity: "WARNING", message: expect.stringMatching(/does not match username/) },
    ]);
  });

  it("can report several warnings for one row", () => {
    const { rows, issues } = parseRoster("Doe|Jane|jdoe|jane.doe@ole.augie.edu|XX", options);
    expect(rows).toHaveLength(1);
    expect(issues.map((i) => i.severity)).toEqual(["WARNING", "WARNING"]);
  });
});
