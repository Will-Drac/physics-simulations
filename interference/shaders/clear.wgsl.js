export default /*wgsl*/ `

@group(0) @binding(0) var texture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(1) fn clear(
    @builtin(global_invocation_id) id:vec3u
) {
    textureStore(texture, id.xy, vec4f(0));
}

`