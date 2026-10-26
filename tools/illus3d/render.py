# Rendu Blender : mannequin 3D éclairé à partir des poses exportées par export-poses.js.
# Usage : blender -b -P tools/illus3d/render.py -- poses.json dossier_sortie [taille=768] [echantillons=64]
import bpy, json, sys, math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
DATA = json.load(open(argv[0], encoding='utf-8'))
OUT = argv[1]
SIZE = int(argv[2]) if len(argv) > 2 else 1024
SAMPLES = int(argv[3]) if len(argv) > 3 else 160
STYLE = argv[4] if len(argv) > 4 else 'robot'
CM = 0.01

def V(p):  # moteur (x avant, y haut, z latéral) -> Blender (x avant, -z, y haut) : rotation, pas de miroir
    return Vector((p[0] * CM, -p[2] * CM, p[1] * CM))

def lin(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c ** 2.2
    return (f(r), f(g), f(b), 1)

MATS = {}
def mat(hexcol, rough=0.55, metal=0.0):
    key = (hexcol, rough, metal)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new('m' + str(len(MATS)))
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = lin(hexcol)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    MATS[key] = m
    return m

SKIN, TOP, SHORTS, SHOE, HAIR, SOLE = '#c98f68', '#3a4659', '#2b3442', '#e9ecf2', '#2a211c', '#f5d76e'
CREATED = []

def smooth(o):
    for p in o.data.polygons: p.use_smooth = True

def frame(z, lat=Vector((0, 1, 0))):
    z = z.normalized()
    y = lat - z * lat.dot(z)
    if y.length < 1e-4: y = Vector((1, 0, 0)) - z * z.x
    y.normalize(); x = y.cross(z).normalized()
    return Matrix(((x.x, y.x, z.x), (x.y, y.y, z.y), (x.z, y.z, z.z))).to_4x4()

def ellipsoid(c, axis, sx, sy, sz, m, lat=Vector((0, 1, 0))):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1)
    o = bpy.context.active_object
    o.matrix_world = Matrix.Translation(c) @ frame(axis, lat) @ Matrix.Diagonal((sx, sy, sz, 1))
    o.data.materials.append(m); smooth(o); CREATED.append(o); return o

def sphere(c, r, m):
    return ellipsoid(c, Vector((0, 0, 1)), r, r, r, m)

def cone(a, b, r1, r2, m):
    d = b - a
    if d.length < 1e-6: return None
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=r1, radius2=r2, depth=d.length)
    o = bpy.context.active_object
    o.matrix_world = Matrix.Translation((a + b) / 2) @ frame(d)
    o.data.materials.append(m); smooth(o); CREATED.append(o); return o

def lerp(a, b, t): return a + (b - a) * t

def limb(a, b, r1, r2, m, joint=True):
    cone(a, b, r1, r2, m)
    if joint: sphere(b, r2, m)

def build_body(P):
    skin, top, shorts, shoe, hair = mat(SKIN, .62), mat(TOP, .8), mat(SHORTS, .8), mat(SHOE, .45), mat(HAIR, .5)
    sole = mat(SOLE, .4)
    hipM, shM = V(P['hipM']), V(P['shoulderM'])
    spine = shM - hipM
    up = spine.normalized()
    # tronc : bassin (short), taille, thorax (haut)
    ellipsoid(hipM + up * 0.02, up, .105, .125, .09, shorts)
    cone(lerp(hipM, shM, .06), lerp(hipM, shM, .62), .088, .098, top)             # abdomen
    ellipsoid(lerp(hipM, shM, .79), up, .098, .172, .125, top)                    # thorax
    ellipsoid(lerp(hipM, shM, .95), up, .075, .19, .05, top)                      # ligne des épaules
    # cou et tête
    head = V(P['head'])
    hu = (head - shM).normalized()
    fwd = Vector((0, 1, 0)).cross(hu).normalized()
    cone(shM + hu * .02, head - hu * .085, .042, .036, skin)
    hc = head
    ellipsoid(hc, hu, .085, .077, .105, skin, lat=Vector((0, 1, 0)))
    ellipsoid(hc + (-fwd * .012 + hu * .02), hu, .092, .082, .1, hair)
    ellipsoid(hc + fwd * .082 - hu * .008, hu, .017, .015, .02, skin)   # nez
    for side in ('near', 'far'):
        k = {n: V(p) for n, p in P[side].items()}
        # jambe : cuisse (short sur la moitié haute), jambe, pied
        mid = lerp(k['hip'], k['knee'], .5)
        cone(k['hip'], mid, .075, .066, shorts); cone(mid, k['knee'], .066, .05, skin)
        sphere(k['hip'], .074, shorts); sphere(k['knee'], .05, skin)
        limb(k['knee'], k['ankle'], .05, .032, skin)
        fd = (k['toe'] - k['ankle'])
        if fd.length < 1e-6: fd = Vector((1, 0, 0))
        fd.normalize()
        heel = k['ankle'] - fd * .06 - Vector((0, 0, .015))
        toe = k['toe'] + fd * .1
        ellipsoid(lerp(heel, toe, .5) - Vector((0, 0, .008)), toe - heel, .042, .05, (toe - heel).length / 2 + .01, shoe)
        ellipsoid(lerp(heel, toe, .5) - Vector((0, 0, .03)), toe - heel, .044, .052, (toe - heel).length / 2, sole)
        # bras : épaule, coude, poignet, main
        sphere(k['shoulder'], .052, skin)
        limb(k['shoulder'], k['elbow'], .048, .037, skin)
        limb(k['elbow'], k['wrist'], .037, .028, skin)
        ellipsoid(k['wrist'] + (k['wrist'] - k['elbow']).normalized() * .03, k['wrist'] - k['elbow'], .032, .022, .045, skin)

