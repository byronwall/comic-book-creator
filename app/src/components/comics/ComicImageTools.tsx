import { ArrowDown, ArrowUp, ImageIcon, RefreshCw, RotateCcw } from "lucide-solid";
import { Show } from "solid-js";
import type { ComicPageImage } from "~/lib/comics/types";

type ImagePatch = Partial<Pick<ComicPageImage, "brightness" | "contrast" | "fit" | "height" | "rotation" | "threshold" | "treatment" | "width" | "x" | "y">>;

export function ComicImageTools(props: {
  image?: ComicPageImage;
  layerIndex: number;
  layerCount: number;
  uploading: boolean;
  uploadError: string;
  onChooseImage: () => void;
  onMoveLayer: (direction: -1 | 1) => void;
  onReset: () => void;
  onUpdate: (patch: ImagePatch) => void;
}) {
  return (
    <aside class="comic-card comic-tools comic-image-tools">
      <h2>Selected Photo</h2>
      <p class="comic-empty-note">Drag the photo or resize it with the blue corner handles.</p>
      <p class="comic-image-layer-label">Photo layer {props.layerIndex + 1} of {props.layerCount}</p>
      <div class="comic-image-layer-actions">
        <button type="button" class="comic-btn" disabled={props.layerIndex <= 0} onClick={() => props.onMoveLayer(-1)}>
          <ArrowDown size={16} /> Send Backward
        </button>
        <button type="button" class="comic-btn" disabled={props.layerIndex >= props.layerCount - 1} onClick={() => props.onMoveLayer(1)}>
          <ArrowUp size={16} /> Bring Forward
        </button>
      </div>
      <button type="button" class="comic-btn comic-image-replace" disabled={props.uploading} onClick={props.onChooseImage}>
        <RefreshCw size={17} /> {props.uploading ? "Uploading..." : "Replace Photo"}
      </button>
      <Show when={props.uploadError}><p class="comic-dialog-error">{props.uploadError}</p></Show>

      <Show when={props.image}>
        {(image) => (
          <>
            <div class="comic-image-mode-grid" aria-label="Image printing style">
              <button classList={{ active: image().treatment === "color" }} onClick={() => props.onUpdate({ treatment: "color" })}>Color</button>
              <button classList={{ active: image().treatment === "grayscale" }} onClick={() => props.onUpdate({ treatment: "grayscale" })}>Grayscale</button>
              <button classList={{ active: image().treatment === "threshold" }} onClick={() => props.onUpdate({ treatment: "threshold" })}>Crisp B&amp;W</button>
            </div>

            <Show when={image().treatment === "grayscale"}>
              <ImageSlider label="Brightness" value={image().brightness} min={50} max={150} onInput={(brightness) => props.onUpdate({ brightness })} />
              <ImageSlider label="Contrast" value={image().contrast} min={50} max={300} onInput={(contrast) => props.onUpdate({ contrast })} />
            </Show>
            <Show when={image().treatment === "threshold"}>
              <ImageSlider label="Black cutoff" value={image().threshold} min={10} max={90} onInput={(threshold) => props.onUpdate({ threshold })} />
              <p class="comic-image-hint">Lower it to remove gray shadows. Raise it to keep faint pencil lines.</p>
            </Show>

            <hr />
            <label class="comic-field">
              <span>Photo fit</span>
              <select value={image().fit} onChange={(event) => props.onUpdate({ fit: event.currentTarget.value as "contain" | "cover" })}>
                <option value="contain">Show the whole page</option>
                <option value="cover">Fill and crop edges</option>
              </select>
            </label>
            <ImageSlider label="Rotation" value={image().rotation} min={-180} max={180} suffix="°" onInput={(rotation) => props.onUpdate({ rotation })} />
            <button type="button" class="comic-btn comic-image-reset" onClick={props.onReset}>
              <RotateCcw size={17} /> Reset as Background
            </button>
            <p class="comic-image-hint">Fills the page-sized object and keeps it behind bubbles and captions.</p>
            <p class="comic-image-filename"><ImageIcon size={15} /> {image().originalName}</p>
          </>
        )}
      </Show>
    </aside>
  );
}

function ImageSlider(props: { label: string; value: number; min: number; max: number; suffix?: string; onInput: (value: number) => void }) {
  return (
    <label class="comic-field comic-image-slider">
      <span class="comic-field-label-row"><span>{props.label}</span><strong>{props.value}{props.suffix ?? ""}</strong></span>
      <input type="range" min={props.min} max={props.max} value={props.value} onInput={(event) => props.onInput(Number(event.currentTarget.value))} />
    </label>
  );
}
