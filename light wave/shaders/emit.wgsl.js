export default /*wgsl*/ `

struct emitter {
    kind: i32, //0: nothing, 1: point, 2: directional
    posOrDir: vec2f,
    col: vec3f
}

struct uniforms {
    time: f32,
    emitters: array<emitter, 5>
}

@group(0) @binding(0) var outputTexture: texture_storage_3d<rg32float, write>;
@group(0) @binding(1) var iorTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: uniforms;

_NUMWAVELENGTHS

const c = 299792458.;
const dt = 0.000000000004;

@compute @workgroup_size(1) fn emit(
    @builtin(global_invocation_id) id:vec3u
) {
    let ior = textureLoad(iorTexture, id.xy, 0).r;

    let wavelength = ((700-400)*(f32(id.z)+.5)/numWavelengths+400)*0.00009;
    let frequency = c / (wavelength*ior);
    let t = u.time * dt;
    let theta = u.time * dt * 6.28 * frequency; //gives the wave the wavelength i want
    textureStore(outputTexture, vec3u(id.x, 2*id.x, id.z)+vec3u(300, 1, 0), vec4f(sin(theta), cos(theta), 0, 0));
}

`

//! not done at all for now
// what do you do about directional emitters, that require so many pixels