def equipment(P):
    polys = {}
    for p in P['prims']:
        if p['t'] == 'line':
            a, b = V(p['p'][0]), V(p['p'][1])
            col = p['col'] if isinstance(p['col'], str) and p['col'].startswith('#') else '#9ba6b3'
            r = max(.006, p['w'] * CM * .32)
            cone(a, b, r, r, mat(col, .35, .8))
        elif p['t'] == 'poly':
            fill = p.get('fill')
            col = fill if isinstance(fill, str) and fill.startswith('#') else '#4a5565'
            pol = polys.setdefault(col, [])
            pol.append([V(q) for q in p['p']])
        elif p['t'] == 'circle':
            fill = p.get('fill')
            if isinstance(fill, str) and fill.startswith('#'):
                sphere(V(p['p'][0]), p['r'] * CM, mat(fill, .5, .6))
    for col, faces in polys.items():
        me = bpy.data.meshes.new('eq'); verts, fs = [], []
        for f in faces:
            i = len(verts); verts.extend(f); fs.append(tuple(range(i, i + len(f))))
        me.from_pydata([tuple(v) for v in verts], [], fs); me.update()
        o = bpy.data.objects.new('eq', me); bpy.context.collection.objects.link(o)
        c = lin(col); mm = mat(col, .6, .1); o.data.materials.append(mm)
        sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .004; sol.offset = 0
        CREATED.append(o)

def clear():
    for o in CREATED:
        bpy.data.objects.remove(o, do_unlink=True)
    CREATED.clear()

def pose_points(P):
    pts = [P['hipM'], P['shoulderM'], P['head']]
    for s in ('near', 'far'): pts += list(P[s].values())
    for p in P['prims']:
        if p['t'] != 'circle' or (isinstance(p.get('fill'), str) and p['fill'].startswith('#')): pts += p['p']
    return [V(q) for q in pts]


# ---------- style robot doré (inspiré de l'esthétique Ultrakill) ----------
GOLD, GOLD_L, DARK, AMBER = '#d9a521', '#f5d76e', '#14181f', '#ffae2b'

def mat_emit(hexcol, strength):
    key = ('emit', hexcol, strength)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new('e' + str(len(MATS)))
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = lin(hexcol)
    b.inputs['Emission Color'].default_value = lin(hexcol)
    b.inputs['Emission Strength'].default_value = strength
    MATS[key] = m
    return m

def cube(c, axis, sx, sy, sz, m, bevel=.006, lat=Vector((0, 1, 0))):
    bpy.ops.mesh.primitive_cube_add(size=2)
    o = bpy.context.active_object
    o.data.transform(Matrix.Diagonal((sx, sy, sz, 1)))
    o.matrix_world = Matrix.Translation(c) @ frame(axis, lat)
    o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('b', 'BEVEL'); md.width = min(bevel, min(sx, sy, sz) * .8); md.segments = 2; md.limit_method = 'ANGLE'
    CREATED.append(o); return o

def prism(a, b, r1, r2, m, verts=8):
    d = b - a
    if d.length < 1e-6: return None
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d.length)
    o = bpy.context.active_object
    o.matrix_world = Matrix.Translation((a + b) / 2) @ frame(d)
    o.data.materials.append(m)
    md = o.modifiers.new('b', 'BEVEL'); md.width = .004; md.segments = 2; md.limit_method = 'ANGLE'
    CREATED.append(o); return o

