#!/usr/bin/env python3
"""AGIMAT auto-skinner: skin a T-pose chibi GLB to the KayKit-compatible
23-deform-bone skeleton. Usage: skin_to_kaykit.py in.glb out.glb gender name"""
import sys, io, json
import numpy as np
from pygltflib import *
from PIL import Image as PImage
PImage.MAX_IMAGE_PIXELS=None

LM=json.load(open('/tmp/rig/landmarks.json'))
src_k=GLTF2().load('assets/characters/kaykit/Knight.glb')
kname={i:(src_k.nodes[i].name or f'n{i}') for i in range(len(src_k.nodes))}
kk_local_rot={}
for i,n in enumerate(src_k.nodes):
    kk_local_rot[kname[i]]=n.rotation or [0,0,0,1]

BONES=['root','hips','spine','chest','head',
 'upperarm.l','lowerarm.l','wrist.l','hand.l','handslot.l',
 'upperarm.r','lowerarm.r','wrist.r','hand.r','handslot.r',
 'upperleg.l','lowerleg.l','foot.l','toes.l',
 'upperleg.r','lowerleg.r','foot.r','toes.r']
PARENT={'root':None,'hips':'root','spine':'hips','chest':'spine','head':'chest',
 'upperarm.l':'chest','lowerarm.l':'upperarm.l','wrist.l':'lowerarm.l','hand.l':'wrist.l','handslot.l':'hand.l',
 'upperarm.r':'chest','lowerarm.r':'upperarm.r','wrist.r':'lowerarm.r','hand.r':'wrist.r','handslot.r':'hand.r',
 'upperleg.l':'hips','lowerleg.l':'upperleg.l','foot.l':'lowerleg.l','toes.l':'foot.l',
 'upperleg.r':'hips','lowerleg.r':'upperleg.r','foot.r':'lowerleg.r','toes.r':'foot.r'}

