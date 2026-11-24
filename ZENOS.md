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
