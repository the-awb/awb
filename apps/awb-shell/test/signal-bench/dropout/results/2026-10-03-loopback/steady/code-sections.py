import hashlib,pathlib,struct
# Exclude signature and load-command bytes; compare the actual executable/text sections.
def text_sections(path):
 b=pathlib.Path(path).read_bytes();assert struct.unpack_from('<I',b)[0]==0xfeedfacf
 n=struct.unpack_from('<I',b,16)[0];offset=32;sections={}
 for _ in range(n):
  cmd,size=struct.unpack_from('<II',b,offset)
  if cmd==0x19:
   ns=struct.unpack_from('<I',b,offset+64)[0]
   for j in range(ns):
    sec=offset+72+j*80;name=b[sec:sec+16].split(b'\0')[0].decode();seg=b[sec+16:sec+32].split(b'\0')[0].decode()
    if seg=='__TEXT':
     length=struct.unpack_from('<Q',b,sec+40)[0];pos=struct.unpack_from('<I',b,sec+48)[0];sections[name]=hashlib.sha256(b[pos:pos+length]).hexdigest()
  offset+=size
 return sections
if __name__=='__main__':
 original=text_sections('/Applications/SuperCollider.app/Contents/Resources/scsynth');copied=text_sections('/private/tmp/awb-audit-scsynth');assert original and original==copied
 print('Installed and temporary SC executable text sections match:',len(original))
