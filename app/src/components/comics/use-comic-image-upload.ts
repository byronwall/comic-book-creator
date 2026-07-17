import { createSignal } from "solid-js";
import type { ComicPageImage } from "~/lib/comics/types";

export function useComicImageUpload(options: {
  bookId: () => string;
  onLayerImage: (image: ComicPageImage) => void;
  onNewImage: (image: ComicPageImage) => void;
  onReplaceImage: (image: ComicPageImage) => void;
}) {
  const [state, setState] = createSignal<"idle" | "uploading">("idle");
  const [error, setError] = createSignal("");
  let input: HTMLInputElement | undefined;
  let target: "layer" | "new" | "replace" = "new";
  let pendingUploads = 0;

  function setInputRef(element: HTMLInputElement) {
    input = element;
  }

  function choose(nextTarget: "new" | "replace") {
    target = nextTarget;
    setError("");
    input?.click();
  }

  async function upload(file: File, nextTarget?: "layer" | "new" | "replace") {
    const uploadTarget = nextTarget ?? target;
    pendingUploads += 1;
    setState("uploading");
    setError("");
    const formData = new FormData();
    formData.set("image", file);

    try {
      const response = await fetch(`/api/comic-books/${options.bookId()}/images`, { method: "POST", body: formData });
      if (!response.ok) throw new Error((await response.text()) || `Upload failed: ${response.status}`);
      const image = await response.json() as ComicPageImage;
      if (uploadTarget === "replace") options.onReplaceImage(image);
      else if (uploadTarget === "layer") options.onLayerImage(image);
      else options.onNewImage(image);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload this photo.");
    } finally {
      pendingUploads -= 1;
      if (pendingUploads === 0) setState("idle");
      if (input) input.value = "";
    }
  }

  return {
    choose,
    error,
    setInputRef,
    state,
    upload,
  };
}
