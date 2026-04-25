#!/usr/bin/env node
/* global AbortController, Buffer, clearTimeout, console, fetch, process, setTimeout */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const API_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_SIZE = "816x816";
const DEFAULT_QUALITY = "low";
const DEFAULT_FORMAT = "jpeg";
const DEFAULT_COMPRESSION = 70;
const DEFAULT_OUTPUT_DIR = "data/images/gpt-image-2-task-ui";
const DEFAULT_PROMPT = [
  "Create a generic task list app UI concept as a polished product screenshot.",
  "Show a compact dashboard with a left project rail, a main task list grouped by priority,",
  "checkboxes, due-date chips, subtle progress indicators, and a small empty-state card.",
  "Use neutral fictional labels only, no logos, no brand names, and no real personal data.",
  "Keep the layout simple, legible, modern, and useful for validating UI image generation.",
].join(" ");

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

const args = parseArgs(process.argv.slice(2));
loadDotEnv(resolve(".env"));
loadDotEnv(resolve(".env.local"));

if (args.help) {
  printHelp();
  process.exit(0);
}

const prompt = String(args.prompt ?? process.env.IMAGE_PROMPT ?? DEFAULT_PROMPT);
const size = String(args.size ?? process.env.IMAGE_SIZE ?? DEFAULT_SIZE);
const quality = String(args.quality ?? process.env.IMAGE_QUALITY ?? DEFAULT_QUALITY);
const outputFormat = String(args.format ?? process.env.IMAGE_FORMAT ?? DEFAULT_FORMAT);
const outputCompression = Number(
  args.compression ?? process.env.IMAGE_COMPRESSION ?? DEFAULT_COMPRESSION,
);
const outputDir = String(args.outputDir ?? process.env.IMAGE_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR);
const dryRun = Boolean(args.dryRun);

validateSize(size);
validateOneOf("quality", quality, ["low", "medium", "high", "auto"]);
validateOneOf("format", outputFormat, ["png", "jpeg", "webp"]);

if (!Number.isInteger(outputCompression) || outputCompression < 0 || outputCompression > 100) {
  throw new Error("--compression must be an integer from 0 to 100.");
}

const requestBody = {
  model: "gpt-image-2",
  prompt,
  n: 1,
  size,
  quality,
  output_format: outputFormat,
  background: "opaque",
  ...(outputFormat === "jpeg" || outputFormat === "webp"
    ? { output_compression: outputCompression }
    : {}),
};

if (dryRun) {
  console.log("Dry run: request body is valid. No API call made.");
  console.log(JSON.stringify({ ...requestBody, prompt: summarizePrompt(prompt) }, null, 2));
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required. Add it to app/.env or export it before running.");
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 180_000);

try {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  const requestId = response.headers.get("x-request-id");
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    let message = payload?.error?.message ?? `HTTP ${response.status}`;

    if (message.includes("must be verified")) {
      message += " GPT Image models can require API Organization Verification before first use.";
    }

    throw new Error(`OpenAI image generation failed${requestId ? ` (${requestId})` : ""}: ${message}`);
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error(`OpenAI response did not include data[0].b64_json${requestId ? ` (${requestId})` : ""}.`);
  }

  const absoluteOutputDir = resolve(outputDir);
  mkdirSync(absoluteOutputDir, { recursive: true });

  const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;
  const outputPath = join(absoluteOutputDir, `task-ui-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.${extension}`);

  writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));

  console.log(`Generated ${outputPath}`);
  console.log(`Model: ${requestBody.model}`);
  console.log(`Size: ${size}`);
  console.log(`Quality: ${quality}`);
  console.log(`Format: ${outputFormat}`);
  if (requestId) console.log(`Request ID: ${requestId}`);
} finally {
  clearTimeout(timeout);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") continue;

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown positional argument: ${arg}`);
    }

    const inlineValueIndex = arg.indexOf("=");
    const key = toCamelCase(arg.slice(2, inlineValueIndex === -1 ? undefined : inlineValueIndex));
    const value = inlineValueIndex === -1 ? argv[index + 1] : arg.slice(inlineValueIndex + 1);

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    parsed[key] = value;
    if (inlineValueIndex === -1) index += 1;
  }

  return parsed;
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
}

function validateSize(size) {
  if (size === "auto") return;

  const match = size.match(/^(\d+)x(\d+)$/);

  if (!match) {
    throw new Error('--size must be "auto" or WIDTHxHEIGHT, for example 816x816.');
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const pixels = width * height;

  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error("--size width and height must be multiples of 16 for gpt-image-2.");
  }

  if (longEdge > 3840) {
    throw new Error("--size maximum edge length must be 3840px or less for gpt-image-2.");
  }

  if (longEdge / shortEdge > 3) {
    throw new Error("--size long-edge to short-edge ratio must not exceed 3:1 for gpt-image-2.");
  }

  if (pixels < 655_360 || pixels > 8_294_400) {
    throw new Error("--size total pixels must be between 655,360 and 8,294,400 for gpt-image-2.");
  }
}

function validateOneOf(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`--${name} must be one of: ${allowed.join(", ")}.`);
  }
}

function summarizePrompt(prompt) {
  return prompt.length > 140 ? `${prompt.slice(0, 137)}...` : prompt;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function handleFatalError(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printHelp() {
  console.log(`Generate a cheap GPT-Image-2 task-list UI test image.

Usage:
  pnpm image:task-ui
  pnpm image:task-ui --dry-run
  pnpm image:task-ui --prompt "Generic kanban task list UI" --size 1024x1024

Options:
  --prompt <text>        Image prompt. Defaults to a generic task-list UI prompt.
  --size <WxH|auto>     Defaults to ${DEFAULT_SIZE}, the smallest square size allowed by GPT-Image-2 constraints.
  --quality <value>     low, medium, high, or auto. Defaults to ${DEFAULT_QUALITY}.
  --format <value>      png, jpeg, or webp. Defaults to ${DEFAULT_FORMAT}.
  --compression <0-100> JPEG/WebP compression. Defaults to ${DEFAULT_COMPRESSION}.
  --output-dir <path>   Defaults to ${DEFAULT_OUTPUT_DIR}.
  --dry-run             Validate and print the request body without calling the API.
`);
}
