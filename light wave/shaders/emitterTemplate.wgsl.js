export default /*wgsl*/ `

struct uniforms {
    time: f32
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

    let thisPos = vec3u(vec3f(_DIRVEC, 0) * (f32(id.x - _SIZE))) + vec3u(_POS, id.z);
    let brightnessPerPixel = 1 / (2*f32(_SIZE) + 1); //!why is this not right
    // * make it emit at different intensity depending on the colour of the emitter and the wavelength
    textureStore(outputTexture, thisPos, brightnessPerPixel*vec4f(sin(theta), cos(theta), 0, 0));
}

`

//! not done at all for now
// what do you do about directional emitters, that require so many pixels