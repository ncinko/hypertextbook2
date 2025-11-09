# Project Map

## Overview
Physics Nook is a Create React App project that delivers interactive physics simulations and lesson content. The application bootstraps in `src/index.js`, wraps the UI in `BrowserRouter`, and renders routes defined in `src/App.js`, where the top navigation bar and page-level routing live.【F:src/index.js†L1-L16】【F:src/App.js†L1-L77】

## Getting Started
- `npm start` – launch the development server.
- `npm test` – run the React Testing Library test suite.
- `npm run build` – create a production build in `build/`.
- `npm run generate-sitemap` – rebuild `public/sitemap.xml` using `generate-sitemap.js`.【F:package.json†L26-L37】【F:generate-sitemap.js†L1-L35】

## Directory Overview
| Path | Purpose | Highlights |
| --- | --- | --- |
| `src/` | React source for pages, simulations, styles, and entry points. | `index.js`, `App.js`, and root-level legacy simulations (e.g., `DoublePendulum.js`). |
| `src/pages/` | Narrative lesson pages that compose simulations and explanatory text. | Topics include Kinematics, Electric Field, Chaos, Momentum, Sound, etc.; pages use `better-react-mathjax` where needed.【F:src/pages/Kinematics.js†L1-L112】 |
| `src/components/` | Reusable and domain-specific simulation components grouped by subject. | Contains p5.js sketches, Plotly charts, audio synths, and shared UI like `HiddenExposition` accordions.【F:src/components/HiddenExposition.jsx†L1-L88】 |
| `src/components/electricity/` | Electric field and potential visualizations. | Includes point charge field renderers and equipotential maps.【F:src/components/electricity/PotentialFieldSimulation.js†L1-L40】 |
| `src/components/mechanics/` | Mechanics mini-simulations. | Currently contains `BeadOnRotatingRod.jsx` as an example of subject-specific grouping.【F:src/components/mechanics/BeadOnRotatingRod.jsx†L1-L40】 |
| `src/components/shared/` | Cross-cutting UI helpers. | `HiddenExposition.jsx` and `HiddenQuestion.jsx` provide reusable interactive text reveals.【F:src/components/shared/HiddenExposition.jsx†L1-L88】 |
| `src/assets/` | Bundled imagery referenced from React components. | Contains sprite sheets and illustrations such as `hawks.png` for the landing page animation.【F:src/LandingPage.js†L1-L76】 |
| `src/styles/` | Global CSS organized by concern. | `main.css` imports topic-specific styles (`global.css`, `navbar.css`, `simulations.css`, etc.).【F:src/styles/main.css†L1-L8】 |
| `public/` | Static assets served by CRA. | `index.html`, SEO files, and published sitemap. Contains `assets/` for images and `kinematics/index.html` for static hosting.【F:public/index.html†L1-L30】【F:public/sitemap.xml†L1-L5】 |
| `build/` | Generated production bundle. | Populated by `npm run build` (kept in repo for deployment).【F:build/manifest.json†L1-L30】 |
| `generate-sitemap.js` | Node script to regenerate the sitemap before builds. | Keep route list in sync with `App.js` navigation.【F:generate-sitemap.js†L1-L35】 |

## Application Flow
1. `index.js` bootstraps React and wraps the app in `BrowserRouter`.
2. `App.js` renders the global navigation and declares route-to-page mappings with `<Routes>`.
3. Each page in `src/pages/` composes textual content, MathJax blocks, and simulation components.
4. Simulation components live in `src/components/` (often inside domain folders) and encapsulate canvas, Plotly, or audio logic using React hooks.
5. Shared CSS from `src/styles/main.css` styles navigation, layouts, and responsive behavior while some simulations use inline styles for dynamic visuals.【F:src/App.js†L21-L77】【F:src/styles.css†L1-L72】

## Pages and Featured Simulations
- **LandingPage** – animates a starfield and sprite-based hawks on a `<canvas>`; links to featured simulations.【F:src/LandingPage.js†L1-L120】
- **DoublePendulum**, **SpringMass**, **IdealGas** – legacy standalone simulations in the project root, each using hooks and, in some cases, `react-p5` for rendering.【F:src/DoublePendulum.js†L1-L82】
- **Mechanics Pages** (`Kinematics`, `Kinematics2`, `Vectors`, `Momentum`, `Oscillations`) – blend MathJax exposition with components like `KinematicsSim`, `VelocityExplorer`, and question prompts.【F:src/pages/Kinematics.js†L1-L170】
- **Electricity Pages** (`ElectricField`, `ElectricPotential`, `MagneticField`, `MagneticForce`) – import simulations from `src/components/electricity` to visualize fields, potentials, and charged-particle dynamics.
- **Advanced Pages** (`Chaos`, `Sound`, `PolarKinematics`, etc.) – combine charts, canvas animations, and audio via domain components.

## Styling
- `src/styles/main.css` aggregates individual CSS files so pages can import one file for global styles.
- `src/styles.css` contains additional layout rules and landing page styles; some simulations rely on inline styles or canvas drawing for dynamic visuals.【F:src/styles.css†L1-L94】
- Responsive tweaks live in `src/styles/responsive.css`, primarily handling stacked layouts for canvases and control panels.【F:src/styles/responsive.css†L1-L21】

## Assets
- Place large static media (sprites, backgrounds) in `public/assets/` for direct URL access.
- Keep React-bundled images in `src/assets/` and import them from components when needed.
- Update any sprite-sheet dimensions or filenames referenced in code (e.g., LandingPage expects `/assets/hawks.png`).【F:src/LandingPage.js†L21-L59】

## Testing and QA
- `src/App.test.js` contains the default React Testing Library scaffold—extend this or add new test files alongside components when adding features.【F:src/App.test.js†L1-L9】
- Jest-DOM matchers are configured in `src/setupTests.js`.【F:src/setupTests.js†L1-L5】

## Adding New Content Checklist
1. Create the new page component under `src/pages/` (PascalCase file name).
2. Build or import supporting simulations under `src/components/` (create a subfolder if a new subject area emerges).
3. Register the route and navigation link in `src/App.js` and ensure `generate-sitemap.js` includes the new route for SEO.
4. Add or update CSS in `src/styles/` (and import it from `main.css` if globally required).
5. Update any relevant assets under `src/assets/` or `public/assets/`.
6. Write or update tests with React Testing Library when functionality changes.
7. Run `npm run generate-sitemap`, `npm test`, and `npm run build` before deployment.
