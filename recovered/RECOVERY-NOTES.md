# Recovery notes

The working tree was wiped by a discard on a repo with **zero commits**, so every
file was untracked and git had nothing to restore from. Everything below was
rebuilt from VS Code's local history, the desktop trash, and the verbatim file
contents read earlier in the session that did the work.

## Restored to the project root (pre-wipe state)

Verified: all line counts match the pre-wipe state exactly (1239 total).

| File | Lines | Source |
|---|---|---|
| `main.js` | 247 | session transcript (local history only went to 180 lines / Apr 24) |
| `planet.js` | 326 | session transcript (local history only went to 291 lines / Apr 30) |
| `index.html` | 37 | session transcript (not in local history) |
| `style.css` | 138 | session transcript (not in local history) |
| `check-asteroid-size.js` | 27 | session transcript (not in local history) |
| `earth.js` | 337 | VS Code local history (exact) |
| `sun.js` | 30 | VS Code local history (exact) |
| `test-earth.html` | 97 | VS Code local history (exact) |
| `README.md` | 48 | VS Code local history (exact) |

## `improved/`

The in-progress performance + visual work from the session that was interrupted
by the wipe. A complete, runnable set — open `improved/index.html`.

- Shadows removed: the Sun's point light meant a 2048² **cube** shadow map, i.e.
  six full scene re-renders per frame, feeding an invisible `ShadowMaterial`
  plane that nothing consumed.
- Ring instances derived from a triangle budget instead of a hardcoded 8000.
  (`asteroids.glb` is 23k triangles total but 51MB of 8K PBR textures; the old
  code drew 3,394 tris × 8,000 rocks = ~27M triangles/frame for rocks 1–4px wide.)
- Raycasting against an explicit pick list rather than the whole scene graph,
  with `InstancedMesh.raycast` disabled and click-vs-drag discrimination.
- Per-frame `new Vector3()` and subtree `traverse()` calls hoisted out of the loop.
- Delta-time motion everywhere (speeds were per-frame, so they scaled with
  refresh rate), damped controls, 60fps cap, debounced resize, hidden-tab skip.
- Sun: procedural photosphere (simplex fBm, domain warp, granulation, sunspots,
  limb darkening) plus impact-parameter corona shells.
- Starfield: 15k GPU points, stellar-class colours, twinkle, diffraction spikes,
  Milky Way band, and a baked nebula sky on `scene.background`.
- Orbit paths and per-planet axial tilt.

## `older-versions/`

Every timestamped revision VS Code's local history held for this project
(76 files, Apr 21 – Apr 30), including `bee.html`, which had already been
deleted before the wipe.

## `models-from-trash/`

Older superseded model versions rescued from `~/.local/share/Trash` before it
gets purged. These are **not** the versions that were lost — they are earlier
ones deleted deliberately back in April, and no current code references them.

## Not recoverable

No copy exists in history, trash, or git:

| File | Size | Impact |
|---|---|---|
| `models/asteroids.glb` | 51.8 MB | Saturn's rings — **code falls back gracefully** to procedural rocks, app still runs |
| `models/saturn.glb` | 150.0 MB | used only by `test-earth.html` |
| `models/earth_day.glb` | 77.2 MB | unreferenced by any current code |
| `models/earth_night.glb` | 15.2 MB | unreferenced by any current code |
| `models/mars.glb` | 6.0 MB | unreferenced by any current code |
| `data/countries.geojson` | 838 KB | needed by `earth.js` — **re-downloadable**, it is public data |
| `fallback.tmp`, `planet.js.tmp`, `planet_methods.tmp` | — | scratch files, never opened |

`index.html` / `main.js` run fine without any of these.

## Prevent a repeat

The root cause is that the repo had no commits, so "discard" had nothing to fall
back to. Commit now:

```sh
git add -A && git commit -m "Initial commit: solar system viewer"
```

Consider a `.gitignore` for `*.glb` if you would rather not put ~300MB of models
in git history — but then keep a separate backup of them, since that is exactly
the data this incident destroyed for good.
