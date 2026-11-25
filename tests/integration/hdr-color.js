// Run only in an isolated GNOME50 Shell; this fixture changes window/extension state.
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Mtk from 'gi://Mtk';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
const uuid = 'rounded-window-corners@ztrahmet.github.io';
const delay = ms => new Promise(resolve => GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, ms, resolve));
const assert = (value, message) => { if (!value) throw Error(message); };

async function capture(path, target) {
    const width = Math.round(global.stage.width), height = Math.round(global.stage.height);
    const context = global.stage.get_context().get_backend().get_cogl_context();
    const texture = Cogl.Texture2D.new_with_size(context, width, height);
    const framebuffer = Cogl.Offscreen.new_with_texture(texture);
    framebuffer.allocate();
    framebuffer.clear4f(Cogl.BufferBit.COLOR | Cogl.BufferBit.DEPTH, 0, 0, 0, 0);
    global.stage.paint_to_framebuffer(framebuffer,
        new Mtk.Rectangle({x: 0, y: 0, width, height}), 1, target, Clutter.PaintFlag.NO_CURSORS);
    const stream = Gio.File.new_for_path(path).replace(null, false, Gio.FileCreateFlags.NONE, null);
    try {
        await new Promise((resolve, reject) => Shell.Screenshot.composite_to_stream(
            texture, 0, 0, -1, -1, 1, null, 0, 0, 1, stream, (source, result) => {
                try { Shell.Screenshot.composite_to_stream_finish(result); resolve(); } catch (e) { reject(e); }
            }));
    } finally { stream.close(null); }
    return GdkPixbuf.Pixbuf.new_from_file(path);
}

export async function run({actor, win, directory, write}) {
    assert(typeof Clutter.PaintContext.prototype.get_target_color_state === 'function',
        'Mutter paint-target introspection patch is required');
    const pq = Clutter.ColorStateParams.new(global.stage.get_context(), Clutter.Colorspace.BT2020,
        Clutter.TransferFunction.PQ);
    const chips = [0, .25, .5, .75, 1, .75].map((value, i) => {
        const color = new Cogl.Color(); color.init_from_4f(value, value, value, 1);
        const chip = new Clutter.Actor({height: 80});
        chip.set_background_color(color);
        chip.set_color_state(i === 5 ? pq : actor.get_color_state());
        actor.add_child(chip);
        return chip;
    });
    const result = {};
    const shot = async name => {
        chips.forEach((chip, i) => {
            chip.set_position(i === 5 ? 30 : actor.width * i / 5, i === 5 ? 300 : 180);
            chip.set_width(i === 5 ? 100 : actor.width / 5);
        });
        await delay(250);
        const [x, y] = actor.get_transformed_position();
        const points = [.1, .3, .5, .7, .9].map(f => [x + actor.width * f, y + 220]);
        points.push([x + 80, y + 340]);
        const samples = {};
        // Alternating targets also exercises buffer invalidation without changing actor pixels.
        for (const [mode, target] of [['pq', pq], ['sdr', global.stage.get_color_state()], ['pq-again', pq]]) {
            const image = await capture(`${directory}/${name}-${mode}.png`, target);
            const bytes = image.get_pixels();
            samples[mode] = points.map(([px, py]) => {
                const offset = Math.round(py) * image.rowstride + Math.round(px) * image.n_channels;
                return Array.from(bytes.slice(offset, offset + 3));
            });
            assert(samples[mode][4].every(v => v > 100), `${name}/${mode}: blank capture`);
        }
        result[name] = samples;
    };
    try {
        Main.extensionManager.disableExtension(uuid); await delay(200); await shot('baseline');
        Main.extensionManager.enableExtension(uuid); await delay(500);
        const extension = Main.extensionManager.lookup(uuid);
        assert(extension?.state === 1, 'rounded-corners extension failed to enable');
        const prefs = extension.stateObj.getSettings();
        prefs.set_boolean('round-libadwaita-apps', true); prefs.set_boolean('sharp-windows', true);
        prefs.set_boolean('custom-style', true); prefs.set_string('border-method', 'off'); prefs.set_int('outline-width', 0);
        await delay(400); await shot('sharp');
        assert(actor.get_effect('rounded-window-corners-sharp')?.enabled, 'sharp effect missing');
        win.maximize(); await delay(400); await shot('maximized');
        win.unmaximize(); await delay(400); await shot('restored');
        for (const [name, modes] of Object.entries(result))
            for (const [mode, samples] of Object.entries(modes))
                samples.flat().forEach((value, i) => assert(Math.abs(value - result.baseline[mode].flat()[i]) <= 1,
                    `${name}/${mode}: color changed at channel ${i}: ${value} vs ${result.baseline[mode].flat()[i]}`));
        assert(result.baseline.pq[5][0] > result.baseline.pq[4][0] + 20, 'HDR highlight not above SDR white');
        write('hdr-color.json', {pass: true, samples: result});
    } finally { chips.forEach(chip => chip.destroy()); }
}
