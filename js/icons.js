// Pixel icons (Pixelarticons by Gerrit Halfmann, MIT). The icon shapes live once in index.html
// as an SVG sprite; this just returns the markup that shows one of them.
export const icon = (name) => `<svg class="pi" aria-hidden="true"><use href="#pi-${name}"/></svg>`;