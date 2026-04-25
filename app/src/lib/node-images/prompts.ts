import type { NodeImageGenerationContext } from "./context";
import { formatNodeImageGenerationContext } from "./context";

export const nodeMockupImageSizes = ["816x816", "1024x768", "768x1024"] as const;

export type NodeMockupImageSize = (typeof nodeMockupImageSizes)[number];

export function buildNodeImagePromptPlanningPrompt(context: NodeImageGenerationContext) {
  return [
    "You are preparing a GPT-Image-2 prompt for a low-cost UI mockup generation test.",
    "Use the target node and its child hierarchy as the product context.",
    "Create a single image prompt for a plausible product UI mockup, screen, panel, flow, or dashboard that represents this subtree.",
    "Prefer generic UI labels and fictional data. Do not include brand names, real people, or logos.",
    "Make the generated image useful as a visual design reference attached to the node.",
    "The output should ask for a polished product screenshot or high-fidelity wireframe, not a diagram of the node graph.",
    "Choose exactly one image size from the allowed list.",
    "Prefer 816x816 for cost. Use 1024x768 only when a wide layout is clearly better, and 768x1024 only when a tall/mobile or stacked layout is clearly better.",
    "Keep the image prompt under 1,500 characters while still describing layout, core regions, content hierarchy, visual style, and text/data constraints.",
    "",
    `Allowed sizes: ${nodeMockupImageSizes.join(", ")}`,
    "",
    "Node context:",
    formatNodeImageGenerationContext(context),
  ].join("\n");
}
