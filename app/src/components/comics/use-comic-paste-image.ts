import { onCleanup, onMount } from "solid-js";

export function useComicPasteImage(upload: (file: File, target: "layer") => unknown) {
  onMount(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;

      const item = Array.from(event.clipboardData?.items ?? []).find(
        (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
      );
      const pasted = item?.getAsFile();
      if (!pasted) return;
      event.preventDefault();
      const file = pasted.name
        ? pasted
        : new File([pasted], `pasted-comic-page-${Date.now()}.png`, { type: pasted.type || "image/png" });
      void upload(file, "layer");
    };

    window.addEventListener("paste", handlePaste);
    onCleanup(() => window.removeEventListener("paste", handlePaste));
  });
}
