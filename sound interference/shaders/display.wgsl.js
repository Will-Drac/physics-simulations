export default /*wgsl*/ `

@group(0) @binding(0) var waveTexture: texture_2d<f32>;
@group(0) @binding(1) var displayTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(1) fn display(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.xy;

    let v = textureLoad(waveTexture, i, 0).xy;

    textureStore(displayTexture, i, 0.75*vec4f(v.x, -v.x, 0, 0));
}

`