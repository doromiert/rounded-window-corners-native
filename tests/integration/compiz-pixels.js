// Verify the 1920x1080 /150% Compiz fixture captures; see ZENOS.md.
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
const root=ARGV[0];
const read=n=>{const p=GdkPixbuf.Pixbuf.new_from_file(root+'/'+n+'.png');p.bytes=p.get_pixels();return p;};
const pixel=(p,x,y)=>{const i=y*p.rowstride+x*p.n_channels;return [p.bytes[i],p.bytes[i+1],p.bytes[i+2]];};
const assert=(v,m)=>{if(!v)throw Error(m);};
const results={};
for(const name of ['deform-shear','deform-plain','deform-bare','deform-wobbly','deform-magic-minimize','deform-magic-restore']){
 const p=read(name);let white=0;for(let y=100;y<p.height;y++)for(let x=100;x<Math.min(1400,p.width);x++)if(pixel(p,x,y).every(v=>v>220))white++;
 assert(white>10000,name+' vanished');results[name]={whitePixels:white};
}
assert(pixel(read('deform-plain'),250,170).every(v=>v>220),'ordinary mask shifted inside deformation');
const shear=read('deform-shear');assert(pixel(shear,1070,675).every(v=>v>220),'corner mask still clips deformed right edge');
const a=read('baseline-1.5'),b=read('deform-restored');let changed=0,total=0;
for(let y=186;y<714;y++)for(let x=186;x<1014;x++){total++;if(pixel(a,x,y).some((v,i)=>v!==pixel(b,x,y)[i]))changed++;}
assert(changed===0,'settled interior pixels changed: '+changed);results.restored={changed,total};
GLib.file_set_contents(root+'/compiz-pixels.json',JSON.stringify(results,null,2));print(JSON.stringify(results));
