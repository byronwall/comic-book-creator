import { appPath } from "~/lib/router/app-path";
import { createSignal } from "solid-js";
import type { ComicPageImage } from "~/lib/comics/types";

export function useComicImageUpload(options: {
  bookId: () => string;
  userId: string;
  onLayerImage: (image: ComicPageImage) => void;
  onNewImage: (image: ComicPageImage) => void;
  onReplaceImage: (image: ComicPageImage) => void;
}) {
  const [state, setState] = createSignal<"idle" | "uploading">("idle");
  const [error, setError] = createSignal("");
  let input: HTMLInputElement | undefined;
  let target: "layer" | "new" | "replace" = "new";
  let pendingUploads = 0;
  const controllers = new Set<AbortController>();

  function setInputRef(element: HTMLInputElement) {
    input = element;
  }

  function choose(nextTarget: "new" | "replace") {
    target = nextTarget;
    setError("");
    input?.click();
  }

  async function upload(file: File, nextTarget?: "layer" | "new" | "replace" | "processed") {
    const uploadTarget = nextTarget ?? target;
    pendingUploads += 1;
    setState("uploading");
    setError("");
    const formData = new FormData();
    formData.set("image", file);
    const controller = new AbortController();
    controllers.add(controller);

    try {
      const userId = options.userId;
      const bookId = options.bookId();
      const response = await fetch(appPath(`/api/comic-books/${bookId}/images`), { method: "POST", headers: { "x-comic-user": userId }, body: formData, signal: controller.signal });
      if (!response.ok) throw new Error((await response.text()) || `Upload failed: ${response.status}`);
      const image = await response.json() as ComicPageImage;
      if (uploadTarget === "replace") options.onReplaceImage(image);
      else if (uploadTarget === "layer") options.onLayerImage(image);
      else if (uploadTarget === "new") options.onNewImage(image);
      return image;
    } catch (uploadError) {
      if (!(uploadError instanceof DOMException && uploadError.name === "AbortError")) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not upload this photo.");
      }
      return null;
    } finally {
      controllers.delete(controller);
      pendingUploads -= 1;
      if (pendingUploads === 0) setState("idle");
      if (input) input.value = "";
    }
  }

  async function cancelAndWait() {
    for (const controller of controllers) controller.abort();
    while (pendingUploads > 0) await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return {
    choose,
    cancelAndWait,
    error,
    setInputRef,
    state,
    upload,
  };
}
