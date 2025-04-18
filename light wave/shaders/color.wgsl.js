export default /*wgsl*/ `

struct uniforms {
    brightness: f32
}

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var waveTexture: texture_3d<f32>;
@group(0) @binding(2) var<uniform> u: uniforms;

_NUMWAVELENGTHS

fn smoothTransition(v: f32) -> f32 {
    return -2*v*v*v + 3*v*v;
}

fn smoothMix(v: f32, a: f32, b: f32) -> f32 {
    return (1-smoothTransition(v))*a + smoothTransition(v)*b;
}

fn smoothInterpolatePoints(x: f32, p: array<vec2f, 8>) -> f32 {
    for (var i = 0; i < 7; i++) {
        if (p[i].x <= x && x < p[i+1].x) {
            return smoothMix(
                (x-p[i].x) / (p[i+1].x-p[i].x),
                p[i].y,
                p[i+1].y
            );
        }
    }

    return 0;
}

fn wavelengthToRgb(wavelength: f32) -> vec3f {
    let r = array<vec2f, 8>(
        vec2f(375, 0), vec2f(400, 143), vec2f(460, 1), vec2f(500, 0), vec2f(540, 33), vec2f(600, 226), vec2f(670, 252), vec2f(725, 0)
    );

    let g = array<vec2f, 8>(
        vec2f(375, 0), vec2f(450, 0), vec2f(500, 248), vec2f(530, 255), vec2f(700, 0), vec2f(725, 0), vec2f(725, 0), vec2f(725, 0)
    );

    let b = array<vec2f, 8>(
        vec2f(375, 0), vec2f(400, 99), vec2f(460, 255), vec2f(480, 255), vec2f(530, 0), vec2f(670, 2), vec2f(700, 16), vec2f(725, 0)
    );

    return vec3f(
        smoothInterpolatePoints(wavelength, r),
        smoothInterpolatePoints(wavelength, g),
        smoothInterpolatePoints(wavelength, b)
    ) / 255;
}



fn f(x: f32) -> f32 {
    return x/(x+1);
}

fn tonemap(col: vec3f) -> vec3f {
    return vec3f(
        f(col.r),
        f(col.g),
        f(col.b)
    );
}

fn ACES(col: vec3f) -> vec3f {
    return (col*(2.51*col+0.03))/(col*(2.42*col+0.59)+0.14);
}



@compute @workgroup_size(1) fn getIntensity(
    @builtin(global_invocation_id) id:vec3u
) {
    let i = id.xy;
    var col = vec3f(0);
    for (var j = u32(0); j < numWavelengths; j++) {
        let thisWavelength = (700-400)*(f32(j)+.5)/numWavelengths+400;
        let thisColor = wavelengthToRgb(thisWavelength);
        let wave = textureLoad(waveTexture, vec3u(i, j), 0).rg;
        let intensity = wave.r*wave.r+wave.g*wave.g;
        col += u.brightness * intensity * thisColor / numWavelengths;
    }

    textureStore(outputTexture, i, vec4f(ACES(col), 1));
}

`