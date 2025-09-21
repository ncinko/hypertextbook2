# Style Guide

## Core Principles
- **Teach through interaction.** Prioritize simulations that reinforce the written exposition on each page. Keep text concise and let controls encourage exploration, mirroring the existing lesson pages in `src/pages/`.【F:src/pages/Kinematics.js†L1-L112】
- **Use idiomatic React.** All UI is built with function components and React hooks (`useState`, `useRef`, `useEffect`, etc.). Follow the patterns used in `App.js`, `LandingPage.js`, and the simulation components.【F:src/App.js†L1-L77】【F:src/LandingPage.js†L1-L76】
- **Keep routing and SEO in sync.** Every new page must be registered in `App.js` and added to `generate-sitemap.js` so deployment builds publish correct navigation and sitemap metadata.【F:src/App.js†L21-L77】【F:generate-sitemap.js†L1-L35】

## JavaScript & React Conventions
- **Functional components only.** Do not introduce class components; stateful logic should use hooks as demonstrated in simulations like `DoublePendulum.js` and `BeadOnRotatingRod.jsx`.【F:src/DoublePendulum.js†L1-L82】【F:src/components/mechanics/BeadOnRotatingRod.jsx†L1-L36】
- **Localize state.** Keep simulation state (`useState`, `useRef`) inside the component that owns the animation or visualization. Expose props only when parent pages need to control a child simulation.
- **Side effects in `useEffect`.** Handle canvas resizing, animation loops, and data fetching inside `useEffect` blocks with appropriate cleanup to avoid memory leaks.【F:src/LandingPage.js†L29-L73】
- **Prefer descriptive comments.** Complex physics logic should include top-of-file docblocks and inline explanations as seen across the mechanics and electricity simulations.【F:src/components/mechanics/BeadOnRotatingRod.jsx†L1-L22】【F:src/components/electricity/PotentialFieldSimulation.js†L1-L26】

## File Organization & Naming
- **Pages vs. components.** Place lesson pages in `src/pages/` and reusable simulations in `src/components/`, creating subfolders (`electricity`, `mechanics`, `shared`, etc.) to group related logic.【F:src/components/electricity/PotentialFieldSimulation.js†L1-L8】
- **PascalCase files.** Name React component files using PascalCase (`Kinematics.js`, `HiddenExposition.jsx`). Export a component with the same name as the file.
- **Assets.** Store images that need bundling in `src/assets/` and reference them via imports. Put large or static files in `public/assets/` and reference them with absolute URLs (as done by `LandingPage` for the hawk sprites).【F:src/LandingPage.js†L33-L59】

## Styling Guidelines
- **Centralized imports.** Add new global styles inside `src/styles/` and import them through `src/styles/main.css` so that `App.js` pulls in a single stylesheet.【F:src/styles/main.css†L1-L8】
- **Use classes for layout.** Leverage existing class names (`container`, `simulation-grid`, etc.) from `src/styles.css` for consistent layout. Add new classes there or in a domain-specific stylesheet instead of inline styles when the styling is static.【F:src/styles.css†L1-L94】
- **Responsive design.** Mirror the responsive breakpoints defined in `src/styles/responsive.css` when adding new flex/grid layouts, ensuring controls stack cleanly on tablets and phones.【F:src/styles/responsive.css†L1-L21】
- **Inline styles for dynamic visuals.** Inline styles are acceptable when driven by component state (e.g., simulation canvases, toggled cards). Keep them focused and memoized if they become complex.【F:src/components/HiddenExposition.jsx†L1-L40】

## Math, Text, and Accessibility
- **MathJax for formulas.** Use `better-react-mathjax` with `MathJaxContext` to render equations; wrap inline expressions with `MathJax inline` and block expressions in standalone `MathJax` components as shown in `Kinematics.js`.【F:src/pages/Kinematics.js†L1-L112】
- **Semantic structure.** Follow the heading hierarchy used on existing pages (`<h1>` title, `<h2>` sections) and keep explanatory text left-aligned using the `.left-aligned-container` styles.【F:src/pages/Kinematics.js†L19-L105】【F:src/styles.css†L21-L40】
- **Accessible controls.** Provide keyboard instructions and labelled controls for simulations; ensure interactive components expose ARIA attributes when content is toggled (see `HiddenExposition.jsx`).【F:src/components/HiddenExposition.jsx†L21-L55】

## Simulation Patterns
- **Canvas & animation.** Use `useRef` to hold animation state and requestAnimationFrame IDs, resizing canvases responsively as shown in `LandingPage.js`. Clean up observers or RAF handles on unmount.【F:src/LandingPage.js†L29-L109】
- **p5.js sketches.** For `react-p5` components, define `setup` and `draw` functions inside the component and rely on refs to store simulation state, following `DoublePendulum.js` as a template.【F:src/DoublePendulum.js†L23-L82】
- **Physics parameters.** Expose user-facing controls for key parameters using controlled inputs. Keep parameter defaults near the top of the component for quick scanning, as demonstrated in multiple simulations.【F:src/DoublePendulum.js†L5-L21】【F:src/components/mechanics/BeadOnRotatingRod.jsx†L19-L33】

## Testing & Quality Assurance
- **React Testing Library.** Add or extend tests in `src/App.test.js` or create new `*.test.js(x)` files alongside features. Keep assertions focused on user-facing behavior; Jest DOM is preconfigured in `src/setupTests.js`.【F:src/App.test.js†L1-L9】【F:src/setupTests.js†L1-L5】
- **Manual verification.** For simulations, verify performance at 60fps on desktop and acceptable responsiveness on mobile breakpoints defined in the CSS.
- **Pre-deploy checks.** Before releasing, run `npm run generate-sitemap`, `npm test`, and `npm run build` to confirm the sitemap, tests, and production bundle succeed.【F:package.json†L26-L37】【F:generate-sitemap.js†L1-L35】

## Content & Deployment Workflow
1. Draft or update the lesson page in `src/pages/` with supporting simulations.
2. Import simulations from `src/components/` and add links to the navigation in `App.js`.
3. Update copy to include control instructions and inline explanations similar to existing sections.
4. Update assets and styles as needed, keeping layout responsive.
5. Regenerate the sitemap and run the test/build commands prior to pushing to production.
