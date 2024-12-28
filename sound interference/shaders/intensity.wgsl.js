export default /*wgsl*/ `

@group(0) @binding(0) var pressureTexture: texture_2d<f32>;
@group(0) @binding(1) var intensityTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(1) fn intensity(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.xy;

    let pressure = textureLoad(pressureTexture, i, 0).xy;

    let intensity = pressure.x*pressure.x + pressure.y*pressure.y;

    textureStore(intensityTexture, i, vec4f(vec3f(intensity), 1));
}

`