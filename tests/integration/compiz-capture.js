// Shell.Screenshot does not clear depth; DeformEffect needs it cleared.
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import Mtk from 'gi://Mtk';
import Shell from 'gi://Shell';
export async function captureStage(stream) {
   const view=global.stage.peek_stage_views()[0];const scale=view.get_scale();
   const ctx=global.stage.get_context().get_backend().get_cogl_context();
   const texture=Cogl.Texture2D.new_with_size(ctx,Math.round(global.stage.width*scale),Math.round(global.stage.height*scale));
   const fb=Cogl.Offscreen.new_with_texture(texture);fb.allocate();
   fb.clear4f(Cogl.BufferBit.COLOR|Cogl.BufferBit.DEPTH,0,0,0,0);
   global.stage.paint_to_framebuffer(fb,new Mtk.Rectangle({x:0,y:0,width:global.stage.width,height:global.stage.height}),scale,global.stage.get_color_state(),Clutter.PaintFlag.NO_CURSORS);
   await new Promise((resolve,reject)=>Shell.Screenshot.composite_to_stream(texture,0,0,-1,-1,1,null,0,0,1,stream,(source,result)=>{try{Shell.Screenshot.composite_to_stream_finish(result);resolve();}catch(e){reject(e);}}));
}