def build_robot(P):
    gold, goldl, dark = mat(GOLD, .28, 1.0), mat(GOLD_L, .22, 1.0), mat(DARK, .5, .75)
    glow, glow2 = mat_emit('#ff9a14', 6.0), mat_emit('#ffb23a', 3.2)
    hipM, shM = V(P['hipM']), V(P['shoulderM'])
    up = (shM - hipM).normalized()
    lat = Vector((0, 1, 0))
    fwd = lat.cross(up).normalized()
    # --- bassin et abdomen
    cube(hipM + up * .02, up, .115, .15, .07, dark)
    for s in (-1, 1):
        cube(hipM + up * .035 + lat * s * .125, up, .09, .028, .06, gold)
    for t in (.16, .28, .40, .52):
        prism(lerp(hipM, shM, t - .05), lerp(hipM, shM, t + .05), .088, .084, dark if int(t * 100) % 24 else goldl, 8)
    prism(hipM + up * .06, shM - up * .12, .05, .05, dark, 6)
    # --- thorax : plastron doré, dos sombre, noyau lumineux
    cube(lerp(hipM, shM, .80), up, .115, .21, .13, gold, .016)
    cube(lerp(hipM, shM, .80) - fwd * .07, up, .07, .15, .11, dark)
    cube(lerp(hipM, shM, .66) + fwd * .015, up, .1, .13, .045, goldl, .01)
    sphere(lerp(hipM, shM, .80) + fwd * .105, .03, glow)
    prism(lerp(hipM, shM, .80) + fwd * .098, lerp(hipM, shM, .80) + fwd * .125, .042, .04, dark, 12)
    for s in (-1, 1):                                   # épaulières
        ellipsoid(shM + lat * s * .115 - up * .01, up, .098, .1, .07, gold)
    # --- cou et tête
    head = V(P['head']); hu = (head - shM).normalized(); hf = lat.cross(hu).normalized()
    prism(shM + hu * .01, head - hu * .08, .04, .035, dark, 8)
    cube(head + hu * .005, hu, .085, .078, .092, gold, .014, lat)
    cube(head + hf * .075 - hu * .005, hu, .02, .07, .062, dark, .006, lat)            # plaque faciale
    for s_ in (-1, 1):
        cube(head + hf * .097 + hu * .014 + lat * s_ * .032, hu, .008, .024, .011, glow, .002, lat)   # yeux lumineux
    for s in (-1, 1):
        cube(head - hf * .01 + lat * s * .085, hu, .03, .014, .05, dark, .004, lat)   # oreilles
    cube(head + hu * .1 - hf * .01, hu, .06, .018, .018, goldl, .004, lat)            # crête
    for side in ('near', 'far'):
        sgn = -1 if side == 'near' else 1                  # côté de la caméra : y négatif
        k = {n: V(p) for n, p in P[side].items()}
        # jambes
        mid = lerp(k['hip'], k['knee'], .5)
        prism(k['hip'], k['knee'], .08, .062, dark, 8)
        prism(lerp(k['hip'], k['knee'], .08), lerp(k['hip'], k['knee'], .9), .098, .074, gold, 8)
        sphere(k['hip'], .07, dark); sphere(k['knee'], .06, dark)
        prism(k['knee'], k['ankle'], .056, .04, dark, 8)
        prism(lerp(k['knee'], k['ankle'], .1), lerp(k['knee'], k['ankle'], .86), .076, .05, gold, 8)
        dthigh = (k['knee'] - k['hip']); dshin = (k['ankle'] - k['knee'])
        kf = dshin.cross(lat).normalized()
        cube(k['knee'] + kf * .066, kf, .022, .055, .06, goldl, .01, lat)                # genouillère
        cube(lerp(k['knee'], k['ankle'], .5) + lat * sgn * .05, dshin, .008, .008, dshin.length * .3, glow2, .002)
        cube(lerp(k['hip'], k['knee'], .5) + lat * sgn * .075, dthigh, .008, .008, dthigh.length * .3, glow2, .002)
        # pied : botte dorée, semelle sombre, liseré lumineux
        fd = (k['toe'] - k['ankle'])
        if fd.length < 1e-6: fd = Vector((1, 0, 0))
        fd.normalize()
        heel = k['ankle'] - fd * .06 - Vector((0, 0, .02)); toe = k['toe'] + fd * .1
        c = lerp(heel, toe, .5); ln = (toe - heel).length / 2
        cube(c, toe - heel, .042, .05, ln, gold, .01)
        cube(c - Vector((0, 0, .04)), toe - heel, .046, .054, ln + .004, dark, .006)
        cube(c + lat * sgn * .052, toe - heel, .006, .006, ln * .8, glow2, .001)
        # bras
        sphere(k['shoulder'], .055, dark)
        prism(k['shoulder'], k['elbow'], .052, .042, dark, 8)
        prism(lerp(k['shoulder'], k['elbow'], .1), lerp(k['shoulder'], k['elbow'], .9), .066, .05, gold, 8)
        sphere(k['elbow'], .047, dark)
        prism(k['elbow'], k['wrist'], .04, .032, dark, 8)
        prism(lerp(k['elbow'], k['wrist'], .12), lerp(k['elbow'], k['wrist'], .95), .06, .045, goldl, 8)
        fa = (k['wrist'] - k['elbow']).normalized()
        cube(lerp(k['elbow'], k['wrist'], .5) + lat * sgn * .045, fa, .006, .006, (k['wrist'] - k['elbow']).length * .3, glow2, .001)
        cube(k['wrist'] + fa * .04, fa, .042, .05, .048, dark, .01)                          # poing
        cube(k['wrist'] + fa * .075, fa, .044, .052, .014, gold, .005)                         # plaque


