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


fn modulo(x: f32, y: f32) -> f32 {
    return x - y * floor(x/y);
}

fn rgbToHsv(color: vec3f) -> vec3f {
    let r = color.x;
    let g = color.y;
    let b = color.z;

    let max = max(max(r, g), b);
    let min = min(min(r, g), b);
    let delta = max - min;

    var h = 0.0;
    if (delta != 0.0) {
        if (max == r) {
            h = (g - b) / delta;
        } else if (max == g) {
            h = 2.0 + (b - r) / delta;
        } else {
            h = 4.0 + (r - g) / delta;
        }
        h = modulo((h * 60.0), 360);
        if (h < 0.0) {
            h += 360.0;
        }
    }

    var s = 0.0;
    if (max != 0.0) {
        s = delta / max;
    }
    let v = max;

    return vec3f(h, s, v);
}


fn f1(x: f32) -> f32 {
    if (-1 < x && x < 1) {
        return x*x*x*x - 2*x*x +1;
    }
    else {
        return 0;
    }
}

fn f2(x: f32, d: f32) -> f32 {
    let F = f1(2*d*modulo(x-0.5, 1) - d);
    if (d<1) {
        return 1/(0.2*d*d*d*d-2/3*d*d+1) * F;
    }
    else {
        return 15*d/8 * F;
    }
}

fn hueToWavelength(x: f32) -> f32 {
    return -4.2869740681845535e-10*x*x*x*x*x + 4.698813090535953e-7*x*x*x*x - 0.00019363276122179643*x*x*x + 0.03672601180984415*x*x - 3.766646240393876*x + 700;
}

fn saturationToSpectrumStretch(sat: f32) -> f32 {
    return pow(sat/0.7, 8.6) + sat/0.7;
}

// how much of this wavelength is emitted considering the color of the emitter
fn emissionSpectrum(color: vec3f, wavelength: f32) -> f32 {
    let hsv = rgbToHsv(color);
    let mainWavelength = hueToWavelength(hsv.x);

    return hsv.z * f2((wavelength-mainWavelength)/300, saturationToSpectrumStretch(hsv.y));
}

@compute @workgroup_size(1) fn emit(
    @builtin(global_invocation_id) id:vec3u
) {
    let ior = textureLoad(iorTexture, id.xy, 0).r;

    let wavelength = ((700-400)*(f32(id.z)+.5)/numWavelengths+400)*0.00009;
    let frequency = c / (wavelength*ior);
    let t = u.time * dt;
    let theta = u.time * dt * 6.28 * frequency; //gives the wave the wavelength i want

    let thisPos = vec3i(vec3f(_DIRVEC, 0) * (f32(id.x) - f32(_SIZE))) + vec3i(_POS, i32(id.z));
    let brightnessPerPixel = 2 / (f32(_SIZE) + 1); //!why is this not right

    let wavelengthEmissionAmount = emissionSpectrum(_COL, (700-400)*(f32(id.z)+.5)/numWavelengths+400);

    textureStore(outputTexture, thisPos, brightnessPerPixel*wavelengthEmissionAmount*vec4f(sin(theta), cos(theta), 0, 0));
}

`