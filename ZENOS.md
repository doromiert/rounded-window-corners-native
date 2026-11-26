This branch packages Ahmet Öztürk's Rounded Window Corners Native for GNOME50.
Upstream: https://github.com/ztrahmet/rounded-window-corners
Baseline: f26280d33026ad1fe50000480b14e86239c47528, GPL-3.0-or-later.

The GNOME50 port uses Shell.GLSLEffect's pipeline/uniform API for the ordinary
effect. The sharp renderer preserves HDR paint targets as described below. Metadata declares50,
and the package enables sharp rendering by default. The libadwaita stylesheet
probe uses a dependency-complete Nix wrapper instead of relying on PATH.

Do not enable this extension together with Rounded Window Corners Reborn.
The initial isolated GNOME50.4 tests found pixel-identical interior content at
100%,150%,200% with sharp rendering; resize/fullscreen/overview also passed.
These synthetic tests do not establish every real app or mixed-monitor case.
Fractional XWayland sharpness remains unverified because its baseline fixtures
had geometry problems. GNOME51 requires the upstream API implementation.

Compiz integration (51.1-gnome50.2): Clutter's first effect wraps later effects,
so deformation effects must precede the corner/outline/shadow effects in the
actor chain to bend the finished rounded shape. AFTER handlers for grab, size,
minimize and unminimize events move only our three effects behind deformations.
Foreign animation objects and their timelines remain attached. Initial attachment
also preserves existing deformations. This covers Compiz Windows31 and Magic
Lamp24 on GNOME50.4; effects added asynchronously outside these events may need
an additional integration hook. No frame polling or Shell method patches are used.

The ordinary renderer maps Clutter's allocation fallback during painting when a
DeformEffect makes the total paint volume unknown. Sharp rendering stays enabled
during deformations and returns to pixel-aligned rendering when settled.

Native regression fixture modules are in tests/integration/compiz-*.js. In an
isolated GNOME50 Shell at1920x1080 and150%, map the text/stripe canary at logical
100,100,600x400, with custom radius16 and border removal off. Supply actor, window,
a capture(name) callback and write(name,value) callback to compiz-order.run().
Set CORNER_WOBBLY_DIR to any nonempty value and CORNER_MAGIC_UUID to the installed
Magic Lamp UUID to exercise those actual extensions. The fixture enables/disables
extensions and minimizes its window, so never run it in the user's main session.

Use compiz-capture.captureStage(stream) for captures: its framebuffer clears both
color and depth before painting. GNOME50 Shell.Screenshot clears only color and
can falsely show invisible DeformEffect windows, even without this extension.
Save baseline-1.5.png without effects and deform-restored.png after the fixture.
Run gjs -m tests/integration/compiz-pixels.js CAPTURE_DIRECTORY with GdkPixbuf
available to assert visible deformations, an unclipped shifted edge, ordinary
renderer alignment and unchanged settled interior pixels.

HDR offscreen rendering (51.1-gnome50.3): keep the outer paint target's encoding
while capturing mixed SDR/HDR child surfaces. Clutter LayerNode otherwise forces
the parent actor's SDR state and tone maps HDR children before final composition.
A RootNode retains the target, the shader declares its color-state capability
(to avoid a second SDR transform), and HDR buffers use FP16. Cached buffers are
discarded when the target changes, including captures and monitor changes.

This requires ZenOS Mutter's paint-target-introspection.patch, which exposes the
existing clutter_paint_context_get_target_color_state getter with borrowed
ownership. Stock GNOME50 retains the previous rendering path until its typelib
is updated; an already running Shell needs a new login to load the updated API.

Native tests/integration/hdr-color.js exports run({actor,win,directory,write}).
Use a mapped real window in a private GNOME50.4 session and a fresh capture
directory; write(name,value) saves JSON there. The fixture adds native SDR gray
chips and a PQ1000-nit chip, then captures without rounding, rounded, maximized
and restored. Every state alternates PQ/SDR/PQ paint targets. It asserts all RGB
samples agree within one code value, rejects blank captures and requires the
HDR chip to exceed SDR white. The old renderer fails (highlight191→141); the
new renderer preserves all samples, including native Gnosis page content.
This tests pixel encoding, not physical monitor calibration or every GPU driver.

HDR buffer reuse (51.1-gnome50.4): color-state changes now invalidate pixels,
not the geometry/texture cache. A buffer is promoted to FP16 once when needed
and retains that format for subsequent SDR paints. Resizes still reuse storage
within the existing bounds. This prevents capture/display color-state changes
from allocating a texture every frame and filling the kernel TTM page pool.

Run tests/integration/hdr-buffer-memory.js in the same isolated Shell after the
HDR color fixture; it exports run({actor,write}). Across 80 alternating SDR/PQ
captures it counts actual framebuffer replacements, without retaining those
objects. After warmup, at most two allocation adjustments are permitted. The
50.3 negative control allocated 80 times (60 after warmup); 50.4 allocated three
times total (one late size adjustment), with the HDR pixel assertions preserved.
The diagnostic kernel allocation snapshot on the affected desktop recorded
14,747,779,072 bytes in ttm_pool_alloc_page; unused pages were reclaimed without
closing apps. Cache reclamation is diagnostic relief, not the rendering fix.
