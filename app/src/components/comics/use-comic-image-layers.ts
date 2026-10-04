import type { ComicPage, ComicPageImage } from "~/lib/comics/types";

export function useComicImageLayers(options: {
  updateActivePage: (updater: (page: ComicPage) => ComicPage) => void;
  selectedImageId: () => string;
  setSelectedTextId: (id: string) => void;
  setSelectedImageId: (id: string) => void;
}) {
  const { updateActivePage, selectedImageId, setSelectedTextId, setSelectedImageId } = options;
  function addImageLayer(image: ComicPageImage) {
    updateActivePage((page) => {
      const images = page.images ?? [];
      const cascade = images.length % 5;
      const layeredImage = images.length === 0
        ? image
        : { ...image, x: 8 + cascade * 4, y: 8 + cascade * 4, width: 72, height: 72 };
      return {
        ...page,
        mode: "image",
        layout: "blank",
        images: [...images, layeredImage],
        status: "Draft",
      };
    });
    setSelectedTextId("");
    setSelectedImageId(image.id);
  }

  function updatePageImage(patch: Partial<ComicPageImage>) {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => ({
      ...page,
      images: page.images?.map((image) => image.id === imageId ? { ...image, ...patch } : image),
      status: "Draft",
    }));
  }

  function replaceImage(image: ComicPageImage) {
    const imageId = selectedImageId();
    if (!imageId) {
      addImageLayer(image);
      return;
    }
    updateActivePage((page) => ({
      ...page,
      mode: "image",
      layout: "blank",
      images: page.images?.map((currentImage) => currentImage.id === imageId
        ? {
            ...currentImage,
            src: image.src,
            filename: image.filename,
            originalName: image.originalName,
            mimeType: image.mimeType,
            crop: undefined,
          }
        : currentImage),
      status: "Draft",
    }));
    setSelectedTextId("");
  }

  function resetPageImage() {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => {
      const selected = page.images?.find((image) => image.id === imageId);
      if (!selected) return page;
      const background = { ...selected, x: 0, y: 0, width: 100, height: 100, rotation: 0, fit: "contain" as const };
      return { ...page, images: [background, ...(page.images?.filter((image) => image.id !== imageId) ?? [])], status: "Draft" };
    });
  }

  function moveSelectedImageLayer(direction: -1 | 1) {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => {
      const images = [...(page.images ?? [])];
      const currentIndex = images.findIndex((image) => image.id === imageId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) return page;
      [images[currentIndex], images[nextIndex]] = [images[nextIndex], images[currentIndex]];
      return { ...page, images, status: "Draft" };
    });
  }

  return { addImageLayer, updatePageImage, replaceImage, resetPageImage, moveSelectedImageLayer };
}
