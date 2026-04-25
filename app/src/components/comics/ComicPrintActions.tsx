import { Printer } from "lucide-solid";

export function PrintActions() {
  return (
    <div class="comic-print-actions">
      <button type="button" class="comic-btn primary" onClick={() => window.print()}>
        <Printer size={18} /> Print This Page
      </button>
    </div>
  );
}
