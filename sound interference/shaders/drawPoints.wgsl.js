export default /*wgsl*/ `

const numPointsSqrt = _NUMPOINTSSQRT;

@group(0) @binding(0) var<storage, read> points: array<vec2f>;
@group(0) @binding(1) var drawPointsTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(1) fn drawPoints(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x * numPointsSqrt + id.y;

    let thisPoint = points[i];

    textureStore(drawPointsTexture, vec2u(thisPoint), vec4f(1, 1, 1, 1));
}

`