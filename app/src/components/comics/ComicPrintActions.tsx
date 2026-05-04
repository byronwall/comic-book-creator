import { Printer } from "lucide-solid";
import { For, Show, createSignal } from "solid-js";
import type { ComicPage } from "~/lib/comics/types";
import { ComicPaper } from "./ComicPaper";
import { type ComicPrintArrangement, buildComicPrintSheets } from "./comic-print-imposition";

type PrintMode = "active" | "all";

export function PrintActions(props: { activePage?: ComicPage; pages?: ComicPage[] }) {
  const pages = () => props.pages ?? [];
  const activePage = () => props.activePage ?? pages()[0];
  const printPages = () => (printMode() === "all" ? pages() : activePage() ? [activePage() as ComicPage] : []);
  const printArrangement = (): ComicPrintArrangement => (printMode() === "all" ? "booklet" : "two-up-consecutive");
  const printSheets = () => buildComicPrintSheets(printPages(), printArrangement());
  const [printMode, setPrintMode] = createSignal<PrintMode>("active");

  function print(mode: PrintMode) {
    setPrintMode(mode);
    requestAnimationFrame(() => window.print());
  }

  return (
    <>
      <div class="comic-print-actions">
        <button type="button" class="comic-btn" onClick={() => print("active")}>
          <Printer size={18} /> Print This Page
        </button>
        <Show when={pages().length > 1}>
          <button type="button" class="comic-btn primary" onClick={() => print("all")}>
            <Printer size={18} /> Print All Pages
          </button>
        </Show>
      </div>
      <Show when={printSheets().length > 0}>
        <div class="comic-print-book" aria-hidden="true">
          <For each={printSheets()}>
            {(sheet) => (
              <section class="comic-print-sheet" data-print-arrangement={printArrangement()}>
                <For each={sheet.slots}>
                  {(slot) => (
                    <div class="comic-print-slot">
                      <Show when={slot.page} fallback={<div class="comic-print-blank" />}>
                        {(page) => (
                          <ComicPaper
                            page={page()}
                            selectedTextId=""
                            onSelectText={() => undefined}
                            onDeselectText={() => undefined}
                            onUpdateText={() => undefined}
                          />
                        )}
                      </Show>
                    </div>
                  )}
                </For>
              </section>
            )}
          </For>
        </div>
      </Show>
    </>
  );
}
