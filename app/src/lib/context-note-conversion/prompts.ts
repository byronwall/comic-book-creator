import type { ProjectRecord } from "~/lib/projects/types";
import { summarizeNodeMetadata } from "~/lib/projects/node-metadata";
import { getLinkLabel } from "~/lib/spatial-map/links";
import type { MapNode } from "~/lib/spatial-map/types";
import type { ClarifyingQuestion } from "./types";

function summarizeNode(node: MapNode, project: ProjectRecord) {
  return `${node.id} | ${node.label} | ${node.type} | ${node.contextMode} | depth ${node.depth} | metadata: ${summarizeNodeMetadata(node, project.nodeMetadataSchema)}`;
}

function summarizeGraph(project: ProjectRecord) {
  return [
    `Project: ${project.name}`,
    `Description: ${project.description}`,
    `Node count: ${project.spatialMap.nodes.length}`,
    `Link count: ${project.spatialMap.links.length}`,
    "",
    "Project metadata schema:",
    ...(
      project.nodeMetadataSchema.length > 0
        ? project.nodeMetadataSchema.map(
            (field) => `${field.key} | ${field.label} | default: ${field.defaultValue || "(none)"}`,
          )
        : ["No project metadata fields defined."]
    ),
    "",
    "Existing nodes:",
    ...project.spatialMap.nodes.map((node) => summarizeNode(node, project)),
    "",
    "Existing links:",
    ...project.spatialMap.links.map(
      (link) => `${link.source} -> ${link.target} (${getLinkLabel(link)})`,
    ),
  ].join("\n");
}

function summarizeQuestions(questions: ClarifyingQuestion[], answers: Record<string, string>) {
  return questions
    .map((question) => {
      const selectedOption = question.options.find((option) => option.id === answers[question.id]);
      return [
        `Question: ${question.prompt}`,
        `Helper: ${question.helperText}`,
        `Selected: ${selectedOption?.label ?? "No answer"}`,
        selectedOption ? `Selected detail: ${selectedOption.detail}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function buildQuestionPrompt(input: {
  project: ProjectRecord;
  sourceNode: MapNode;
}) {
  return [
    "You are preparing a context-note conversion workflow for a technical graph.",
    "Generate exactly 3 or 4 clarifying questions for turning one loose context note into structured graph nodes.",
    "Each question must have 3 or 4 concise options.",
    "Prefer questions about decomposition strategy, structural depth, relationship style, and evidence preservation.",
    "Do not ask for confirmation or approval.",
    "",
    `Source note: ${summarizeNode(input.sourceNode, input.project)}`,
    "Source note current context:",
    input.sourceNode.context || "(empty)",
    "",
    summarizeGraph(input.project),
  ].join("\n");
}

export function buildSuggestionPrompt(input: {
  project: ProjectRecord;
  sourceNode: MapNode;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
}) {
  return [
    "You are converting a freeform context note into structured technical graph nodes.",
    "Generate 3 to 10 candidate structured nodes extracted from the note.",
    'Do not reproduce the source note itself as a candidate node. The source note remains a context inbox.',
    'Use contextMode \"structured\" for every generated node.',
    "Keep labels compact and concrete.",
    "Use only the project metadata keys listed below when populating metadata.",
    "Each populated metadata value should stay concise and concrete.",
    "For parent/child structure, emit links with parentChild: true and no relationship.",
    'For non-parent/child adjacency, emit parentChild: false with relationship "related", "dependency", or "reuse".',
    "Create parentChild links first to anchor true depth before adding cross-cutting relationship links.",
    "Generated links may connect to existing nodes when helpful, but only generated nodes should appear in the review tree.",
    "",
    `Source note: ${summarizeNode(input.sourceNode, input.project)}`,
    "Source note current context:",
    input.sourceNode.context || "(empty)",
    "",
    "Clarification answers:",
    summarizeQuestions(input.questions, input.answers),
    "",
    summarizeGraph(input.project),
  ].join("\n");
}

export function buildTrimPrompt(input: {
  project: ProjectRecord;
  sourceNode: MapNode;
  acceptedSummary: string;
  acceptedNodes: MapNode[];
}) {
  return [
    "You are trimming a context note after accepted structured nodes were added to a graph.",
    "Return the remaining context that was not incorporated into the accepted structured nodes.",
    "Preserve unique details, caveats, open questions, and snippets not represented by the accepted nodes.",
    "Remove material that is already captured by the accepted structure.",
    "It is valid for the remaining context to be empty.",
    "",
    `Source note: ${summarizeNode(input.sourceNode, input.project)}`,
    `Accepted summary: ${input.acceptedSummary}`,
    "",
    "Accepted structured nodes:",
    ...input.acceptedNodes.map((node) => summarizeNode(node, input.project)),
    "",
    "Original current context to trim:",
    input.sourceNode.context || "(empty)",
  ].join("\n");
}