# ---------- style astronaute (logo de Muscu : combinaison noire, liserés dorés, casque noir brillant) ----------
def torus(c, axis, R, r, m, lat=Vector((0, 1, 0))):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=14)
    o = bpy.context.active_object
    o.matrix_world = Matrix.Translation(c) @ frame(axis, lat)
    o.data.materials.append(m); smooth(o); CREATED.append(o); return o

def fabric(hexcol, rough=.72, bump=.2, scale=260):
    key = ('fab', hexcol, rough, bump, scale)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new('f' + str(len(MATS)))
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = lin(hexcol)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = .04
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); bp = nt.nodes.new('ShaderNodeBump')
    nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = .65
    bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = .003
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    MATS[key] = m
    return m

def visor_mat():
    key = ('visor',)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new('visor'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = lin('#04060a'); b.inputs['Roughness'].default_value = .035; b.inputs['Metallic'].default_value = .6
    b.inputs['Emission Color'].default_value = lin('#f0b43a')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .3
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.9
    nt.links.new(lw.outputs['Fresnel'], mul.inputs[0]); nt.links.new(mul.outputs['Value'], b.inputs['Emission Strength'])
    MATS[key] = m
    return m

def star_patch(c, normal, R, m):
    n = normal.normalized()
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36); r = R if i % 2 == 0 else R * .42
        pts.append(Vector((r * math.cos(a), r * math.sin(a), 0)))
    me = bpy.data.meshes.new('star'); me.from_pydata([tuple(p) for p in pts], [], [tuple(range(10))]); me.update()
    o = bpy.data.objects.new('star', me); bpy.context.collection.objects.link(o)
    o.matrix_world = Matrix.Translation(c) @ frame(n)
    o.data.materials.append(m)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .004; sol.offset = 1
    CREATED.append(o)

def gear(c, axis, R, thick, teeth, m_gold, m_goldl, m_dark, m_glow, lat=Vector((0, 1, 0))):
    """Engrenage doré : corps, dents, moyeu, noyau lumineux. axis = normale (face visible)."""
    ax = axis.normalized()
    up_ = lat - ax * lat.dot(ax)
    if up_.length < 1e-4: up_ = Vector((0, 0, 1))
    up_.normalize(); side = ax.cross(up_).normalized()
    prism(c - ax * thick / 2, c + ax * thick / 2, R * .84, R * .84, m_gold, 56)
    for i in range(teeth):
        a = 2 * math.pi * i / teeth
        radial = (up_ * math.cos(a) + side * math.sin(a)).normalized()
        cube(c + radial * R * .9, radial, R * .105, thick / 2, R * .13, m_gold, .004, ax)
    torus(c + ax * thick / 2, ax, R * .6, R * .055, m_goldl, up_)
    prism(c + ax * (thick / 2 - .003), c + ax * (thick / 2 + .002), R * .5, R * .5, m_dark, 48)
    torus(c + ax * (thick / 2 + .002), ax, R * .24, R * .035, m_goldl, up_)
    prism(c + ax * (thick / 2), c + ax * (thick / 2 + .006), R * .17, R * .17, m_glow, 32)
    for i in range(4):                                  # rayons entre le moyeu et la jante
        a = math.pi / 4 + i * math.pi / 2
        radial = (up_ * math.cos(a) + side * math.sin(a)).normalized()
        cube(c + ax * (thick / 2 + .001) + radial * R * .4, radial, R * .035, .003, R * .2, m_goldl, .001, ax)

