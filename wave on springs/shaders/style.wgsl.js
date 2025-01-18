export default /*wgsl*/ `

struct waveUniforms {
    startValue: f32,
    tension: f32,
    massPerLength1: f32,
    massPerLength2: f32,
    transition: f32
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> u: waveUniforms;

const numPoints = _NUMPOINTS;
const padding = _SIDEPADDING;
const textureSize = _TEXTURESIZE;

fn nearEdge(pos: vec2i, radius: i32) -> bool {
    for (var i = -radius+1; i < radius; i++) {
        for (var j = -radius+1; j < radius; j++) {
            if (textureLoad(inputTexture, pos + vec2i(i, j), 0).r == 1) {
                return true;
            }
        }
    }

    return false;
}

@compute @workgroup_size(1) fn style(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = vec2i(id.xy);

    let v = textureLoad(inputTexture, i, 0).r;
    let vUp = textureLoad(inputTexture, i+vec2i(0, 1), 0).r;
    let vDown = textureLoad(inputTexture, i+vec2i(0, -1), 0).r;
    let vLeft = textureLoad(inputTexture, i+vec2i(-1, 0), 0).r;
    let vRight = textureLoad(inputTexture, i+vec2i(1, 0), 0).r;

    let hasEdge = min(v+vUp+vDown+vLeft+vRight, 1) == 1;

    var col = vec3f(22, 23, 24)/255;

    var firstThickness = 1;
    var secondThickness = 2;
    if (u.massPerLength1 > u.massPerLength2) {
        firstThickness = 2;
        secondThickness = 1;
    }
    else if (u.massPerLength1 == u.massPerLength2) {
        secondThickness = 1;
    }

    if((f32(i.x)-padding)/(textureSize.x-2*padding) < u.transition){
        if (nearEdge(i, firstThickness)) {
            col = vec3f(1, 1, 1);
        }
    }
    else {
        if (nearEdge(i, secondThickness)) {
            col = vec3f(1, 1, 1);
        }
    }

    textureStore(outputTexture, i, vec4f(col, 1));
}

`