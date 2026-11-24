This branch packages Ahmet Öztürk's Rounded Window Corners Native for GNOME50.
Upstream: https://github.com/ztrahmet/rounded-window-corners
Baseline: f26280d33026ad1fe50000480b14e86239c47528, GPL-3.0-or-later.

The GNOME50 port uses Shell.GLSLEffect's pipeline/uniform API for the ordinary
effect. The sharp rendering implementation is unchanged. Metadata declares50,
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