def quat_mat(q):
    x,y,z,w=q
    return np.array([
        [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
        [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
        [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])

def fitted_positions(L):
    H=L['H']; sy=L['shoulderY']; ax=L['armXmax']; lx=L['legX']; cr=L['crotch']
    return {
     'root':[0,0,0],'hips':[0,cr+0.06,0],'spine':[0,cr+0.14,0],'chest':[0,sy-0.10,0],
     'head':[0,L['headBase'],0],
     'upperarm.l':[0.155,sy,0],'lowerarm.l':[0.155+(ax-0.155)*0.38,sy,0],
     'wrist.l':[0.155+(ax-0.155)*0.74,sy,0],'hand.l':[ax*0.94,sy,0],'handslot.l':[ax*1.0,sy,0],
     'upperarm.r':[-0.155,sy,0],'lowerarm.r':[-(0.155+(ax-0.155)*0.38),sy,0],
     'wrist.r':[-(0.155+(ax-0.155)*0.74),sy,0],'hand.r':[-ax*0.94,sy,0],'handslot.r':[-ax*1.0,sy,0],
     'upperleg.l':[lx,cr,0],'lowerleg.l':[lx,cr*0.55,0],'foot.l':[lx,cr*0.2,0],'toes.l':[lx,0.02,0.05],
     'upperleg.r':[-lx,cr,0],'lowerleg.r':[-lx,cr*0.55,0],'foot.r':[-lx,cr*0.2,0],'toes.r':[-lx,0.02,0.05],
    }

def build_skeleton(L):
    pos=fitted_positions(L)
    world={}; local_t={}
    def compute(b):
        if b in world: return world[b]
        R=np.eye(4); R[:3,:3]=quat_mat(kk_local_rot.get(b,[0,0,0,1]))
        if PARENT[b] is None:
            T=np.eye(4); T[:3,3]=pos[b]
            world[b]=T@R; local_t[b]=pos[b]
        else:
            pw=compute(PARENT[b])
            lt=np.linalg.inv(pw)@np.array([*pos[b],1.0])
            local_t[b]=lt[:3].tolist()
            T=np.eye(4); T[:3,3]=lt[:3]
            world[b]=pw@T@R
        return world[b]
    for b in BONES: compute(b)
    return world,local_t,pos

def seg_dist(p,a,b):
    ab=b-a; t=np.clip(np.einsum('ij,j->i',p-a,ab)/max(1e-9,ab@ab),0,1)
    return np.linalg.norm(p-(a+t[:,None]*ab),axis=1)

def compute_weights(pos,L,bonepos):
    H=L['H']
    SEGS={'hips':('hips','spine'),'spine':('spine','chest'),'chest':('chest','head'),'head':('head',None),
     'upperarm.l':('upperarm.l','lowerarm.l'),'lowerarm.l':('lowerarm.l','wrist.l'),
     'wrist.l':('wrist.l','hand.l'),'hand.l':('hand.l','handslot.l'),
     'upperarm.r':('upperarm.r','lowerarm.r'),'lowerarm.r':('lowerarm.r','wrist.r'),
     'wrist.r':('wrist.r','hand.r'),'hand.r':('hand.r','handslot.r'),
     'upperleg.l':('upperleg.l','lowerleg.l'),'lowerleg.l':('lowerleg.l','foot.l'),
     'foot.l':('foot.l','toes.l'),'toes.l':('toes.l',None),
     'upperleg.r':('upperleg.r','lowerleg.r'),'lowerleg.r':('lowerleg.r','foot.r'),
     'foot.r':('foot.r','toes.r'),'toes.r':('toes.r',None)}
    names=list(SEGS.keys())
    D=np.zeros((len(pos),len(names)))
    for i,b in enumerate(names):
        a,c=SEGS[b]
        A=np.array(bonepos[a]); C=np.array(bonepos[c]) if c else A+np.array([0,0.06,0])
        D[:,i]=seg_dist(pos,A,C)
    hb=L['headBase']
    for i,b in enumerate(names):
        if b.endswith('.l'): D[pos[:,0]<-0.02,i]=1e9
        if b.endswith('.r'): D[pos[:,0]> 0.02,i]=1e9
        if 'arm' in b or 'wrist' in b or 'hand' in b: D[(pos[:,1]<0.40*H)|(pos[:,1]>hb),i]=1e9
        if 'leg' in b or 'foot' in b or 'toes' in b: D[pos[:,1]>0.55*H,i]=1e9
    idx=np.argsort(D,axis=1)[:,:2]
    d1=D[np.arange(len(pos)),idx[:,0]]; d2=D[np.arange(len(pos)),idx[:,1]]
    w1=1/np.maximum(d1,1e-6)**2; w2=1/np.maximum(d2,1e-6)**2
    tot=w1+w2; W=np.stack([w1/tot,w2/tot],axis=1)
    hmask=pos[:,1]>hb
    J=np.zeros((len(pos),4),dtype=np.uint8); WW=np.zeros((len(pos),4),dtype='f4')
    bi={b:BONES.index(b) for b in names}
    for k in range(len(pos)):
        if hmask[k]: J[k,0]=BONES.index('head'); WW[k,0]=1
        else:
            J[k,0]=bi[names[idx[k,0]]]; WW[k,0]=W[k,0]
            J[k,1]=bi[names[idx[k,1]]]; WW[k,1]=W[k,1]
    return J,WW

def load_mesh(f):
    g=GLTF2().load(f); blob=g.binary_blob()
    def acc(idx):
        a=g.accessors[idx]; bv=g.bufferViews[a.bufferView]
        off=(bv.byteOffset or 0)+(a.byteOffset or 0)
        n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a.type]
        dt={5121:'u1',5123:'u2',5125:'u4',5126:'f4'}[a.componentType]
        return np.frombuffer(blob,dtype=dt,count=a.count*n,offset=off).reshape(a.count,n)
    p=g.meshes[0].primitives[0]
    tex_bv=g.bufferViews[g.images[g.textures[g.materials[0].pbrMetallicRoughness.baseColorTexture.index].source].bufferView]
    return (acc(p.attributes.POSITION).astype('f4'),acc(p.attributes.NORMAL).astype('f4'),
            acc(p.attributes.TEXCOORD_0).astype('f4'),acc(p.indices).astype('u4').reshape(-1),
            blob[tex_bv.byteOffset:tex_bv.byteOffset+tex_bv.byteLength])

def export(outfile,pos,nrm,uv,idxs,texpng,world,local_t,L,name):
    g=GLTF2(); g.asset=Asset(version='2.0')
    blob=b''; bvs=[]; accs=[]
    def push(data,target=None,ctype=5126,type_='VEC3'):
        nonlocal blob
        off=len(blob); pad=(4-(off%4))%4; blob+=b'\x00'*pad; off+=pad
        raw=data.tobytes(); blob+=raw
        bvs.append(BufferView(buffer=0,byteOffset=off,byteLength=len(raw),target=target))
        a=Accessor(bufferView=len(bvs)-1,componentType=ctype,count=len(data),type=type_)
        if type_=='VEC3' and ctype==5126:
            a.min=[float(v) for v in data.min(0)]; a.max=[float(v) for v in data.max(0)]
        accs.append(a); return len(accs)-1
    J,W=compute_weights(pos.astype('f8'),L,fitted_positions(L))
    ap=push(pos,34962); an=push(nrm,34962); at=push(uv,34962,type_='VEC2')
    aj=push(J,34962,ctype=5121,type_='VEC4'); aw=push(W,34962,type_='VEC4')
    ai=push(idxs.astype('u4'),34963,ctype=5125,type_='SCALAR')
    ibms=np.stack([np.linalg.inv(world[b]).T.astype('f4') for b in BONES])
    off=len(blob); pad=(4-(off%4))%4; blob+=b'\x00'*pad
    raw=ibms.tobytes(); off2=len(blob); blob+=raw
    bvs.append(BufferView(buffer=0,byteOffset=off2,byteLength=len(raw)))
    accs.append(Accessor(bufferView=len(bvs)-1,componentType=5126,count=len(BONES),type='MAT4'))
    aibm=len(accs)-1
    toff=len(blob); pad=(4-(toff%4))%4; blob+=b'\x00'*pad; toff=len(blob)
    blob+=texpng
    bvs.append(BufferView(buffer=0,byteOffset=toff,byteLength=len(texpng)))
    img_bv=len(bvs)-1
    nodes=[Node(name=name,mesh=0,skin=0)]
    bidx={b:i+1 for i,b in enumerate(BONES)}
    for b in BONES:
        nodes.append(Node(name=b,translation=[float(v) for v in local_t[b]],
               rotation=[float(v) for v in kk_local_rot.get(b,[0,0,0,1])]))
    for b in BONES:
        pnt=PARENT[b]
        if pnt: nodes[bidx[pnt]].children=(nodes[bidx[pnt]].children or [])+[bidx[b]]
    g.nodes=nodes
    g.scenes=[Scene(nodes=[0,bidx['root']])]; g.scene=0
    g.skins=[Skin(joints=[bidx[b] for b in BONES],inverseBindMatrices=aibm,skeleton=bidx['root'])]
    g.meshes=[Mesh(primitives=[Primitive(
        attributes=Attributes(POSITION=ap,NORMAL=an,TEXCOORD_0=at,JOINTS_0=aj,WEIGHTS_0=aw),
        indices=ai,material=0)])]
    g.materials=[Material(name=name,pbrMetallicRoughness=PbrMetallicRoughness(
        baseColorTexture=TextureInfo(index=0),metallicFactor=0.0,roughnessFactor=0.9))]
    g.textures=[Texture(source=0)]
    g.images=[Image(bufferView=img_bv,mimeType='image/png')]
    g.bufferViews=bvs; g.accessors=accs
    g.buffers=[Buffer(byteLength=len(blob))]
    g.set_binary_blob(blob); g.save(outfile)

if __name__=='__main__':
    inf,outf,gender,name=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
    L=LM[gender]
    world,local_t,_=build_skeleton(L)
    pos,nrm,uv,idxs,tex=load_mesh(inf)
    export(outf,pos,nrm,uv,idxs,tex,world,local_t,L,name)
    import os
    print(outf,os.path.getsize(outf)//1024,'KB')
