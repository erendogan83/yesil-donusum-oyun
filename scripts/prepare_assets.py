"""Non-destructive 3x2 sheet splitter. Usage: python scripts/prepare_assets.py SOURCE_DIR.
Requires Pillow and numpy. Source alpha is preserved; chromatic edge artifacts are
desaturated only on partly transparent perimeter pixels, not opaque product colors.
"""
import sys, json
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageDraw
import numpy as np

source=Path(sys.argv[1]); target=Path(__file__).resolve().parents[1]/'public'/'assets'
target.mkdir(parents=True,exist_ok=True)
manifest=[]
def trim(im):
    im=im.convert('RGBA'); a=np.array(im)
    # Remove stray neighboring objects that intrude across grid-cell borders.
    mask=np.array(im.getchannel('A').resize((192,192),Image.Resampling.NEAREST))>16
    seen=np.zeros(mask.shape,dtype=bool); components=[]
    for yy,xx in zip(*np.where(mask)):
        if seen[yy,xx]: continue
        stack=[(int(yy),int(xx))]; seen[yy,xx]=True; points=[];edge=False
        while stack:
            y,x=stack.pop();points.append((y,x));edge=edge or x<2 or y<2 or x>189 or y>189
            for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if 0<=ny<192 and 0<=nx<192 and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;stack.append((ny,nx))
        components.append((points,edge))
    largest=max((len(c[0]) for c in components),default=1)
    unwanted=np.zeros((192,192),dtype=np.uint8)
    for points,edge in components:
        if edge and len(points)<largest*.18:
            for y,x in points: unwanted[y,x]=255
    remove=np.array(Image.fromarray(unwanted).resize(im.size,Image.Resampling.NEAREST).filter(ImageFilter.MaxFilter(7)))>0
    a[:,:,3][remove]=0
    rgb=a[:,:,:3].astype(float); alpha=a[:,:,3]
    # Only semi-transparent edge pixels with conspicuous color casts.
    mx=rgb.max(2); mn=rgb.min(2)
    fringe=(alpha>0)&(alpha<210)&((mx-mn)>70)&((rgb[:,:,0]>rgb[:,:,2]*1.5)|(rgb[:,:,1]>rgb[:,:,2]*1.5))
    lum=rgb.mean(2)
    for c in range(3): a[:,:,c]=np.where(fringe,rgb[:,:,c]*.25+lum*.75,rgb[:,:,c])
    a[:,:,3]=np.where(alpha<10,0,alpha)
    out=Image.fromarray(a); box=out.getbbox()
    if box: out=out.crop(box)
    out.thumbnail((480,480),Image.Resampling.LANCZOS)
    return ImageOps.expand(out,border=10,fill=(0,0,0,0))
for p in sorted(source.rglob('*.png')):
    name=p.name; im=Image.open(p)
    if name.startswith('BG_'):
        key=name.split('.png')[0].lower(); out=target/f'{key}.webp'
        im.convert('RGB').save(out,quality=89,method=6)
        manifest.append({'source':name,'kind':'background','output':out.name})
    elif name.startswith('OBJECT SHEET ') or name.startswith('OBJECT_SHEET_'):
        family='sheet' if ' ' in name else 'extra'
        number=int(name.split('.png')[0][-2:]);w,h=im.size
        for row in range(2):
            for col in range(3):
                cell=trim(im.crop((round(col*w/3),round(row*h/2),round((col+1)*w/3),round((row+1)*h/2))))
                out=target/f'{family}-{number:02}-{row*3+col+1}.webp';cell.save(out,lossless=True,method=6)
                manifest.append({'source':name,'kind':'object','cell':row*3+col+1,'output':out.name})
    elif name.startswith('OBJ_'):
        out=target/(name.split('.png')[0].lower()+'.webp');trim(im).save(out,lossless=True,method=6)
        manifest.append({'source':name,'kind':'installed-object','output':out.name})
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
items=[x for x in manifest if x['kind']=='object']; board=Image.new('RGB',(1000,((len(items)+7)//8)*145),'#e6ddc9'); d=ImageDraw.Draw(board)
for i,item in enumerate(items):
    im=Image.open(target/item['output']);im.thumbnail((115,115));x=i%8*125;y=i//8*145
    board.paste(im,(x,y),im);d.text((x+2,y+119),item['output'].replace('.webp',''),fill='#302b21')
board.save(target/'contact-sheet.jpg')
print(f'{len(manifest)} assets exported to {target}')
