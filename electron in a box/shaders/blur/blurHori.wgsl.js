export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rg32float, write>;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

const R = _BLURRAD;

fn sampleWeights(x: i32, r:i32) -> f32{
    return 0.9394 * (powInt(f32(x) / f32(r+1), 4) - 2. * powInt(f32(x) / f32(r+1), 2) + 1.) / f32(r+1);
}

fn powInt(x:f32, y:u32)->f32{
    var z = 1.;
    for (var i = u32(0); i < y; i++){
        z *= x;
    }
    return z;
}

@compute @workgroup_size(1) fn blur(
    @builtin (global_invocation_id) id: vec3u
) {
    let i = vec2i(id.xy);

    var avg = vec2f(0);

    for (var j = -R; j <= R; j++) {
        avg += sampleWeights(j, R) * textureLoad(inputTexture, i+vec2i(j, 0), 0).xy;
    }

    avg = 0.99*textureLoad(inputTexture, i, 0).xy + 0.01*avg;

    textureStore(outputTexture, i, vec4f(avg.x, avg.y, 0, 0));
}

`