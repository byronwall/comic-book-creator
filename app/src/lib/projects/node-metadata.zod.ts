import { z } from "zod";
import type { ProjectNodeMetadataField } from "./types";

export function createNodeMetadataObjectSchema(
  schema: ProjectNodeMetadataField[],
) {
  return z
    .object(
      Object.fromEntries(
        schema.map((field) => [field.key, z.string().min(1).optional()]),
      ),
    )
    .strict()
    .default({});
}
