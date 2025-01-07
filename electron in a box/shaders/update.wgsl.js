export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rg32float, write>;
@group(0) @binding(1) var lastTexture: texture_2d<f32>;

const Dt = 0.000000001;
const hbar = 1.054e-34;
const me = 9.109383e-31;
const Ds = 0.00001;

fn multImaginary(v: vec2f) -> vec2f {
    return vec2f(-v.y, v.x);
}

fn V(pos: vec2f) -> f32 {
    // return 0.00000000000002*pos.y;
    return 0;
}

@compute @workgroup_size(1) fn updateWave(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = vec2i(id.xy);

    let lastW = textureLoad(lastTexture, i, 0).xy;
    let rightW = textureLoad(lastTexture, i+vec2i(1, 0), 0).xy;
    let leftW = textureLoad(lastTexture, i+vec2i(-1, 0), 0).xy;
    let upW = textureLoad(lastTexture, i+vec2i(0, 1), 0).xy;
    let downW = textureLoad(lastTexture, i+vec2i(0, -1), 0).xy;

    let W = Dt*multImaginary(hbar/(2*me)*((rightW-2*lastW+leftW)/(Ds*Ds) + (upW-2*lastW+downW)/(Ds*Ds)) - 1/hbar*V(vec2f(i))*lastW) + lastW;

    textureStore(outputTexture, id.xy, vec4f(
        W.x,
        W.y,
        0, 0
    ));
}

`