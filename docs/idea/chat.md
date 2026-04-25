Hi, here’s a narrow PRD for the first vertical slice, plus a runnable index.html mock implementation.

PRD: Comic Book Creator vertical slice

Product goal

Help a kid create a printable comic page by:

- Choosing a basic comic panel layout.
- Adding typed comic text.
- Previewing the page for printing.
- Drawing the artwork by hand after printing.

This slice proves the core loop without accounts, cloud sync, complex drawing tools, or multi-book management.

⸻

Target user

- A kid using a laptop or desktop.
- A parent/teacher may help with printing.
- The child wants to make a comic but draw the pictures by hand.

⸻

Core user flow

1. Open a saved comic page.
2. Choose or change the page layout.
3. Add text elements:
   - Speech bubble.
   - Thought bubble.
   - Caption box.
   - Sound effect.
4. Preview the page.
5. Print the page.
6. Draw pictures into the blank panels by hand.

⸻

Required features

1. App shell

- Persistent sidebar navigation:
  - My Books.
  - Create Page.
  - Add Text.
  - Preview & Print.
  - Templates.
- Header with:
  - Current screen title.
  - Short instruction text.
  - Local save status.

2. Page rail

- Show a small list of comic pages.
- Show active page.
- Include “Add New Page” as a stub action.

3. Layout builder

- Provide simple layout buttons:
  - 4-panel layout.
  - Big-top layout.
- Page canvas updates when layout changes.
- Panels are intentionally blank and labeled as draw areas.

4. Text editor

- Add text elements:
  - Speech bubble.
  - Thought bubble.
  - Caption.
  - Sound effect.
- Show editable text on the printable comic page.
- Include basic text properties:
  - Text content.
  - Font size.
  - Alignment placeholder.

5. Preview and print

- Preview the same comic page.
- Show print options:
  - Print this page.
  - Print entire book placeholder.
  - Copies.
  - Paper size.
  - Include page numbers.
- Use browser print for the real print action.

⸻

Main components needed

Component Purpose
AppShell Overall sidebar, header, and layout
SidebarNav Main navigation states
PageRail Page thumbnails and add-page action
ComicCanvas Printable page surface
PanelLayout Renders selected panel layout
TextElement Speech bubble, thought bubble, caption, SFX
TextToolsPanel Adds new text elements
TextPropertiesPanel Edits selected text
PreviewPrintPanel Print controls
StepProgress Shows Frames → Text → Print → Draw

⸻

Explicitly out of scope

- User accounts.
- Cloud save.
- Image drawing tools.
- Drag/drop positioning persistence.
- Rich typography.
- PDF export.
- Multiple real books.
- Mobile layout polish.
- Undo/redo history.
- Real template marketplace/library.

⸻

Generated file

I created the vertical-slice implementation here:

Download the INDEX.html page￼ ￼
