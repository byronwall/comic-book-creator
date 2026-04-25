import { Meta, Title } from "@solidjs/meta";
import { createRenderEffect } from "solid-js";
import { isServer } from "solid-js/web";

const SITE_NAME = "Comic Book Creator";
const DEFAULT_DESCRIPTION =
  "Printable comic page creator for planning panels, adding comic text, printing pages, and drawing artwork by hand.";

interface PageMetaProps {
  title?: string;
  description?: string;
  type?: "website" | "article";
}

export function PageMeta(props: PageMetaProps) {
  const title = () => normalizeText(props.title) || SITE_NAME;
  const description = () => normalizeDescription(props.description);

  createRenderEffect(() => {
    if (!isServer) {
      document.title = title();
    }
  });

  return (
    <>
      <Title>{title()}</Title>
      <Meta name="description" content={description()} />
      <Meta property="og:site_name" content={SITE_NAME} />
      <Meta property="og:type" content={props.type ?? "website"} />
      <Meta property="og:title" content={title()} />
      <Meta property="og:description" content={description()} />
      <Meta name="twitter:card" content="summary" />
      <Meta name="twitter:title" content={title()} />
      <Meta name="twitter:description" content={description()} />
    </>
  );
}

export function formatPageTitle(value: string) {
  const normalized = normalizeText(value);

  return normalized && normalized !== SITE_NAME ? `${normalized} | ${SITE_NAME}` : SITE_NAME;
}

export function formatProjectDescription(input: {
  description?: string;
  nodeCount: number;
  linkCount: number;
}) {
  const description = normalizeText(input.description);
  const stats = `${input.nodeCount} nodes and ${input.linkCount} links mapped.`;

  return description ? `${description} ${stats}` : `Project workspace with ${stats}`;
}

function normalizeDescription(value?: string) {
  const normalized = normalizeText(value) || DEFAULT_DESCRIPTION;

  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}

function normalizeText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}
