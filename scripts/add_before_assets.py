from pathlib import Path
from PIL import Image
import json
p=Path('public/assets'); out=p/'sprites/generated'
for name,cell,key in [('OBJECT_SHEET_FOOD_COMPARISON_01.png.png',0,'lentil-before'),('OBJECT_SHEET_FOOD_COMPARISON_01.png.png',3,'apple-before'),('OBJECT_SHEET_TEXTILE_COMPARISON_01.png.png',0,'towel-before'),('OBJECT_SHEET_TEXTILE_COMPARISON_02.png.png',3,'scarf-before')]:
 im=Image.open(p/'source'/name).convert('RGBA');w,h=im.size;c=cell%3;r=cell//3;im=im.crop((round(c*w/3),round(r*h/2),round((c+1)*w/3),round((r+1)*h/2)));im=im.crop(im.getchannel('A').point(lambda a:255 if a>15 else 0).getbbox());im.save(out/(key+'.webp'),lossless=True)
f=Path('src/decisions/placements.json');data=json.loads(f.read_text())
slots={'lentil':(716,542),'apple':(839,583),'towel':(678,589),'scarf':(802,644)}
for key,m in data.items():
 if key.startswith('rev-pack-'):
  kind=key.split('-')[2];x,y=slots[kind];m.update(slotId='packing_'+kind,x=x,y=y);im=Image.open(out/('-'.join(key.split('-')[2:])+'.webp'));m['scale']=min(108/im.width,99/im.height);m['shadow'].update(x=x,y=y-3,width=78,height=12)
f.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
