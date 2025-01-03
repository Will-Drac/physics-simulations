export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rg32float, write>;

@compute @workgroup_size(5, 5, 5) fn placeParticle(
    @builtin (global_invocation_id) id: vec3u
){
    let i = vec2f(id.xy)-vec2f(2);

    const s = 0.25;

    let v = 1/(2*3.141592*s)*exp(-(i.x*i.x+i.y*i.y)/2*s);
    textureStore(outputTexture, vec2u(400, 400)+id.xy, vec4f(v, 0, 0, 0));
}

`