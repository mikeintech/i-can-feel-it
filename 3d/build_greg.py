# Builds a simple stylized Greg (from the cover / pose sheet), rigs him, poses him, exports GLB.
# Run: Blender --background --python build_greg.py -- <out_dir>
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.dirname(__file__)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- skeleton points (metres, Z up, facing -Y) ----------
P = {
    "pelvis": (0, 0, 0.98), "spine": (0, 0.01, 1.2), "chest": (0, 0.0, 1.42), "neck": (0, 0, 1.56),
    "head": (0, -0.01, 1.68), "crown": (0, 0, 1.80),
    "sh.L": (0.21, 0.01, 1.45), "el.L": (0.47, 0.02, 1.45), "wr.L": (0.71, 0.0, 1.45), "hd.L": (0.80, -0.01, 1.45),
    "sh.R": (-0.21, 0.01, 1.45), "el.R": (-0.47, 0.02, 1.45), "wr.R": (-0.71, 0.0, 1.45), "hd.R": (-0.80, -0.01, 1.45),
    "hp.L": (0.11, 0, 0.96), "kn.L": (0.12, -0.01, 0.54), "an.L": (0.12, 0.02, 0.1), "to.L": (0.12, -0.15, 0.04),
    "hp.R": (-0.11, 0, 0.96), "kn.R": (-0.12, -0.01, 0.54), "an.R": (-0.12, 0.02, 0.1), "to.R": (-0.12, -0.15, 0.04),
}
R = {  # skin radii: hoodie torso, slim legs
    "pelvis": 0.18, "spine": 0.18, "chest": 0.21, "neck": 0.07, "head": 0.115, "crown": 0.105,
    "sh.L": 0.09, "el.L": 0.072, "wr.L": 0.05, "hd.L": 0.058, "sh.R": 0.09, "el.R": 0.072, "wr.R": 0.05, "hd.R": 0.058,
    "hp.L": 0.11, "kn.L": 0.08, "an.L": 0.06, "to.L": 0.058, "hp.R": 0.11, "kn.R": 0.08, "an.R": 0.06, "to.R": 0.058,
}
E = [("pelvis", "spine"), ("spine", "chest"), ("chest", "neck"), ("neck", "head"), ("head", "crown"),
     ("chest", "sh.L"), ("sh.L", "el.L"), ("el.L", "wr.L"), ("wr.L", "hd.L"),
     ("chest", "sh.R"), ("sh.R", "el.R"), ("el.R", "wr.R"), ("wr.R", "hd.R"),
     ("pelvis", "hp.L"), ("hp.L", "kn.L"), ("kn.L", "an.L"), ("an.L", "to.L"),
     ("pelvis", "hp.R"), ("hp.R", "kn.R"), ("kn.R", "an.R"), ("an.R", "to.R")]

names = list(P.keys())
me = bpy.data.meshes.new("GregBody")
me.from_pydata([P[n] for n in names], [(names.index(a), names.index(b)) for a, b in E], [])
body = bpy.data.objects.new("GregBody", me)
scene.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
sk = body.modifiers.new("skin", "SKIN")
for i, n in enumerate(names):
    k = {"chest": (1.12, 0.82), "spine": (1.05, 0.85), "pelvis": (1.0, 0.8)}.get(n, (1.0, 1.0))
    body.data.skin_vertices[0].data[i].radius = (R[n] * k[0], R[n] * k[1])
body.data.skin_vertices[0].data[0].use_root = True
sub = body.modifiers.new("sub", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
bpy.ops.object.modifier_apply(modifier="skin")
bpy.ops.object.modifier_apply(modifier="sub")
bpy.ops.object.shade_smooth()
body.data.materials.append(bpy.data.materials.new("body"))

# ---------- spiky white hair (the glowing crown on the cover) ----------
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=3, radius=0.13)
import random
random.seed(7)
spikes = [Vector((random.uniform(-1, 1), random.uniform(-0.2, 1), random.uniform(-0.1, 1))).normalized() for _ in range(26)]
for v in bm.verts:
    d = v.co.normalized()
    s_ = max((d.dot(sp) for sp in spikes))
    lift = max(0.0, d.z + 0.35) * (0.6 + 0.4 * max(0, d.y + 0.3))
    v.co = d * (0.122 + 0.11 * (s_ ** 14) * lift + 0.02 * lift)
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0.015, 1.73))
hm = bpy.data.meshes.new("GregHair"); bm.to_mesh(hm); bm.free()
hair = bpy.data.objects.new("GregHair", hm); scene.collection.objects.link(hair)
hair.data.materials.append(bpy.data.materials.new("hair"))
for p_ in hair.data.polygons: p_.use_smooth = True

