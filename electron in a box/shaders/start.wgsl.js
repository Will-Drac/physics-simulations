export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rg32float, write>;

const PI = 3.14159;

fn multImaginary(v: vec2f) -> vec2f {
    return vec2f(-v.y, v.x);
}

@compute @workgroup_size(1) fn placeParticle(
    @builtin (global_invocation_id) id: vec3u
){
    let i = vec2f(id.xy);
    let S = vec2f(textureDimensions(outputTexture));

    let M = exp(-((i.y - S.y / 2.0) * (i.y - S.y / 2.0)) / 1000.0) * exp(-(((i.x - S.x / 2.0 - S.x / 4.0 - S.x / 8.0) * (i.x - S.x / 2.0 - S.x / 4.0 - S.x / 8.0)) / 1000.0));

    let v = vec2f(
        M * sin((60.0 * PI * i.x) / S.x),
        - M * cos((60.0 * PI * i.x) / S.x + PI)
    );

    textureStore(outputTexture, id.xy, vec4f(v, 0, 0));

    // math.exp(-(((y-ymax/2)**2))/1000)*math.exp(-(((x-xmax/2-xmax/4-xmax/8)**2))/1000)*(math.sin((60*math.pi*x)/(xmax)) -1j*math.cos((60*math.pi*(x))/(xmax)+math.pi))
}

`