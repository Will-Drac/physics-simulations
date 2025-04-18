export default /*wgsl*/ `

@group(0) @binding(0) var<storage, read> points: array<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

const numPoints = _NUMPOINTS;
const textureSize = _TEXTURESIZE;
const sidePadding = _SIDEPADDING;

fn indexToX(index: u32) -> f32 {
    return f32(index) * f32(textureSize.x-2*sidePadding)/numPoints + sidePadding;
}

@compute @workgroup_size(1) fn drawSpring(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x;

    let i1 = 2 * i;
    let i2 = 2 * (i + 1);

    let point1 = vec2f(indexToX(i1), points[i1]);
    let point2 = vec2f(indexToX(i2), points[i2]);

    let thisToNext = point2 - point1;

    for (var j = 0.; j < length(thisToNext); j += 1.) {
        let drawPos = point1 + j*normalize(thisToNext);
        textureStore(outputTexture, vec2i(drawPos)+vec2i(0, i32(textureSize.y/2)), vec4f(1));
    }
}

`