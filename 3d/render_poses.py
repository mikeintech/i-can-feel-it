import bpy, sys, os, math
OUT = sys.argv[sys.argv.index("--") + 1]
sc = bpy.context.scene
rig = bpy.data.objects["GregRig"]
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (0.9, 0.15, 0.2)
sc.display.shading.show_cavity = True
sc.render.resolution_x = 300; sc.render.resolution_y = 380
cam_d = bpy.data.cameras.new("c"); cam_d.type = "ORTHO"; cam_d.ortho_scale = 2.4
cam = bpy.data.objects.new("c", cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.0, 4.0, 1.0); cam.rotation_euler = (math.radians(90), 0, math.radians(180))
sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.02, 0.01, 0.04)
for a in bpy.data.actions:
    rig.animation_data.action = a
    sc.frame_set(1)
    sc.render.filepath = os.path.join(OUT, f"pose_{a.name}.png")
    bpy.ops.render.render(write_still=True)