def block(origin, xd, yd, zd, verts, m, bevel=.005):
    """Prisme à 8 sommets (face basse z=0, face haute z=L) exprimé dans un repère local : paume, plaques."""
    me = bpy.data.meshes.new('blk')
    vs = [tuple(origin + xd * x + yd * y + zd * z) for x, y, z in verts]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(vs, [], faces); me.update()
    for pl in me.polygons: pl.use_smooth = True
    o = bpy.data.objects.new('blk', me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = 3
    CREATED.append(o); return o

BAR_R, HAND_L, HAND_RC = .016, .12, .03       # rayon de la barre, longueur de la paume, rayon de l'arc des doigts (barre + doigt)

def hand_frame(k, lat, fwd):
    """Repère de la main : fa = direction de l'avant-bras, xd = côté où les doigts se referment, yd = latéral."""
    fa = (k['wrist'] - k['elbow']).normalized()
    cdir = Vector((1, 0, 0)) - fa * fa.x
    if cdir.length < .2: cdir = fwd - fa * fa.dot(fwd)
    cdir.normalize()
    yd = fa.cross(cdir).normalized()
    if yd.dot(lat) < 0: yd = -yd
    xd = yd.cross(fa).normalized()
    if xd.dot(cdir) < 0: xd = -xd
    return fa, xd, yd

def flat_dir(fa):
    h = Vector((fa.x, fa.y, 0))
    if h.length < .3: h = Vector((1, 0, 0))
    return h.normalized()

def hand_wrist(k, lat, fwd, mode='open'):
    """Poignet réel selon le type d'appui : prise (barre au centre de l'arc des doigts), appui à plat, ou main libre."""
    fa, xd, yd = hand_frame(k, lat, fwd)
    if mode == 'grip': return k['wrist'] - xd * HAND_RC - fa * HAND_L
    if mode == 'flat': return k['wrist'] - flat_dir(fa) * .04 + Vector((0, 0, .021))
    return k['wrist'] - fa * .02

def hand(k, sgn, lat, mats, fwd, wr, mode='open'):
    """Main gantée. grip : saisit la barre ; flat : posée à plat (paume au sol) ; open : main libre, doigts légèrement fléchis."""
    suit2, suit3, gold, goldl = mats
    fa, xd, yd = hand_frame(k, lat, fwd)
    L, HS, Rc = HAND_L, 1.2, HAND_RC
    w0, w1, t0, t1 = .03 * HS, .043 * HS, .017 * HS, .0135 * HS
    side = -sgn if sgn != 0 else 1
    if mode == 'flat':
        zd = flat_dir(fa); xd = Vector((0, 0, -1)); yd = Vector((0, 1, 0))
    else:
        zd = fa
    prism(wr - zd * .035, wr + zd * .018, .047, .043, suit3, 20)                 # manchette
    torus(wr - zd * .012, zd, .049, .0075, gold, lat)
    block(wr, xd, yd, zd, [(-t0, -w0, 0), (t0, -w0, 0), (t0, w0, 0), (-t0, w0, 0), (-t1, -w1, L), (t1, -w1, L), (t1, w1, L), (-t1, w1, L)], suit2, .006)
    block(wr + zd * L * .12 - xd * (t0 + .0025), xd, yd, zd,
          [(-.003, -w0 * .8, 0), (.003, -w0 * .8, 0), (.003, w0 * .8, 0), (-.003, w0 * .8, 0), (-.003, -w1 * .86, L * .72), (.003, -w1 * .86, L * .72), (.003, w1 * .86, L * .72), (-.003, w1 * .86, L * .72)], gold, .002)
    specs = ((-.0325, .036), (-.0108, .042), (.0108, .039), (.0325, .031))
    r0 = .0112 * HS
    if mode == 'grip':
        g = k['wrist']
        def arc(theta, off):
            return g + yd * off + (-xd * math.cos(theta) + zd * math.sin(theta)) * Rc
        for off, l1 in specs:
            off *= HS; l1 *= HS
            t1_, t2_, t3_ = l1 / Rc, l1 * .78 / Rc, l1 * .6 / Rc
            k_ = min(1.0, math.radians(190) / (t1_ + t2_ + t3_))
            th = [0, t1_ * k_, (t1_ + t2_) * k_, (t1_ + t2_ + t3_) * k_]
            pts = [arc(t, off) for t in th]
            sphere(pts[0], r0 * 1.02, suit3)
            for i, r_ in enumerate((r0, r0 * .93, r0 * .85)):
                prism(pts[i], pts[i + 1], r_, r_ * .94, suit3, 14); sphere(pts[i + 1], r_ * .95, suit3)
            sphere(pts[3], r0 * .84, goldl)
        off_t = yd * side * w0 * .95
        pts = [wr + zd * L * .24 + off_t] + [g + off_t + (-xd * math.cos(math.radians(a_)) + zd * math.sin(math.radians(a_))) * Rc for a_ in (-50, -95, -150)]
        for i, r_ in enumerate((.0145 * HS, .0128 * HS, .0112 * HS)):
            prism(pts[i], pts[i + 1], r_, r_ * .92, suit3, 14); sphere(pts[i + 1], r_ * .95, suit3)
        sphere(pts[3], .0108 * HS, goldl)
        return
    # appui à plat : doigts tendus, légèrement écartés ; main libre : doigts fléchis progressivement
    ang = (0, 0, 0) if mode == 'flat' else (math.radians(14), math.radians(40), math.radians(66))
    for fi, (off, l1) in enumerate(specs):
        off *= HS; l1 *= HS
        spread = yd * (off * .12) * (1 if mode == 'flat' else 0)
        b = wr + zd * L + yd * off
        sphere(b, r0 * 1.02, suit3)
        a_cum = 0; segs = (l1, l1 * .78, l1 * .6)
        for i, ln in enumerate(segs):
            a_cum += ang[i]
            d = zd * math.cos(a_cum) + xd * math.sin(a_cum) + spread
            nb = b + d.normalized() * ln
            r_ = r0 * (1, .93, .85)[i]
            prism(b, nb, r_, r_ * .94, suit3, 14); sphere(nb, r_ * .95, suit3)
            b = nb
        sphere(b, r0 * .84, goldl)
    # pouce : le long du bord de la paume
    off_t = yd * side * w0 * .95
    t_base = wr + zd * L * .22 + off_t
    if mode == 'flat': dirs = (zd * .6 + yd * side * .55, zd * .75 + yd * side * .3, zd * .85 + yd * side * .15)
    else: dirs = (zd * .55 + yd * side * .6 + xd * .2, zd * .5 + yd * side * .3 + xd * .6, zd * .3 + xd * .85)
    b = t_base
    for i, (d, r_) in enumerate(zip(dirs, (.0145 * HS, .0128 * HS, .0112 * HS))):
        nb = b + d.normalized() * (.036, .03, .025)[i] * HS
        prism(b, nb, r_, r_ * .92, suit3, 14); sphere(nb, r_ * .95, suit3)
        b = nb
    sphere(b, .0108 * HS, goldl)

def build_astro(P):
    suit, suit2, suit3 = fabric('#14171d', .6), fabric('#1d222b', .55), fabric('#0d1015', .75)
    gold, goldl = mat('#e0b13a', .22, 1.0), mat('#f8dc78', .16, 1.0)
    strap = fabric('#262c37', .75, .3, 400)
    visor = visor_mat()
    shell = mat('#171a20', .28, .4)
    glow = mat_emit('#ffb23a', 4.0)
    rubber = mat('#14171c', .85, 0)
    hipM, shM = V(P['hipM']), V(P['shoulderM'])
    up = (shM - hipM).normalized(); lat = Vector((0, 1, 0)); fwd = lat.cross(up).normalized()
    # ----- tronc
    ellipsoid(hipM + up * .02, up, .118, .145, .105, suit)
    cone(lerp(hipM, shM, .08), lerp(hipM, shM, .6), .108, .118, suit)
    for t in (.16, .27, .38, .49):                                                  # anneaux souples de la taille
        torus(lerp(hipM, shM, t), up, .112, .011, suit3)
    ellipsoid(lerp(hipM, shM, .78), up, .128, .205, .155, suit2)
    torus(hipM + up * .055, up, .13, .016, gold)                                    # ceinture
    cube(hipM + up * .055 + fwd * .128, up, .014, .03, .026, goldl, .006)           # boucle
    for s in (-1, 1):
        cube(hipM + up * .04 + lat * s * .13 + fwd * .02, up, .035, .03, .05, suit3, .008)      # pochettes
    # plastron : plaque sombre et engrenage doré (comme sur le logo)
    cube(lerp(hipM, shM, .76) + fwd * .12, up, .012, .105, .1, suit3, .01)
    gear(lerp(hipM, shM, .76) + fwd * .136, fwd, .088, .02, 14, gold, goldl, suit3, glow, up)
    for dx in (-.04, 0, .04):
        cube(lerp(hipM, shM, .55) + fwd * .13 + lat * dx, up, .004, .008, .008, glow, .001)
    # harnais croisé et boucles
    for s in (-1, 1):
        a = shM + lat * s * .128 + fwd * .085 - up * .01
        b = hipM + lat * s * .115 + fwd * .13 + up * .05
        cube((a + b) / 2, b - a, .008, .02, (b - a).length / 2, strap, .003)
        cube(lerp(a, b, .45) , b - a, .011, .024, .012, goldl, .004)                  # boucle
    for s in (-1, 1):
        cube(lerp(hipM, shM, .93) + lat * s * .1 + fwd * .098, up, .008, .026, .02, goldl, .004)
        # épaulières : coque, patch doré, écusson étoile
        ellipsoid(shM + lat * s * .118, up, .092, .098, .068, suit2)
        ellipsoid(shM + lat * s * .13 + up * .02, up, .06, .066, .02, gold)
        star_patch(shM + lat * s * .165 + up * .005, lat * s, .026, goldl)
        torus(shM + lat * s * .11 - up * .03, lat * s, .052, .008, suit3)
    # sac de survie : caisson, deux bouteilles, tuyau vers le casque
    back = lerp(hipM, shM, .74) - fwd * .13
    cube(back, up, .065, .15, .155, suit3, .018)
    for s in (-1, 1):
        prism(back - fwd * .05 + lat * s * .075 - up * .13, back - fwd * .05 + lat * s * .075 + up * .12, .045, .045, suit2, 24)
        sphere(back - fwd * .05 + lat * s * .075 + up * .12, .045, suit2)
        torus(back - fwd * .05 + lat * s * .075 + up * .02, up, .047, .007, gold)
    cube(back - fwd * .06 + up * .02, up, .01, .1, .05, goldl, .004)
    prism(back + up * .13 - fwd * .01, shM + up * .06 - fwd * .03, .018, .018, rubber, 12)
    # ----- cou et casque
    head = V(P['head']); hu = (head - shM).normalized(); hf = lat.cross(hu).normalized()
    cone(shM + hu * .01, shM + hu * .062, .066, .06, suit3)
    torus(shM + hu * .028, hu, .066, .009, rubber)
    torus(shM + hu * .066, hu, .066, .013, gold)                                    # collier
    cube(shM + hu * .066 + hf * .062, hu, .008, .018, .012, goldl, .003, lat)       # verrou du collier
    hc = head + hu * .016
    ellipsoid(hc, hu, .132, .126, .14, shell)                                       # coque
    ellipsoid(hc + hf * .03, hu, .12, .11, .122, visor)                             # visière dorée-noire
    torus(hc + hf * .092, hf, .077, .0135, goldl, lat)                              # joint doré
    ellipsoid(hc - hf * .095 + hu * .02, hu, .052, .08, .06, suit3)                 # bloc arrière
    for s in (-1, 1):                                                               # ports d'oreille
        prism(hc + lat * s * .118, hc + lat * s * .15, .036, .036, suit3, 24)
        torus(hc + lat * s * .148, lat * s, .036, .006, gold, hu)
        sphere(hc + lat * s * .153, .012, glow)
    prism(hc + hu * .125 - hf * .04, hc + hu * .235 - hf * .045, .005, .005, rubber, 8)   # antenne
    sphere(hc + hu * .237 - hf * .045, .012, glow)
    for dx in (-.03, 0, .03):
        cube(hc + hu * .135 + lat * dx, hu, .015, .006, .006, suit3, .002)          # évents
    # ----- membres
    for side in ('near', 'far'):
        sgn = -1 if side == 'near' else 1
        k = {n: V(p) for n, p in P[side].items()}
        # cuisse, genou (soufflets + genouillère), jambe
        limb(k['hip'], k['knee'], .095, .074, suit)
        dthigh = k['knee'] - k['hip']; dshin = k['ankle'] - k['knee']
        for t in (.8, .88, .96):
            torus(lerp(k['hip'], k['knee'], t), dthigh, .074, .008, suit3)
        cube(lerp(k['hip'], k['knee'], .45) + lat * sgn * .088, dthigh, .018, .04, .06, suit3, .008)   # poche cargo
        cube(lerp(k['hip'], k['knee'], .45) + lat * sgn * .1, dthigh, .004, .026, .022, goldl, .002)   # fermeture
        cube(lerp(k['hip'], k['knee'], .5) + lat * sgn * .094, dthigh, .004, .007, dthigh.length * .36, gold, .001)   # bande dorée (cuisse)
        cube(lerp(k['knee'], k['ankle'], .5) + lat * sgn * .062, dshin, .004, .007, dshin.length * .3, gold, .001)   # bande dorée (jambe)
        limb(k['knee'], k['ankle'], .07, .052, suit)
        kf = dshin.cross(lat).normalized()
        ellipsoid(k['knee'] + kf * .06, dshin, .04, .062, .06, suit2)
        torus(k['knee'] + kf * .066, kf, .042, .008, gold, lat)
        for t in (.1, .18, .26):
            torus(lerp(k['knee'], k['ankle'], t), dshin, .066, .007, suit3)
        torus(lerp(k['knee'], k['ankle'], .9), dshin, .056, .011, gold)
        # botte
        fd = (k['toe'] - k['ankle'])
        if fd.length < 1e-6: fd = Vector((1, 0, 0))
        fd.normalize()
        heel = k['ankle'] - fd * .065 - Vector((0, 0, .02)); toe = k['toe'] + fd * .115
        cc = lerp(heel, toe, .5); ln = (toe - heel).length / 2
        ellipsoid(cc + Vector((0, 0, .004)), toe - heel, .056, .066, ln + .012, suit)
        ellipsoid(cc + fd * (ln * .55) + Vector((0, 0, .002)), toe - heel, .05, .06, ln * .42, suit2)    # bout renforcé
        cube(cc - Vector((0, 0, .046)), toe - heel, .054, .066, ln + .014, rubber, .014)                  # semelle
        cube(cc - Vector((0, 0, .032)) + lat * sgn * .066, toe - heel, .004, .004, ln, goldl, .001)       # liseré doré
        # bras
        sphere(k['shoulder'], .064, suit2)
        limb(k['shoulder'], k['elbow'], .06, .05, suit)
        da = k['elbow'] - k['shoulder']; df = k['wrist'] - k['elbow']
        for t in (.85, .92, 1.0):
            torus(lerp(k['shoulder'], k['elbow'], t), da, .05, .006, suit3)
        wr = hand_wrist(k, lat, fwd, P.get('hands', 'open'))                                                # poignet réel : la barre passe au centre de l'arc des doigts
        limb(k['elbow'], wr, .048, .04, suit)
        ellipsoid(k['elbow'] - df.normalized() * .005, df, .05, .054, .05, suit2)
        cube(lerp(k['elbow'], wr, .5) + lat * sgn * .05, df, .004, .007, (wr - k['elbow']).length * .3, gold, .001)   # bande dorée (avant-bras)
        cube(lerp(k['shoulder'], k['elbow'], .5) + lat * sgn * .06, da, .004, .007, da.length * .3, gold, .001)   # bande dorée (bras)
        hand(k, sgn, lat, (suit2, suit3, gold, goldl), fwd, wr, P.get('hands', 'open'))

# ---------- scène ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'

world = bpy.data.worlds.new('w'); sc.world = world
world.use_nodes = True
# fond sombre pour la caméra, environnement plus clair pour les reflets du métal
nt = world.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
env = nt.nodes.new('ShaderNodeBackground'); env.inputs['Color'].default_value = lin('#243247'); env.inputs['Strength'].default_value = 1.1
dark = nt.nodes.new('ShaderNodeBackground'); dark.inputs['Color'].default_value = lin('#0a0e14'); dark.inputs['Strength'].default_value = 1.0
lp = nt.nodes.new('ShaderNodeLightPath'); mix = nt.nodes.new('ShaderNodeMixShader'); out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
nt.links.new(env.outputs['Background'], mix.inputs[1]); nt.links.new(dark.outputs['Background'], mix.inputs[2])
nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])

