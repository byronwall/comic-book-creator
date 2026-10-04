import { appPath } from "~/lib/router/app-path";

export type ComicArtName =
  | "avatar" | "book-cover" | "book-open" | "books" | "bunny-pencil" | "camera" | "caption" | "check"
  | "empty-page" | "eraser" | "home" | "page-add" | "page-four" | "page-photo" | "page-three" | "pencil"
  | "pow" | "printer" | "printer-booklet" | "reorder" | "rocket-pencil" | "sign-out" | "sparkle"
  | "speech" | "thought" | "trash";

/** Decorative sticker art from public/art. Always paired with visible text, so alt is empty. */
export function ComicArt(props: { name: ComicArtName; size?: number; class?: string }) {
  const size = () => props.size ?? 28;
  return (
    <img
      src={appPath(`/art/${props.name}.webp`)}
      alt=""
      aria-hidden="true"
      width={size()}
      height={size()}
      class={`comic-art${props.class ? ` ${props.class}` : ""}`}
      draggable={false}
    />
  );
}
