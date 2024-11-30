export default /*wgsl*/ `

@group(0) @binding(0) var <storage, read> points: array<vec2f>;
@group(0) @binding(1) var drawTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(1) fn drawPoints(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x;

    let thisPoint = points[i];
    textureStore(drawTexture, vec2u(thisPoint), vec4f(0, 0, 0.5, 1));
}

`