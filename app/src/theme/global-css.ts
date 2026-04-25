export const globalCss = {
  extend: {
    "*": {
      "--global-color-border": "colors.border",
      "--global-color-placeholder": "colors.fg.subtle",
      "--global-color-selection": "colors.colorPalette.subtle.bg",
      "--global-color-focus-ring": "colors.colorPalette.solid.bg",
    },
    html: {
      colorPalette: "green",
      backgroundColor: "colors.gray.2",
    },
    body: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top, token(colors.green.a3) 0%, transparent 30%), linear-gradient(180deg, token(colors.gray.1) 0%, token(colors.olive.2) 100%)",
      color: "fg.default",
      textRendering: "optimizeLegibility",
      WebkitFontSmoothing: "antialiased",
    },
  },
};
