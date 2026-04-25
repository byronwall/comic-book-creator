import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultProjectNodeMetadataSchema } from "./node-metadata";
import { exportProjectArchiveOnDisk, importProjectArchiveOnDisk } from "./archive.server";
import { deleteProjectOnDisk, readProjectByIdFromDisk } from "./data.server";

describe("project archives", () => {
  it("exports and imports a project with images", async () => {
    const originalCwd = process.cwd();
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "project-grid-archive-"));
    const dataDir = path.join(tempRoot, "app", "data");
    const projectDir = path.join(dataDir, "projects", "archive-project");
    const imageDir = path.join(projectDir, "images", "node-1");
    mkdirSync(imageDir, { recursive: true });
    writeFileSync(path.join(imageDir, "image.png"), Buffer.from("fake-png"));
    writeFileSync(
      path.join(projectDir, "project.json"),
      `${JSON.stringify(
        {
          id: "archive-project",
          name: "Archive Project",
          description: "Test fixture",
          createdAt: "2026-04-20T00:00:00.000Z",
          updatedAt: "2026-04-20T00:00:00.000Z",
          nodeMetadataSchema: createDefaultProjectNodeMetadataSchema(),
          spatialMap: {
            nodes: [
              {
                id: "node-1",
                label: "Node 1",
                type: "page",
                depth: 0,
                metadata: {
                  purpose: "Purpose",
                  implementation: "Implementation",
                },
                context: "",
                rawContext: "",
                contextMode: "structured",
                images: [
                  {
                    id: "image-1",
                    src: "/api/projects/archive-project/images/node-1/image.png",
                    filename: "image.png",
                    originalName: "image.png",
                    mimeType: "image/png",
                    size: 8,
                    createdAt: "2026-04-20T00:00:00.000Z",
                  },
                ],
              },
            ],
            links: [],
          },
        },
        null,
        2,
      )}\n`,
    );

    try {
      process.chdir(tempRoot);

      const archive = await exportProjectArchiveOnDisk("archive-project");
      await deleteProjectOnDisk("archive-project");
      const imported = await importProjectArchiveOnDisk(
        new File([new Uint8Array(archive.data)], archive.filename, { type: "application/zip" }),
      );

      expect(imported.id).toBe("archive-project");
      expect((await readProjectByIdFromDisk("archive-project"))?.spatialMap.nodes[0]?.images?.[0]?.src)
        .toBe("/api/projects/archive-project/images/node-1/image.png");
      expect(existsSync(path.join(projectDir, "images", "node-1", "image.png"))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