# ---------- armature ----------
arm_data = bpy.data.armatures.new("GregRig")
rig = bpy.data.objects.new("GregRig", arm_data); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
B = {}
def bone(name, a, b, parent=None, connect=False):
    eb = arm_data.edit_bones.new(name)
    eb.head = Vector(P[a]) if isinstance(a, str) else Vector(a)
    eb.tail = Vector(P[b]) if isinstance(b, str) else Vector(b)
    if parent: eb.parent = B[parent]; eb.use_connect = connect
    B[name] = eb
bone("hips", "pelvis", "spine")
bone("spine", "spine", "chest", "hips", True)
bone("neck", "chest", "neck", "spine", True)
bone("head", "neck", (0, 0, 1.86), "neck", True)
for s in ("L", "R"):
    bone(f"upperarm.{s}", f"sh.{s}", f"el.{s}", "spine")
    bone(f"forearm.{s}", f"el.{s}", f"wr.{s}", f"upperarm.{s}", True)
    bone(f"hand.{s}", f"wr.{s}", f"hd.{s}", f"forearm.{s}", True)
    bone(f"thigh.{s}", f"hp.{s}", f"kn.{s}", "hips")
    bone(f"shin.{s}", f"kn.{s}", f"an.{s}", f"thigh.{s}", True)
    bone(f"foot.{s}", f"an.{s}", f"to.{s}", f"shin.{s}", True)
bpy.ops.object.mode_set(mode="OBJECT")

# skin the body with automatic weights, hair rides the head bone
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
bpy.ops.object.select_all(action="DESELECT")
hair.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_NAME")
vg = hair.vertex_groups["head"]; vg.add([v.index for v in hair.data.vertices], 1.0, "REPLACE")

# ---------- posing: aim each bone at a direction in armature space ----------
ORDER = ["hips", "spine", "neck", "head",
         "upperarm.L", "forearm.L", "hand.L", "upperarm.R", "forearm.R", "hand.R",
         "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R"]
def n(*v): return Vector(v).normalized()

def mirror(d):  # left-side spec -> right side
    return {k.replace(".L", ".X").replace(".R", ".L").replace(".X", ".R"): Vector((-v.x, v.y, v.z)) for k, v in d.items()}

def sym(left):  # build both sides from left-limb directions
    out = dict(left); out.update({k.replace(".L", ".R"): Vector((-v.x, v.y, v.z)) for k, v in left.items() if k.endswith(".L")})
    return out

