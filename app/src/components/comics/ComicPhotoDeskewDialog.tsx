import { createEffect, createSignal, For, on, Show } from "solid-js";
import { SimpleDialog } from "~/components/ui/simple-dialog";
import type { ComicPageImage } from "~/lib/comics/types";
import { type Corners, deskewPixels } from "./deskew-photo";

const initialCorners: Corners = [
  { x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 },
  { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 },
];
const cornerNames = ["top left", "top right", "bottom right", "bottom left"];

export function ComicPhotoDeskewDialog(props: {
  open: boolean;
  image: ComicPageImage;
  onOpenChange: (open: boolean) => void;
  onSave: (file: File, corners: Corners) => Promise<boolean>;
}) {
  const [corners, setCorners] = createSignal<Corners>(initialCorners);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  let photo: HTMLImageElement | undefined;
  let frame: HTMLDivElement | undefined;

  createEffect(on(() => props.open, (open) => {
    if (open) {
      setCorners((props.image.crop?.corners ?? initialCorners).map((point) => ({ ...point })) as Corners);
      setError("");
    }
  }));

  const sourceSrc = () => props.image.src.slice(0, props.image.src.lastIndexOf("/") + 1)
    + encodeURIComponent(props.image.crop?.sourceFilename ?? props.image.filename);

  function moveCorner(index: number, x: number, y: number) {
    setCorners((current) => current.map((point, i) => i === index
      ? { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
      : point) as Corners);
  }

  function dragCorner(event: PointerEvent, index: number) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const update = (pointer: PointerEvent) => {
      const rect = frame?.getBoundingClientRect();
      if (rect) moveCorner(index, (pointer.clientX - rect.left) / rect.width, (pointer.clientY - rect.top) / rect.height);
    };
    update(event);
    target.addEventListener("pointermove", update);
    target.addEventListener("pointerup", () => target.removeEventListener("pointermove", update), { once: true });
    target.addEventListener("pointercancel", () => target.removeEventListener("pointermove", update), { once: true });
  }

  async function save() {
    if (!photo?.complete || !photo.naturalWidth || saving()) return;
    setSaving(true);
    setError("");
    try {
      const source = document.createElement("canvas");
      source.width = photo.naturalWidth;
      source.height = photo.naturalHeight;
      const sourceContext = source.getContext("2d", { willReadFrequently: true });
      if (!sourceContext) throw new Error("Could not read this photo.");
      sourceContext.drawImage(photo, 0, 0);
      const result = deskewPixels(sourceContext.getImageData(0, 0, source.width, source.height), corners());
      const canvas = document.createElement("canvas");
      canvas.width = result.width;
      canvas.height = result.height;
      canvas.getContext("2d")?.putImageData(result, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not save this photo.");
      const name = props.image.originalName.replace(/\.[^.]+$/, "") + "-deskew.png";
      if (!await props.onSave(new File([blob], name, { type: "image/png" }), corners())) {
        throw new Error("Could not upload this photo.");
      }
      props.onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't straighten this photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Straighten & crop your photo"
      description="Drag the four blue dots to the corners of your drawing. We'll straighten it out."
      maxW="900px"
      contentClass="comic-dialog"
      skipPortal
    >
      <div class="comic-deskew-dialog">
        <div class="comic-deskew-frame" ref={frame}>
          <img ref={photo} src={sourceSrc()} alt="Your original photo" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={corners().map((point) => `${point.x * 100},${point.y * 100}`).join(" ")} />
          </svg>
          <For each={[0, 1, 2, 3]}>{(index) => (
            <button
              type="button"
              class="comic-deskew-point"
              style={{ left: `${corners()[index].x * 100}%`, top: `${corners()[index].y * 100}%` }}
              aria-label={`Move ${cornerNames[index]} crop corner`}
              onPointerDown={(event) => dragCorner(event, index)}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 0.02 : 0.005;
                const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                if (dx || dy) {
                  event.preventDefault();
                  moveCorner(index, corners()[index].x + dx, corners()[index].y + dy);
                }
              }}
            />
          )}</For>
        </div>
        <Show when={error()}><p class="comic-dialog-error" role="alert">{error()}</p></Show>
        <div class="comic-deskew-actions">
          <button type="button" class="comic-btn" onClick={() => props.onOpenChange(false)} disabled={saving()}>Cancel</button>
          <button type="button" class="comic-btn primary" onClick={() => void save()} disabled={saving()}>{saving() ? "Saving…" : "Save Photo"}</button>
        </div>
      </div>
    </SimpleDialog>
  );
}
