export default /*wgsl*/ `

const canvasSize = _CANVASSIZE;

struct uniforms {
    e1Pos: vec2f,
    e1PhaseOffset: f32,
    e1Amplitude: f32,
    e1Frequency: f32,

    e2Pos: vec2f,
    e2PhaseOffset: f32,
    e2Amplitude: f32,
    e2Frequency: f32,

    time: f32,
    canvasWidth: f32
}

const PI = 3.14159265358979;

@group(0) @binding(0) var<uniform> u: uniforms;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rg32float, write>;

@compute @workgroup_size(1) fn updateWave(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = vec2f(id.xy);

    let d1 = distance(i, u.e1Pos)*(u.canvasWidth/f32(canvasSize.x));
    let d2 = distance(i, u.e2Pos)*(u.canvasWidth/f32(canvasSize.x));

    let theta1 = 2*PI*u.e1Frequency*d1/343 - 2*PI*u.e1Frequency*u.time + u.e1PhaseOffset;
    let theta2 = 2*PI*u.e2Frequency*d2/343 - 2*PI*u.e2Frequency*u.time + u.e2PhaseOffset;

    textureStore(outputTexture, id.xy, vec4f(
        0.5*(sin(theta1) + sin(theta2)), //real component of the wave
        0.5*(cos(theta1) + cos(theta2)), //imaginary component of the wave
        0, 0
    ));

    //*same as above but featuring a drop off of sound intensity with distance to the emitter
    // textureStore(outputTexture, id.xy, vec4f(
    //     0.5*(sin(theta1)/(d1*d1) + sin(theta2)/(d2*d2)), //real component of the wave
    //     0.5*(cos(theta1)/(d1*d1) + cos(theta2)/(d2*d2)), //imaginary component of the wave,
    //     0, 0
    // ));
}

`

/*

θ = (kx - ωt + φ) | k = 2π/λ , ω = 2πf , v = 343m/s = λf

=> θ = (2πf/343x - 2πf + φ)

*/