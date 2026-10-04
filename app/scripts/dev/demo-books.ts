/* Sample books for the dev demo data. Plain JSON shapes; the app normalizes them on read. */

type Kind = "speech" | "thought" | "caption" | "sfx";
interface DemoImage { source: string; filename: string }

const sizes: Record<Kind, number> = { speech: 18, thought: 16, caption: 15, sfx: 44 };
let textCount = 0;

function text(kind: Kind, words: string, x: number, y: number, width = kind === "sfx" ? 46 : 34, extra: Record<string, unknown> = {}) {
  textCount += 1;
  return {
    id: `${kind}-demo-${textCount}`, kind, text: words, panelIndex: 0, positionScope: "page",
    x, y, width, fontSize: sizes[kind], rotation: kind === "sfx" ? -9 : 0, align: "center", autoWrap: true, ...extra,
  };
}

function page(index: number, layout: string, texts: unknown[], extra: Record<string, unknown> = {}) {
  return { id: `page-${index}`, title: `Page ${index}`, status: texts.length ? "Draft" : "Blank", layout, paperSize: "letter-portrait", texts, ...extra };
}

function photo(filename: string, originalName: string) {
  return {
    id: `image-${filename}`, filename, originalName, mimeType: "image/webp", treatment: "color",
    brightness: 105, contrast: 125, threshold: 58, x: 10, y: 10, width: 80, height: 80, rotation: 0, fit: "contain",
  };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export function demoBooks(users: { dev: string; friend: string }) {
  const books: { book: Record<string, unknown>; images: DemoImage[] }[] = [];
  const add = (owner: string, id: string, title: string, updatedDaysAgo: number, pages: unknown[], images: DemoImage[] = []) => {
    books.push({ book: { id, ownerUserId: owner, revision: 1, title, updatedAt: daysAgo(updatedDaysAgo), pages }, images });
  };

  add(users.dev, "demo-robo-kid", "Robo-Kid vs. T-Rex", 0, [
    page(1, "bigTop", [
      text("caption", "ROBO-KID VS. T-REX: ISSUE #1", 8, 6, 60),
      text("sfx", "ROAR!", 60, 18),
      text("speech", "Is that... a DINOSAUR?!", 10, 62),
    ], { cover: true }),
    page(2, "four", [
      text("speech", "Jet boots, ACTIVATE!", 6, 8),
      text("sfx", "FWOOSH!", 56, 12),
      text("thought", "I hope he likes robots...", 8, 58),
      text("speech", "CHOMP CHOMP!", 58, 60, 30),
    ]),
    page(3, "diagonalAction", [
      text("sfx", "KA-BLAM!", 30, 36, 36),
      text("caption", "Meanwhile, at the volcano...", 6, 6, 48),
    ]),
    page(4, "blank", [text("caption", "Robo-Kid's sketchbook", 8, 4, 50)], { mode: "image", images: [photo("rocket.webp", "rocket-sketch.webp")] }),
    page(5, "splashInset", [
      text("speech", "Wanna be friends?", 14, 20),
      text("caption", "TO BE CONTINUED...", 50, 86, 40),
    ], { cover: true }),
  ], [{ source: "rocket-pencil.webp", filename: "rocket.webp" }]);

  add(users.dev, "demo-ninja-shark", "Ninja Shark Attack", 2, [
    page(1, "heroRight", [
      text("caption", "Deep in the ocean lives a shark who knows karate.", 6, 6, 44),
      text("sfx", "HI-YAH!", 54, 40),
    ]),
    page(2, "six", [
      text("speech", "Who stole my fish sticks?", 6, 6),
      text("thought", "It was the octopus. It's ALWAYS the octopus.", 52, 38, 38),
      text("sfx", "SPLASH!", 20, 72),
    ]),
    page(3, "letterbox", [text("speech", "Prepare for... FIN-JITSU!", 30, 44)], { paperSize: "letter-landscape" }),
  ]);

  add(users.dev, "demo-space-pirates", "Space Pirates of Planet Zorg", 6, [
    page(1, "cinematicSlant", [
      text("caption", "Year 3025. The cookie supply is gone.", 6, 6, 50),
      text("speech", "Arrr! Set a course for Planet Zorg!", 40, 54),
    ], { paperSize: "half-portrait" }),
    page(2, "threeVertical", [
      text("sfx", "ZAP!", 8, 20, 22),
      text("sfx", "ZORP!", 40, 50, 22),
      text("sfx", "BOOM!", 70, 20, 22),
    ], { paperSize: "half-portrait" }),
  ]);

  add(users.dev, "demo-photo-comic", "My Drawings", 9, [
    page(1, "blank", [text("speech", "I drew this!", 58, 6, 30)], { mode: "image", images: [photo("bunny.webp", "bunny-drawing.webp")] }),
    page(2, "blank", [], { mode: "image", images: [photo("printer.webp", "printer-drawing.webp")] }),
  ], [{ source: "bunny-pencil.webp", filename: "bunny.webp" }, { source: "printer-booklet.webp", filename: "printer.webp" }]);

  add(users.dev, "demo-blank", "Untitled Comic Book", 14, [page(1, "four", [])]);

  add(users.friend, "demo-friend-book", "Friend's Secret Comic", 1, [
    page(1, "four", [text("speech", "Only the friend account can see this book.", 8, 8, 60)]),
  ]);

  return books;
}
