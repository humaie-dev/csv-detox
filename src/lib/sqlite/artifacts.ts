import crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Id } from "@convex/dataModel";
import type Database from "better-sqlite3";
import { anyApi } from "convex/server";
import { downloadFileFromConvex, getConvexClient, storeFileInConvex } from "../convex/client";
import type { ParseOptions } from "../parsers/types";
import { checkpointDatabase, closeDatabase, getDatabaseDirectory } from "./database";
import { prepareDatabaseForExport } from "./schema";

export interface SqliteArtifactInfo {
  artifactKey: string;
  storageId: Id<"_storage">;
  sha256: string;
  size: number;
  uploadId: Id<"uploads">;
  parseOptionsJson: string;
}

interface LocalArtifactMetadata {
  artifactKey: string;
  storageId: Id<"_storage">;
  sha256: string;
  size: number;
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getParseOptionsJson(parseOptions: ParseOptions | undefined): string {
  return stableStringify(parseOptions ?? {});
}

function computeArtifactKey(
  projectId: Id<"projects">,
  uploadId: Id<"uploads">,
  parseOptions: ParseOptions | undefined,
): { artifactKey: string; parseOptionsJson: string } {
  const parseOptionsJson = getParseOptionsJson(parseOptions);
  const hasher = crypto.createHash("sha256");
  hasher.update(projectId);
  hasher.update(uploadId);
  hasher.update(parseOptionsJson);
  return { artifactKey: hasher.digest("hex"), parseOptionsJson };
}

function getArtifactPaths(projectId: Id<"projects">): { dbPath: string; metaPath: string } {
  const baseDir = getDatabaseDirectory();
  const dbPath = path.join(baseDir, `${projectId}.db`);
  const metaPath = path.join(baseDir, `${projectId}.json`);
  return { dbPath, metaPath };
}

function readLocalMetadata(metaPath: string): LocalArtifactMetadata | null {
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    const parsed = JSON.parse(raw) as LocalArtifactMetadata;
    if (!parsed?.storageId || !parsed.sha256 || !parsed.size) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to read artifact metadata:", error);
    return null;
  }
}

function writeLocalMetadata(metaPath: string, metadata: LocalArtifactMetadata): void {
  fs.writeFileSync(metaPath, JSON.stringify(metadata), "utf-8");
}

async function fetchArtifactMetadata(projectId: Id<"projects">) {
  const convex = getConvexClient();
  return convex.query(anyApi.sqliteArtifacts.getLatest, { projectId });
}

async function fetchArtifactByParseOptions(projectId: Id<"projects">, parseOptionsJson: string) {
  const convex = getConvexClient();
  return convex.query(anyApi.sqliteArtifacts.getByParseOptionsJson, {
    projectId,
    parseOptionsJson,
  });
}

export async function getLatestArtifact(
  projectId: Id<"projects">,
): Promise<SqliteArtifactInfo | null> {
  return (await fetchArtifactMetadata(projectId)) as SqliteArtifactInfo | null;
}

export async function getArtifactForParseOptions(
  projectId: Id<"projects">,
  parseOptions: ParseOptions | undefined,
): Promise<SqliteArtifactInfo | null> {
  const parseOptionsJson = getParseOptionsJson(parseOptions);
  return (await fetchArtifactByParseOptions(
    projectId,
    parseOptionsJson,
  )) as SqliteArtifactInfo | null;
}

async function saveArtifactMetadata(input: {
  projectId: Id<"projects">;
  uploadId: Id<"uploads">;
  storageId: Id<"_storage">;
  artifactKey: string;
  parseOptionsJson: string;
  sha256: string;
  size: number;
}) {
  const convex = getConvexClient();
  return convex.mutation(anyApi.sqliteArtifacts.upsert, input);
}

export function getLocalDatabasePath(projectId: Id<"projects">): string {
  const { dbPath } = getArtifactPaths(projectId);
  return dbPath;
}

