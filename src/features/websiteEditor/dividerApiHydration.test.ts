import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { expect, it } from "vitest";
import { normalizeWebsiteDraftFromApi } from "./schemas";

const apiRoot = process.env.WEDDING_API_PATH ?? resolve(process.cwd(), "../Wedding.Platform.API");

it.skipIf(!existsSync(join(apiRoot, "artisan")))("hydrates real first/second API saves at all three Divider depths", () => {
  const directory = mkdtempSync(join(tmpdir(), "divider-roundtrip-"));
  try {
    execFileSync("php", ["artisan", "test", "--compact", "--filter=test_complete_divider_matrix_round_trips_twice"], {
      cwd: apiRoot, env: { ...process.env, DIVIDER_ROUNDTRIP_OUTPUT: directory }, timeout: 120_000, maxBuffer: 2_000_000,
    });
    for (const depth of [0, 1, 2]) {
      const cases = JSON.parse(readFileSync(join(directory, `depth-${depth}.json`), "utf8")) as Array<{ name: string; sectionId: string; content: unknown; first: unknown; second: unknown }>;
      expect(cases).toHaveLength(24);
      for (const fixture of cases) {
        const first = normalizeWebsiteDraftFromApi(fixture.first);
        const second = normalizeWebsiteDraftFromApi(fixture.second);
        expect(first.sections.find(({ id }) => id === fixture.sectionId)?.content, fixture.name).toEqual(fixture.content);
        expect(second.sections.find(({ id }) => id === fixture.sectionId)?.content, fixture.name).toEqual(fixture.content);
      }
    }
  } finally {
    // Only the unique temporary directory created by this test is removed.
    rmSync(directory, { recursive: true, force: true });
  }
}, 150_000);
