// Run inside an isolated GNOME Shell50 session; see ZENOS.md.
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
const uuid='rounded-window-corners@ztrahmet.github.io';
const delay=ms=>new Promise(r=>GLib.timeout_add_once(GLib.PRIORITY_DEFAULT,ms,r));
const assert=(v,m)=>{if(!v)throw Error(m);};
const Shear=GObject.registerClass(class CornerTestShear extends Clutter.DeformEffect {
 vfunc_set_actor(actor){if(actor)this.attached=(this.attached??0)+1;else this.detached=(this.detached??0)+1;super.vfunc_set_actor(actor);}
 vfunc_deform_vertex(width,height,vertex){vertex.x+=80*vertex.y/height;}
 vfunc_modify_paint_volume(){return false;}
});
function order(actor,effect){
 const all=actor.get_effects();const own=all.filter(e=>e.get_name()?.startsWith('rounded-window-corners'));
 assert(own.length===3&&own.every(e=>all.indexOf(effect)<all.indexOf(e)),'deformation does not wrap all corner effects: '+all.map(e=>`${e.get_name()}:${e instanceof Clutter.DeformEffect}`).join(','));
}
export async function run({actor,win,capture,write}){
 Main.extensionManager.disableExtension(uuid);await delay(200);const shear=new Shear();shear.set_n_tiles(16,16);actor.add_effect_with_name('corner-test-shear',shear);await delay(500);await capture('deform-initial-bare.png');Main.extensionManager.enableExtension(uuid);await delay(300);
 Main.extensionManager.lookup(uuid).stateObj._tracker._windows.get(actor)._orderEffects();order(actor,shear);
 await delay(200);await capture('deform-shear.png');const prefs=Main.extensionManager.lookup(uuid).stateObj.getSettings();prefs.set_boolean('sharp-windows',false);await delay(200);await capture('deform-plain.png');prefs.set_boolean('sharp-windows',true);await delay(200);
 assert(shear.attached===1&&!shear.detached,'active deform was detached');
 const second=new Shear();actor.add_effect_with_name('corner-test-second',second);Main.extensionManager.lookup(uuid).stateObj._tracker._windows.get(actor)._orderEffects();order(actor,second);order(actor,shear);
 assert(shear.attached===1&&!shear.detached,'adding a second deform reset the first');
 actor.remove_effect(second);
 Main.extensionManager.disableExtension(uuid);await delay(150);
 assert(actor.get_effect('corner-test-shear')===shear,'disable removed foreign deform');await capture('deform-bare.png');
 Main.extensionManager.enableExtension(uuid);await delay(350);order(actor,shear);
 assert(shear.attached===1&&!shear.detached,'re-enable detached foreign deform');
 actor.remove_effect(shear);await delay(150);
 await capture('deform-restored.png');
 const dir=GLib.getenv('CORNER_WOBBLY_DIR');
 if(dir){
  const wuuid='compiz-windows-effect@hermes83.github.com';Main.extensionManager.enableExtension(wuuid);await delay(250);
  assert(Main.extensionManager.lookup(wuuid)?.state===1,'wobbly extension failed to enable');
  let effect,timer,model;
  const spy=global.display.connect('grab-op-begin',()=>{effect=actor.get_effect('wobbly-compiz-effect');timer=effect?.timerId;model=effect?.wobblyModel;});
  global.display.emit('grab-op-begin',win,Meta.GrabOp.MOVING);global.display.disconnect(spy);assert(effect,'actual wobbly grab effect missing');order(actor,effect);
  win.move_frame(true,160,100);await delay(100);await capture('deform-wobbly.png');
  assert(effect.timerId===timer&&effect.wobblyModel===model&&timer.is_playing(),'wobbly timeline/model was reset');
  global.display.emit('grab-op-end',win,Meta.GrabOp.MOVING);effect.destroy();Main.extensionManager.disableExtension(wuuid);
  win.move_frame(true,100,100);await delay(150);
 }
 const magic=GLib.getenv('CORNER_MAGIC_UUID');
 if(magic){
  Main.extensionManager.enableExtension(magic);await delay(250);const ext=Main.extensionManager.lookup(magic);assert(ext?.state===1,'magic lamp failed to enable');
  ext.stateObj.getSettings().set_double('duration',700);
  win.minimize();await delay(100);const minimize=actor.get_effect('minimize-magic-lamp-effect');assert(minimize,'actual magic-lamp minimize missing');order(actor,minimize);await capture('deform-magic-minimize.png');await delay(1200);
  win.unminimize();await delay(450);const unminimize=actor.get_effect('unminimize-magic-lamp-effect');assert(unminimize,'actual magic-lamp restore missing');order(actor,unminimize);await capture('deform-magic-restore.png');await delay(1200);
  assert(!actor.get_effect('minimize-magic-lamp-effect')&&!actor.get_effect('unminimize-magic-lamp-effect'),'magic-lamp effect leaked');Main.extensionManager.disableExtension(magic);
 }
 write('deform-result.json',{pass:true,dynamicDeform:true,existingDeform:true,multipleDeforms:true,foreignAnimationPreserved:true,wobbly:Boolean(dir),magicLamp:Boolean(magic)});
}
