import { withLlmCallLogging } from "~/lib/llm-logging/logger.server";
import type { NodeMockupImageSize } from "./prompts";

const OPENAI_IMAGE_GENERATION_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_MODEL = "gpt-image-2";
const IMAGE_QUALITY = "low";
const IMAGE_FORMAT = "png";

interface ImageGenerationResponse {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
}

interface ImageGenerationLogContext {
  pipeline: string;
  sessionId: string;
  callId?: string;
  label?: string;
}

export async function generateLowCostMockupImage(plan: {
  imagePrompt: string;
  size: NodeMockupImageSize;
}, logContext?: ImageGenerationLogContext) {
  const execute = async () => {
    const response = await fetch(OPENAI_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: plan.imagePrompt,
        n: 1,
        size: plan.size,
        quality: IMAGE_QUALITY,
        output_format: IMAGE_FORMAT,
        background: "opaque",
      }),
    });

    const requestId = response.headers.get("x-request-id");
    const payload = await response.json().catch(() => null) as ImageGenerationResponse | null;

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

    return {
      bytes: Buffer.from(imageBase64, "base64"),
      requestId,
      responseStatus: response.status,
    };
  };

  if (!logContext) {
    const result = await execute();
    return result.bytes;
  }

  const result = await withLlmCallLogging(
    logContext.pipeline,
    logContext.sessionId,
    {
      callId: logContext.callId ?? "generate-image",
      label: logContext.label ?? "Generate GPT image",
      request: {
        provider: "openai",
        modelId: IMAGE_MODEL,
        prompt: plan.imagePrompt,
        size: plan.size,
        quality: IMAGE_QUALITY,
        outputFormat: IMAGE_FORMAT,
        background: "opaque",
      },
    },
    execute,
    (value) => ({
      response: {
        requestId: value.requestId,
        responseStatus: value.responseStatus,
        imageByteLength: value.bytes.byteLength,
      },
    }),
  );

  return result.bytes;
}