STAND_LEGS = {"thigh.L": n(0.04, 0, -1), "shin.L": n(0, 0.03, -1), "foot.L": n(0, -1, -0.35)}
POSES = {
    "stand": {"hips": n(0, 0, 1), "spine": n(0, 0, 1), "neck": n(0, 0, 1), "head": n(0, 0, 1),
              **sym({"upperarm.L": n(0.2, 0.02, -1), "forearm.L": n(0.12, -0.08, -1), "hand.L": n(0.1, -0.1, -1), **STAND_LEGS})},
    "fly": {"hips": n(0, -0.3, 1), "spine": n(0, -0.32, 1), "neck": n(0, -0.2, 1), "head": n(0, -0.1, 1),
            **sym({"upperarm.L": n(1, 0.25, -0.6), "forearm.L": n(1, 0.3, -0.45), "hand.L": n(1, 0.3, -0.4),
                   "thigh.L": n(0.14, 0.3, -1), "shin.L": n(0.06, 0.5, -1), "foot.L": n(0, 0.55, -1)})},
    "cover": {"hips": n(0, 0.04, 1), "spine": n(0.05, 0.05, 1), "neck": n(0.08, 0, 1), "head": n(0.12, -0.05, 1),
              "upperarm.L": n(0.9, 0.35, -0.75), "forearm.L": n(0.9, 0.2, -0.55), "hand.L": n(0.9, 0.1, -0.5),
              "upperarm.R": n(-0.9, 0.35, -0.8), "forearm.R": n(-0.9, 0.25, -0.6), "hand.R": n(-0.9, 0.1, -0.55),
              "thigh.L": n(0.06, -0.18, -1), "shin.L": n(0.02, 0.1, -1), "foot.L": n(0, -1, -0.5),
              "thigh.R": n(-0.06, 0.32, -1), "shin.R": n(-0.03, 0.55, -1), "foot.R": n(0, 0.35, -1)},
    "steer-left": {"hips": n(0.65, -0.3, 1), "spine": n(0.7, -0.3, 1), "neck": n(0.75, -0.2, 1), "head": n(0.7, -0.1, 1),
                   "upperarm.L": n(0.35, 0.3, -1), "forearm.L": n(0.2, 0.3, -1), "hand.L": n(0.2, 0.2, -1),
                   "upperarm.R": n(-1, 0.15, 0.25), "forearm.R": n(-1, 0.15, 0.3), "hand.R": n(-1, 0.1, 0.3),
                   "thigh.L": n(-0.35, 0.45, -1), "shin.L": n(-0.45, 0.55, -1), "foot.L": n(-0.3, 0.6, -1),
                   "thigh.R": n(-0.55, 0.4, -1), "shin.R": n(-0.55, 0.5, -1), "foot.R": n(-0.4, 0.6, -1)},
    "hit": {"hips": n(0, -0.7, 1), "spine": n(0, -1, 0.5), "neck": n(0, -1, 0.1), "head": n(0, -1, -0.25),
            **sym({"upperarm.L": n(0.35, -0.8, -0.55), "forearm.L": n(-0.55, -0.6, 0.3), "hand.L": n(-0.6, -0.5, 0.2),
                   "thigh.L": n(0.18, -1, 0.35), "shin.L": n(0.05, 0.35, -1), "foot.L": n(0, -0.6, -1)})},
    "arms": {"hips": n(0, 0, 1), "spine": n(0, 0.04, 1), "neck": n(0, 0.08, 1), "head": n(0, 0.15, 1),
             **sym({"upperarm.L": n(1, 0.05, 0.12), "forearm.L": n(1, 0, 0.22), "hand.L": n(1, -0.05, 0.3),
                    "thigh.L": n(0.22, 0, -1), "shin.L": n(0.1, 0.05, -1), "foot.L": n(0.1, -1, -0.35)})},
    "wave": {"hips": n(0, 0.03, 1), "spine": n(0, 0.1, 1), "neck": n(0, 0.2, 1), "head": n(0, 0.35, 1),
             **sym({"upperarm.L": n(1, 0.1, 0.35), "forearm.L": n(1, 0.05, 0.5), "hand.L": n(1, 0, 0.6),
                    "thigh.L": n(0.25, 0, -1), "shin.L": n(0.12, 0.05, -1), "foot.L": n(0.1, -1, -0.35)})},
    "back": {"hips": n(0, 0, 1), "spine": n(0, 0.03, 1), "neck": n(0, 0.08, 1), "head": n(0, 0.2, 1),
             **sym({"upperarm.L": n(0.14, 0.04, -1), "forearm.L": n(0.08, -0.04, -1), "hand.L": n(0.06, -0.05, -1),
                    "thigh.L": n(0.06, 0, -1), "shin.L": n(0.02, 0.03, -1), "foot.L": n(0, -1, -0.35)})},
}
# fly-a: faster diagonal dive, arms swept back
POSES["fly-a"] = {"hips": n(-0.3, -0.55, 1), "spine": n(-0.35, -0.6, 1), "neck": n(-0.3, -0.5, 1), "head": n(-0.2, -0.4, 1),
                  "upperarm.L": n(0.9, 0.7, -0.35), "forearm.L": n(0.7, 0.9, -0.3), "hand.L": n(0.6, 1, -0.25),
                  "upperarm.R": n(-0.8, 0.7, -0.55), "forearm.R": n(-0.5, 0.9, -0.6), "hand.R": n(-0.4, 1, -0.6),
                  "thigh.L": n(0.25, 0.75, -1), "shin.L": n(0.2, 1, -0.8), "foot.L": n(0.1, 1, -0.5),
                  "thigh.R": n(0.05, 0.85, -1), "shin.R": n(0.15, 1, -0.7), "foot.R": n(0.1, 1, -0.4)}
POSES["steer-right"] = mirror(POSES["steer-left"])

bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="POSE")
rest = {b.name: (b.matrix_local.copy()) for b in arm_data.bones}

def apply_pose(spec):
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for name in ORDER:
        pb = rig.pose.bones[name]
        if name not in spec: continue
        rl = rest[name]
        if pb.parent:
            par = rig.pose.bones[pb.parent.name]
            head = par.matrix @ (rest[pb.parent.name].inverted() @ rl.translation)
        else:
            head = rl.translation
        rest_dir = (rl.to_3x3() @ Vector((0, 1, 0))).normalized()
        q = rest_dir.rotation_difference(spec[name])
        rot = q.to_matrix() @ rl.to_3x3()
        m = rot.to_4x4(); m.translation = head
        pb.matrix = m
        bpy.context.view_layer.update()

for name, spec in POSES.items():
    act = bpy.data.actions.new(name); act.use_fake_user = True
    rig.animation_data_create(); rig.animation_data.action = act
    apply_pose(spec)
    for pb in rig.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=1)
        pb.keyframe_insert("location", frame=1)
        pb.keyframe_insert("rotation_quaternion", frame=2)
        pb.keyframe_insert("location", frame=2)
bpy.ops.object.mode_set(mode="OBJECT")
rig.animation_data.action = bpy.data.actions["stand"]

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "greg.blend"))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "greg.glb"), export_format="GLB",
                          export_animation_mode="ACTIONS", export_apply=False, export_yup=True,
                          export_skins=True, export_morph=False, export_force_sampling=True)
print("POSES", list(POSES.keys()))
