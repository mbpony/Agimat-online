#!/usr/bin/env python3
"""AGIMAT outfit fitter: shrinkwrap-outward an outfit GLB against a body GLB.
Any outfit vertex closer to the body surface than MARGIN (or inside it)
is pushed outward along the body normal to sit at exactly MARGIN.
Usage: fit_outfit.py body.glb outfit.glb out.glb [margin]"""
import sys, io
import numpy as np
from pygltflib import GLTF2
from scipy.spatial import cKDTree
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
import trimesh
from trimesh.visual.texture import TextureVisuals
from trimesh.visual.material import PBRMaterial

def load(f):
    g=GLTF2().load(f); blob=g.binary_blob()
    def acc(idx):
        a=g.accessors[idx]; bv=g.bufferViews[a.bufferView]
        off=(bv.byteOffset or 0)+(a.byteOffset or 0)
        n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a.type]
        dt={5121:'u1',5123:'u2',5125:'u4',5126:'f4'}[a.componentType]
        return np.frombuffer(blob,dtype=dt,count=a.count*n,offset=off).reshape(a.count,n)
    p=g.meshes[0].primitives[0]
    tex_bv=g.bufferViews[g.images[g.textures[g.materials[0].pbrMetallicRoughness.baseColorTexture.index].source].bufferView]
    tex=Image.open(io.BytesIO(blob[tex_bv.byteOffset:tex_bv.byteOffset+tex_bv.byteLength])).convert('RGB')
    return (acc(p.attributes.POSITION).astype('f8').copy(),
            acc(p.attributes.NORMAL).astype('f8').copy() if p.attributes.NORMAL is not None else None,
            acc(p.attributes.TEXCOORD_0).astype('f8').copy(),
            acc(p.indices).astype('i8').reshape(-1,3).copy(), tex)

def main(body_f, outfit_f, out_f, margin=0.012):
    bpos,bnrm,_,_,_ = load(body_f)
    opos,onrm,ouv,ofaces,otex = load(outfit_f)
    tree=cKDTree(bpos)
    # sample K nearest body verts para stable ang normal estimate
    d,idx=tree.query(opos,k=4)
    moved=0
    for i in range(len(opos)):
        # weighted avg ng nearest body pts + normals
        w=1/np.maximum(d[i],1e-6); w/=w.sum()
        bp=(bpos[idx[i]]*w[:,None]).sum(0)
        bn=(bnrm[idx[i]]*w[:,None]).sum(0)
        nl=np.linalg.norm(bn)
        if nl<1e-6: continue
        bn/=nl
        rel=opos[i]-bp
        s=rel@bn               # signed dist along body normal
        if s<margin:           # inside or too close
            opos[i]=bp+bn*margin+ (rel-(rel@bn)*bn)*0.35  # keep some tangential shape
            moved+=1
    print(f'{out_f}: moved {moved}/{len(opos)} verts (margin {margin})')
    mesh=trimesh.Trimesh(vertices=opos,faces=ofaces,vertex_normals=onrm,process=False)
    mesh.visual=TextureVisuals(uv=ouv,material=PBRMaterial(baseColorTexture=otex,metallicFactor=0.0,roughnessFactor=0.9,name='outfit'))
    trimesh.Scene({'outfit':mesh}).export(out_f)

if __name__=='__main__':
    a=sys.argv
    main(a[1],a[2],a[3],float(a[4]) if len(a)>4 else 0.012)
