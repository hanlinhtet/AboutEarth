# AboutEarth — Interactive 3D Solar System

An interactive solar system built with Three.js and vanilla ES modules. Click any
planet to fly to it, search by name, and watch the whole system orbit in real time.

![Solar system](https://img.shields.io/badge/Three.js-r160-black) ![No build step](https://img.shields.io/badge/build-none-brightgreen)

## Running it

The project uses ES modules and fetches local data, so it needs a web server —
opening `index.html` directly from the filesystem will **not** work (browsers
block module and `fetch` requests on `file://`).

```bash
# Option 1 — Python (no install needed)
python3 -m http.server 8080

# Option 2 — Node
npx serve .

# Option 3 — VS Code
# Right-click index.html → "Open with Live Server"
```

Then open **http://localhost:8080**.

> **`OSError: [Errno 98] Address already in use`** just means something else already
> holds that port — it is not a problem with the project. Any free port works, so
> pick another one: `python3 -m http.server 8090`. To see what is holding a port:
> `ss -ltn | grep 8080`, or `docker ps` if you run containers.

That's the whole setup. There is no build step, no bundler, and no `npm install` —
Three.js is loaded from a CDN via the import map in `index.html`.

## Controls

| Action | How |
|---|---|
| Orbit the camera | Drag with the left mouse button |
| Zoom | Scroll wheel |
| Pan | Drag with the right mouse button |
| Focus a planet | Click it, or search by name |
| Jump to the search box | `/` |
| Next / previous body | `←` `→`, or the on-screen pager |
| Dismiss the panel | Click empty space, press `Esc`, or the `×` button |
| Show FPS / draw calls / triangles | `F` |
| Toggle bloom & resolution | The "Quality" button |

Selecting a body opens a panel with its description and physical data —
diameter, mass, orbital period, day length, moons, gravity and mean
temperature. On a phone that panel docks to the bottom as a drawer instead.

While a planet is focused the camera **follows** it along its orbit, so nothing
ever freezes in place, and you can still drag to look around as it moves.

## How it works

The renderer is tuned to keep the CPU mostly idle — all the animation that can
live on the GPU does:

- **Sun** (`sun.js`) — a procedural photosphere: simplex fBm with domain warping
  for convective plasma, granulation, drifting sunspots and limb darkening. The
  corona is two additive shells whose brightness comes from each view ray's
  *impact parameter*, which falls smoothly to zero so the halo has no visible
  edge. It animates from a single time uniform, costing no per-frame CPU.
- **Starfield** (`stars.js`) — 15,000 GPU points coloured by stellar class,
  with twinkle and diffraction spikes in the vertex shader, plus a Milky Way
  band. The nebula sky is baked once to a canvas and handed to
  `scene.background`, so it never touches the depth buffer.
- **Planets** (`planet.js`) — day/night shading with a warm terminator and an
  atmospheric rim, on a proper axial tilt, with faint orbit paths.
- **Motion** — everything is delta-time driven, so speeds no longer scale with
  your refresh rate, and the frame loop is capped at 60fps.

Shadows are deliberately off: the only caster was the Sun's point light, which
costs a 2048² **cube** shadow map — six full scene re-renders every frame — and
the planets light themselves in their own shaders, so nothing ever consumed it.

## Project structure

```
index.html      Entry point, UI layout and the Three.js import map
style.css       UI styling
main.js         Scene setup, render loop, camera/focus logic, post-processing
sun.js          Procedural Sun and corona
planet.js       Planet data, shaders, orbits and Saturn's rings
stars.js        Starfield and baked nebula background
data/           countries.geojson (Natural Earth 110m)
models/         .glb models — gitignored, see below
```

Two standalone extras, not loaded by `index.html`:

- `earth.js` — a country-boundary globe using d3-geo. It is **not currently
  wired up**: nothing imports it, and `d3-geo` is missing from the import map,
  so it needs both added before it will run.
- `test-earth.html` — a self-contained model viewer. It needs `models/saturn.glb`,
  which is not in the repo.

## A note on `models/`

`.glb` files are gitignored — the originals ran to roughly 300MB, which does not
belong in git history. **Keep your own backup of them outside the repo.**

`planet.js` looks for `models/asteroids.glb` for Saturn's rings and falls back to
procedural rocks when it is absent, so the app runs fine without it — you will
just see a console warning and slightly simpler rings.

## Credits

- Planet textures — [Solar System Scope](https://www.solarsystemscope.com/textures/),
  [NASA](https://science.nasa.gov/), [three-globe](https://github.com/vasturiano/three-globe)
- Country data — [Natural Earth](https://www.naturalearthdata.com/)
- Simplex noise — Ashima Arts / Stefan Gustavson
