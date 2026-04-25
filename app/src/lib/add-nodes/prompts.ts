import type { ClarifyingQuestion, FollowUpSuggestion } from "./types";
import { summarizeNodeMetadata } from "~/lib/projects/node-metadata";
import type { ProjectRecord } from "~/lib/projects/types";
import { getLinkLabel } from "~/lib/spatial-map/links";
import type { MapNode } from "~/lib/spatial-map/types";

function summarizeNode(node: MapNode, project: ProjectRecord) {
  return `${node.id} | ${node.label} | ${node.type} | depth ${node.depth} | metadata: ${summarizeNodeMetadata(node, project.nodeMetadataSchema)}`;
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

function summarizeSuggestions(suggestions: FollowUpSuggestion[]) {
  return suggestions
    .map(
      (suggestion) =>
        `${suggestion.label} | brief: ${suggestion.brief} | guidance: ${suggestion.guidance}`,
    )
    .join("\n");
}

export function buildQuestionPrompt(input: {
  project: ProjectRecord;
  selectedNode: MapNode | null;
  brief: string;
}) {
  return [
    "You are designing a multi-step graph expansion workflow.",
    "Generate exactly 3 or 4 clarifying questions for a user who wants to add nodes to a technical architecture graph.",
    "Each question must have 3 or 4 concise options.",
    "Each option label must fit a compact button.",
    "Each option detail should explain the tradeoff or interpretation behind that answer.",
    "Tailor the questions to the brief and the existing graph structure.",
    "Prefer questions about scope, depth, relationship shape, and implementation emphasis.",
    "Do not ask for confirmation or approvals.",
    "",
    `User brief: ${input.brief}`,
    input.selectedNode
      ? `Selected node: ${summarizeNode(input.selectedNode, input.project)}`
      : "Selected node: none",
    "",
    summarizeGraph(input.project),
  ].join("\n");
}

export function buildNodeGenerationPrompt(input: {
  project: ProjectRecord;
  selectedNode: MapNode | null;
  brief: string;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
}) {
  return [
    "You are expanding a technical architecture graph.",
    "Generate 5 to 10 new nodes unless the brief and answers clearly imply fewer.",
    "Use the existing graph as context and attach new nodes where they fit best.",
    "The selected node is a strong signal but you may attach elsewhere when the graph structure makes a better anchor obvious.",
    "Return only nodes that do not already exist in the graph.",
    "Depth should be coherent with surrounding nodes.",
    "Keep node labels compact and concrete.",
    "Use only the project metadata keys listed below when populating metadata.",
    "Each populated metadata value should stay concise and concrete.",
    "Links may target existing nodes or newly generated nodes.",
    "For parent/child structure, emit links with parentChild: true and no relationship.",
    'For non-parent/child adjacency, emit parentChild: false with relationship "related", "dependency", or "reuse".',
    "Create parentChild links first to anchor true depth before adding cross-cutting relationship links.",
    "",
    `User brief: ${input.brief}`,
    input.selectedNode
      ? `Selected node: ${summarizeNode(input.selectedNode, input.project)}`
      : "Selected node: none",
    "",
    "Clarification answers:",
    summarizeQuestions(input.questions, input.answers),
    "",
    summarizeGraph(input.project),
  ].join("\n");
}

export function buildFollowUpPrompt(input: {
  project: ProjectRecord;
  brief: string;
  summary: string;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
}) {
  return [
    "Generate exactly 4 follow-up suggestions for continuing a graph-building workflow.",
    "Each suggestion should be actionable, compact, and suitable for a clickable chip.",
    "Each suggestion needs a label, a prefilled brief, and one short guidance sentence.",
    "Do not suggest persisting data or asking for confirmation.",
    "",
    `Original brief: ${input.brief}`,
    `Generation summary: ${input.summary}`,
    "",
    "Selected answers:",
    summarizeQuestions(input.questions, input.answers),
    "",
    `Updated graph node count: ${input.project.spatialMap.nodes.length}`,
    `Updated graph link count: ${input.project.spatialMap.links.length}`,
    "",
    "Project context:",
    summarizeGraph(input.project),
  ].join("\n");
}

export function summarizeFollowUpSuggestions(suggestions: FollowUpSuggestion[]) {
  return summarizeSuggestions(suggestions);
}