export function getLocalDatabasePathForArtifact(
  projectId: Id<"projects">,
  artifactKey: string,
): string {
  const baseDir = getDatabaseDirectory();
  return path.join(baseDir, `${projectId}-${artifactKey}.db`);
}

export async function ensureLocalDatabase(projectId: Id<"projects">): Promise<SqliteArtifactInfo> {
  const artifact = await fetchArtifactMetadata(projectId);
  if (!artifact) {
    throw new Error("SQLite artifact not found for project");
  }

  const { artifactKey, storageId, sha256, size, uploadId, parseOptionsJson } = artifact;
  const { dbPath, metaPath } = getArtifactPaths(projectId);
  ensureDirectory(path.dirname(dbPath));

  const meta = readLocalMetadata(metaPath);
  const matches =
    meta &&
    meta.storageId === storageId &&
    meta.sha256 === sha256 &&
    meta.size === size &&
    fs.existsSync(dbPath);

  if (!matches) {
    const buffer = await downloadFileFromConvex(storageId);
    fs.writeFileSync(dbPath, Buffer.from(buffer));
    writeLocalMetadata(metaPath, { artifactKey, storageId, sha256, size });
  }

  return {
    artifactKey,
    storageId,
    sha256,
    size,
    uploadId,
    parseOptionsJson,
  };
}

export async function ensureLocalDatabaseForArtifact(
  projectId: Id<"projects">,
  artifact: SqliteArtifactInfo,
): Promise<SqliteArtifactInfo> {
  const { artifactKey, storageId, sha256, size, uploadId, parseOptionsJson } = artifact;
  const dbPath = getLocalDatabasePathForArtifact(projectId, artifactKey);
  const metaPath = path.join(getDatabaseDirectory(), `${projectId}-${artifactKey}.json`);
  ensureDirectory(path.dirname(dbPath));

  const meta = readLocalMetadata(metaPath);
  const matches =
    meta &&
    meta.storageId === storageId &&
    meta.sha256 === sha256 &&
    meta.size === size &&
    fs.existsSync(dbPath);

  if (!matches) {
    const buffer = await downloadFileFromConvex(storageId);
    fs.writeFileSync(dbPath, Buffer.from(buffer));
    writeLocalMetadata(metaPath, { artifactKey, storageId, sha256, size });
  }

  return {
    artifactKey,
    storageId,
    sha256,
    size,
    uploadId,
    parseOptionsJson,
  };
}

export async function storeDatabaseArtifact(input: {
  projectId: Id<"projects">;
  uploadId: Id<"uploads">;
  parseOptions: ParseOptions | undefined;
  databaseProjectId: string;
}): Promise<SqliteArtifactInfo> {
  const { artifactKey, parseOptionsJson } = computeArtifactKey(
    input.projectId,
    input.uploadId,
    input.parseOptions,
  );

  const { dbPath, metaPath } = getArtifactPaths(input.projectId);
  ensureDirectory(path.dirname(dbPath));

  const sourceDbPath = path.join(getDatabaseDirectory(), `${input.databaseProjectId}.db`);
  if (!fs.existsSync(sourceDbPath)) {
    throw new Error("SQLite database file not found for upload");
  }

  if (sourceDbPath !== dbPath) {
    fs.copyFileSync(sourceDbPath, dbPath);
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const size = fileBuffer.byteLength;
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  );

  const storageId = await storeFileInConvex(arrayBuffer, "application/x-sqlite3", sha256);

  await saveArtifactMetadata({
    projectId: input.projectId,
    uploadId: input.uploadId,
    storageId,
    artifactKey,
    parseOptionsJson,
    sha256,
    size,
  });

  writeLocalMetadata(metaPath, { artifactKey, storageId, sha256, size });

  return {
    artifactKey,
    storageId,
    sha256,
    size,
    uploadId: input.uploadId,
    parseOptionsJson,
  };
}

export function finalizeDatabaseForArtifact(
  projectId: Id<"projects">,
  db: Database.Database,
): void {
  prepareDatabaseForExport(db);
  checkpointDatabase(db);
  closeDatabase(projectId);
}
