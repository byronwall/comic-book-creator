import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MapNodeImage } from "~/lib/spatial-map/types";
import {
  getProjectNodeImageDir,
  getProjectNodeImageFilePath,
  readProjectByIdFromDisk,
  readProjectRecordsFromDisk,
  safePathSegment,
  writeProjectRecordsToDisk,
} from "./data.server";
import { parseStoredProjectRecord } from "./project-record-format";
import type { ProjectRecord } from "./types";

const FORMAT = "product-grid-project-archive";
const VERSION = 2;
const UTF8_FLAG = 0x0800;

interface ZipEntry {
  name: string;
  data: Buffer;
}

export async function exportProjectArchiveOnDisk(projectId: string) {
  const project = await readProjectByIdFromDisk(projectId);
  if (!project) throw new Error("Project not found.");

  const entries: ZipEntry[] = [
    jsonEntry("manifest.json", {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
    }),
    jsonEntry("project.json", project),
  ];

  for (const node of project.spatialMap.nodes) {
    for (const image of node.images ?? []) {
      const imagePath = getProjectNodeImageFilePath({
        projectId: project.id,
        nodeId: node.id,
        filename: image.filename,
      });
      if (existsSync(imagePath)) {
        entries.push({
          name: imageArchivePath(node.id, image.filename),
          data: await readFile(imagePath),
        });
      }
    }
  }

  return {
    filename: `${safePathSegment(project.id)}.product-grid.zip`,
    data: createZip(entries),
  };
}

export async function importProjectArchiveOnDisk(file: File) {
  if (file.size === 0) throw new Error("Choose a project archive to import.");

  const entries = readZip(Buffer.from(await file.arrayBuffer()));
  const manifest = JSON.parse(readRequiredText(entries, "manifest.json")) as {
    format?: unknown;
    version?: unknown;
    projectId?: unknown;
  };
  if (
    manifest.format !== FORMAT ||
    (manifest.version !== 1 && manifest.version !== VERSION) ||
    typeof manifest.projectId !== "string"
  ) {
    throw new Error("Unsupported project archive.");
  }

  const archivedProject = parseStoredProjectRecord(
    JSON.parse(readRequiredText(entries, "project.json")),
  ).record;
  if (archivedProject.id !== manifest.projectId) {
    throw new Error("Archive manifest does not match project payload.");
  }

  const records = await readProjectRecordsFromDisk();
  const projectId = uniqueImportedProjectId(archivedProject.id, records);
  const project = normalizeImportedProject(archivedProject, projectId);

  assertArchivedImagesExist(project, entries);
  await writeProjectRecordsToDisk([...records, project]);
  await writeImportedImages(project, entries);

  return project;
}

function jsonEntry(name: string, value: unknown): ZipEntry {
  return { name, data: Buffer.from(`${JSON.stringify(value, null, 2)}\n`) };
}
function normalizeImportedProject(project: ProjectRecord, projectId: string): ProjectRecord {
  return {
    ...project,
    id: projectId,
    updatedAt: new Date().toISOString(),
    spatialMap: {
      ...project.spatialMap,
      nodes: project.spatialMap.nodes.map((node) => ({
        ...node,
        images: (node.images ?? []).map((image) => normalizeImage(projectId, node.id, image)),
      })),
    },
  };
}

function normalizeImage(projectId: string, nodeId: string, image: MapNodeImage): MapNodeImage {
  return {
    ...image,
    src: `/api/projects/${encodeURIComponent(projectId)}/images/${encodeURIComponent(nodeId)}/${encodeURIComponent(image.filename)}`,
  };
}

async function writeImportedImages(project: ProjectRecord, entries: Map<string, Buffer>) {
  for (const node of project.spatialMap.nodes) {
    for (const image of node.images ?? []) {
      const imageDir = getProjectNodeImageDir(project.id, node.id);
      await mkdir(imageDir, { recursive: true });
      await writeFile(path.join(imageDir, image.filename), entries.get(imageArchivePath(node.id, image.filename))!);
    }
  }
}

function assertArchivedImagesExist(project: ProjectRecord, entries: Map<string, Buffer>) {
  for (const node of project.spatialMap.nodes) {
    for (const image of node.images ?? []) {
      if (!entries.has(imageArchivePath(node.id, image.filename))) {
        throw new Error(`Archive is missing image "${image.originalName}".`);
      }
    }
  }
}

function imageArchivePath(nodeId: string, filename: string) {
  return `images/${safePathSegment(nodeId)}/${path.basename(filename)}`;
}

function uniqueImportedProjectId(projectId: string, records: ProjectRecord[]) {
  const existingIds = new Set(records.map((record) => record.id));
  if (!existingIds.has(projectId)) return projectId;

  let suffix = 2;
  while (existingIds.has(`${projectId}-import-${suffix}`)) suffix += 1;
  return `${projectId}-import-${suffix}`;
}

function readRequiredText(entries: Map<string, Buffer>, name: string) {
  const entry = entries.get(name);
  if (!entry) throw new Error(`Archive is missing ${name}.`);
  return entry.toString("utf8");
}

function createZip(entries: ZipEntry[]) {
  const files: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.byteLength, 18);
    local.writeUInt32LE(entry.data.byteLength, 22);
    local.writeUInt16LE(name.byteLength, 26);
    files.push(local, name, entry.data);
    central.push(centralHeader(name, crc, entry.data.byteLength, offset));
    offset += local.byteLength + name.byteLength + entry.data.byteLength;
  }

  const centralDir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, centralDir, end]);
}

function centralHeader(name: Buffer, crc: number, size: number, offset: number) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(name.byteLength, 28);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, name]);
}

function readZip(data: Buffer) {
  const end = findEnd(data);
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < count; index += 1) {
    if (data.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP archive.");
    const method = data.readUInt16LE(offset + 10);
    const size = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localOffset = data.readUInt32LE(offset + 42);
    const name = safeZipName(data.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
    if (method !== 0) throw new Error("Only stored ZIP entries are supported.");
    entries.set(name, readLocalEntry(data, localOffset, size));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readLocalEntry(data: Buffer, offset: number, size: number) {
  if (data.readUInt32LE(offset) !== 0x04034b50) throw new Error("Invalid ZIP archive.");
  const nameLength = data.readUInt16LE(offset + 26);
  const extraLength = data.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  return Buffer.from(data.subarray(start, start + size));
}

function findEnd(data: Buffer) {
  for (let offset = data.byteLength - 22; offset >= 0; offset -= 1) {
    if (data.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid ZIP archive.");
}

function safeZipName(name: string) {
  const normalized = name.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized.includes("\0")) {
    throw new Error("Archive contains an unsafe path.");
  }
  return normalized;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]!;
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});