# sol
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.002))
fl = bpy.context.active_object; fl.data.materials.append(mat('#070a10', .9))

cam_data = bpy.data.cameras.new('c'); cam_data.lens = 75; cam_data.sensor_width = 36
cam = bpy.data.objects.new('c', cam_data); bpy.context.collection.objects.link(cam); sc.camera = cam

def light(name, kind, loc, energy, size, color, target):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    if kind == 'AREA': d.size = size
    o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (target - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o

import os
os.makedirs(OUT, exist_ok=True)
AZ, EL = math.radians(38), math.radians(11)

for ex in DATA:
    pts = [p for P in ex['poses'] for p in pose_points(P)]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    R = max((hi - lo).length / 2, .55) + .2
    fov = 2 * math.atan(18 / cam_data.lens)
    direction = Vector((math.sin(AZ) * math.cos(EL), -math.cos(AZ) * math.cos(EL), math.sin(EL)))
    cam_data.clip_start = .1; cam_data.clip_end = 80
    # cadrage automatique : le sujet (toutes les poses) remplit ~82 % du cadre, centré
    from bpy_extras.object_utils import world_to_camera_view
    target, dist = c.copy(), R / math.sin(fov / 2)
    for _ in range(5):
        cam.location = target + direction * dist
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(sc, cam, p) for p in pts]
        u0, u1 = min(q.x for q in uv), max(q.x for q in uv)
        v0, v1 = min(q.y for q in uv), max(q.y for q in uv)
        wworld = 2 * dist * math.tan(fov / 2)
        m = cam.matrix_world.to_3x3()
        target = target + m.col[0] * ((u0 + u1) / 2 - .5) * wworld + m.col[1] * ((v0 + v1) / 2 - .5) * wworld
        dist *= max(u1 - u0, v1 - v0) / 0.7
    # éclairage lié à la caméra : clé en haut à gauche, contre-jour doré, remplissage doux
    lights = [
        light('key', 'AREA', c + Vector((-1.6, -2.2, 2.6)), 430, 2.8, (1.0, .97, .93), c),
        light('rim', 'AREA', c + Vector((1.2, 2.2, 1.4)), 170 if STYLE != 'astro' else 150, 1.8, (1.0, .85, .5), c),
        light('rim2', 'AREA', c + Vector((-2.0, 1.8, 1.2)), 0 if STYLE != 'astro' else 110, 1.6, (1.0, .85, .5), c),
        light('fill', 'AREA', c + Vector((2.6, -1.6, .8)), 150, 3.2, (.62, .74, 1.0), c),
    ]
    for i, P in enumerate(ex['poses']):
        {'robot': build_robot, 'astro': build_astro}.get(STYLE, build_body)(P); equipment(P)
        sc.render.filepath = os.path.join(OUT, '%s-%d.png' % (ex['id'], i + 1))
        bpy.ops.render.render(write_still=True)
        clear()
        print('rendu', sc.render.filepath)
    for l in lights: bpy.data.objects.remove(l, do_unlink=True)
