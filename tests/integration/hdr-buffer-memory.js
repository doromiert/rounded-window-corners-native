// Isolated GNOME only: alternate capture/display targets without retaining old GPU objects.
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GLib from 'gi://GLib';
import Mtk from 'gi://Mtk';
const delay=ms=>new Promise(r=>GLib.timeout_add_once(GLib.PRIORITY_DEFAULT,ms,r));
export async function run({actor,write}) {
    const effect=actor.get_effect('rounded-window-corners-sharp');
    if(!effect)throw Error('Sharp effect is required');
    const place=effect._place;
    let allocations=0;
    effect._place=function(buffer,where){
        const before=buffer.framebuffer;
        place.call(this,buffer,where);
        if(buffer.framebuffer!==before)allocations++;
    };
    const context=global.stage.get_context();
    const targets=[global.stage.get_color_state(),
        Clutter.ColorStateParams.new(context,Clutter.Colorspace.BT2020,Clutter.TransferFunction.PQ)];
    const width=Math.round(global.stage.width),height=Math.round(global.stage.height);
    const framebuffer=Cogl.Offscreen.new_with_texture(Cogl.Texture2D.new_with_size(context.get_backend().get_cogl_context(),width,height));
    framebuffer.allocate();
    const rect=new Mtk.Rectangle({x:0,y:0,width,height});
    let warmup, maxHeartbeatMs=0, previous=GLib.get_monotonic_time();
    const timer=GLib.timeout_add(GLib.PRIORITY_DEFAULT,20,()=>{
        const now=GLib.get_monotonic_time();
        maxHeartbeatMs=Math.max(maxHeartbeatMs,(now-previous)/1000);previous=now;
        return GLib.SOURCE_CONTINUE;
    });
    try {
        for(let i=0;i<80;i++){
            framebuffer.clear4f(Cogl.BufferBit.COLOR|Cogl.BufferBit.DEPTH,0,0,0,0);
            global.stage.paint_to_framebuffer(framebuffer,rect,1,targets[i%2],Clutter.PaintFlag.NO_CURSORS);
            await delay(12);
            if(i===19)warmup=allocations;
        }
        const result={captures:80,allocations,warmup,steadyAllocations:allocations-warmup,buffers:effect._buffers.length,maxHeartbeatMs};
        write('hdr-memory.json',result);
        if(result.steadyAllocations>2)throw Error('Color-state changes keep allocating framebuffers: '+JSON.stringify(result));
        if(maxHeartbeatMs>=400)throw Error('Rendering stalled the main loop: '+maxHeartbeatMs+'ms');
    }finally{GLib.source_remove(timer);effect._place=place;}
}
