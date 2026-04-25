import { action, query, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import type { ProjectRecord, ProjectSummary } from "./types";

async function fetchJson<T>(pathname: string): Promise<T> {
  const requestEvent = getRequestEvent();
  const requestUrl = requestEvent?.request.url;
  const url = requestUrl
    ? new URL(pathname, requestUrl)
    : new URL(pathname, window.location.origin);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${pathname}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const getProjects = query(
  async () => fetchJson<ProjectSummary[]>("/api/projects"),
  "projects",
);

export const getProjectById = query(
  async (projectId: string) => fetchJson<ProjectRecord>(`/api/projects/${projectId}`),
  "project-by-id",
);

export const createProject = action(
  async (formData: FormData) => {
    "use server";
    const { createProjectOnDisk } = await import("./data.server");

    const nameValue = formData.get("name");
    const project = await createProjectOnDisk({
      name: typeof nameValue === "string" ? nameValue : undefined,
    });

    throw redirect(`/projects/${project.id}`, {
      revalidate: [getProjects.key, getProjectById.keyFor(project.id)],
    });
  },
  "create-project",
);

function getMetadataFromFormData(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([key, value]) => key.startsWith("metadata.") && typeof value === "string")
      .map(([key, value]) => [key.slice("metadata.".length), value]),
  );
}

export const deleteProject = action(
  async (formData: FormData) => {
    "use server";
    const { deleteProjectOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }

    await deleteProjectOnDisk(projectId);

    throw redirect("/", {
      revalidate: [getProjects.key],
    });
  },
  "delete-project",
);

export const importProject = action(
  async (formData: FormData) => {
    "use server";
    const { importProjectArchiveOnDisk } = await import("./archive.server");

    const archive = formData.get("archive");
    if (!(archive instanceof File) || archive.size === 0) {
      throw new Error("A project ZIP archive is required.");
    }

    const project = await importProjectArchiveOnDisk(archive);

    throw redirect(`/projects/${project.id}`, {
      revalidate: [getProjects.key, getProjectById.keyFor(project.id)],
    });
  },
  "import-project",
);

export const updateProjectNodeContext = action(
  async (formData: FormData) => {
    "use server";
    const { updateProjectNodeContextOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const nodeId = formData.get("nodeId");
    const context = formData.get("context");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      throw new Error("A node id is required.");
    }

    return updateProjectNodeContextOnDisk({
      projectId,
      nodeId,
      context: typeof context === "string" ? context : "",
    });
  },
  "update-project-node-context",
);

export const addProjectNodeImages = action(
  async (formData: FormData) => {
    "use server";
    const { addProjectNodeImagesOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const nodeId = formData.get("nodeId");
    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      throw new Error("A node id is required.");
    }

    return addProjectNodeImagesOnDisk({
      projectId,
      nodeId,
      images,
    });
  },
  "add-project-node-images",
);

export const deleteProjectNodeImage = action(
  async (formData: FormData) => {
    "use server";
    const { deleteProjectNodeImageOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const nodeId = formData.get("nodeId");
    const imageId = formData.get("imageId");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      throw new Error("A node id is required.");
    }
    if (typeof imageId !== "string" || imageId.trim().length === 0) {
      throw new Error("An image id is required.");
    }

    return deleteProjectNodeImageOnDisk({
      projectId,
      nodeId,
      imageId,
    });
  },
  "delete-project-node-image",
);

export const createProjectContextNode = action(
  async (formData: FormData) => {
    "use server";
    const { createContextNodeOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const label = formData.get("label");
    const context = formData.get("context");
    const splitByHeadingLevel = formData.get("splitByHeadingLevel");
    const maxHeadingDepth = formData.get("maxHeadingDepth");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof label !== "string" || label.trim().length === 0) {
      throw new Error("A node label is required.");
    }

    return createContextNodeOnDisk({
      projectId,
      label,
      context: typeof context === "string" ? context : "",
      metadata: getMetadataFromFormData(formData),
      splitByHeadingLevel: splitByHeadingLevel === "true",
      maxHeadingDepth:
        typeof maxHeadingDepth === "string" ? Number.parseInt(maxHeadingDepth, 10) : undefined,
    });
  },
  "create-project-context-node",
);

export const updateProjectNodeMetadata = action(
  async (formData: FormData) => {
    "use server";
    const { updateProjectNodeMetadataOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const nodeId = formData.get("nodeId");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      throw new Error("A node id is required.");
    }

    return updateProjectNodeMetadataOnDisk({
      projectId,
      nodeId,
      metadata: getMetadataFromFormData(formData),
    });
  },
  "update-project-node-metadata",
);

export const updateProjectMetadataSchema = action(
  async (formData: FormData) => {
    "use server";
    const { updateProjectMetadataSchemaOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const name = formData.get("name");
    const description = formData.get("description");
    const originalKeys = formData.getAll("originalKey");
    const keys = formData.getAll("key");
    const labels = formData.getAll("label");
    const defaultValues = formData.getAll("defaultValue");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (keys.length !== labels.length || keys.length !== defaultValues.length) {
      throw new Error("Project metadata rows are malformed.");
    }

    return updateProjectMetadataSchemaOnDisk({
      projectId,
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
      fields: keys.map((key, index) => ({
        originalKey:
          typeof originalKeys[index] === "string" ? originalKeys[index] : undefined,
        key: typeof key === "string" ? key : "",
        label: typeof labels[index] === "string" ? labels[index] : "",
        defaultValue:
          typeof defaultValues[index] === "string" ? defaultValues[index] : "",
      })),
    });
  },
  "update-project-metadata-schema",
);

export const deleteProjectNode = action(
  async (formData: FormData) => {
    "use server";
    const { deleteProjectNodeOnDisk } = await import("./data.server");

    const projectId = formData.get("projectId");
    const nodeId = formData.get("nodeId");

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new Error("A project id is required.");
    }
    if (typeof nodeId !== "string" || nodeId.trim().length === 0) {
      throw new Error("A node id is required.");
    }

    return deleteProjectNodeOnDisk({ projectId, nodeId });
  },
  "delete-project-node",
);
