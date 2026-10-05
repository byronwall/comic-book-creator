# Design direction

## Comic pop theme (current)

One look across landing, accounts, library, and editor: warm dotted paper,
2.5px ink outlines, hard offset "pop" shadows, and bright yellow/red/blue/green accents.
Fonts: Fredoka for UI text, Bangers for the logo and page titles (Google Fonts, loaded in `entry-server.tsx`).
`--comic-display` stays Trebuchet because comic page text wrapping is tuned to it.
Theme tokens live in `src/components/comics/comic-base.css`; keep layout positions stable for young users.

## Original account-work notes

Use the existing comic visual style for the new account surfaces.
The app uses bold black outlines, warm paper, bright accents, and offset shadows.
Reuse its logo, buttons, typography, and page spacing.
Do not replace the editor design during the account work.

The home page pairs a clear introduction with a synthetic comic page.
Show the three main steps: choose a layout, tell a story, print a book.
Make account creation the main action. Keep sign-in easy to find.

Account forms need visible labels and linked error messages.
Use the shared UI controls where they fit the existing style.
Keep the form width readable on phones and larger screens.
Use a password visibility control only if its label states the current action.

The library shows the account username and a clear empty state.
The editor shows save status and offers draft recovery when saving stops.
Use existing breakpoints and tokens. Avoid new decorative patterns.

## Admin surface

The admin route uses the same comic shell, type, tokens, and controls.
Use compact ruled tables and summary strips for users, events, and storage.
Keep account controls in an inline details panel with visible consequences and confirmations.
Keep private book content out of this surface.
