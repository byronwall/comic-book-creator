import type { MapLink, MapLinkRelationship } from "./types";

export const mapLinkRelationships = ["related", "dependency", "reuse"] as const;

export function isMapLinkRelationship(value: unknown): value is MapLinkRelationship {
  return typeof value === "string" && mapLinkRelationships.includes(value as MapLinkRelationship);
}

export function createParentChildLink(input: {
  source: string;
  target: string;
}): MapLink {
  return {
    source: input.source,
    target: input.target,
    parentChild: true,
  };
}

export function createRelationshipLink(input: {
  source: string;
  target: string;
  relationship?: MapLinkRelationship;
}): MapLink {
  return {
    source: input.source,
    target: input.target,
    parentChild: false,
    relationship: input.relationship ?? "related",
  };
}

export function getLinkLabel(link: MapLink) {
  return link.parentChild ? "parent-child" : link.relationship ?? "related";
}

export function getLinkKey(link: MapLink) {
  return `${link.source}::${link.target}::${getLinkLabel(link)}`;
}
