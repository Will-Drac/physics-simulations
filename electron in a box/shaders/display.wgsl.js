export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var waveTexture: texture_2d<f32>;


fn f(x: f32) -> f32 {
    return x/(x+1);
}

@compute @workgroup_size(1) fn displayWave(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = vec2f(id.xy);

    let w = textureLoad(waveTexture, id.xy, 0).xy;

    let I = w.x*w.x+w.y*w.y;

    textureStore(outputTexture, id.xy, vec4f(10*w.x, 10*w.y, 0, 1));
    // textureStore(outputTexture, id.xy, vec4f(f(I)));
}

`