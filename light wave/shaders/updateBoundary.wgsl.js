export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_3d<rg32float, write>;
@group(0) @binding(1) var lastTexture: texture_3d<f32>;
@group(0) @binding(2) var boundaryTexture: texture_2d<f32>;
@group(0) @binding(3) var obstaclesTexture: texture_2d<f32>;

_NUMWAVELENGTHS

const c = 299792458.;
const dt = 0.000000000004;
const ds = 0.003; //the spacing between each pixel


fn modulo(x: f32, y: f32) -> f32 {
    return x - y * floor(x/y);
}


fn bilinearInterpolation(samplePos: vec2f, topLeft: vec2f, topRight: vec2f, bottomLeft: vec2f, bottomRight: vec2f) -> vec2f {
    let top = (1-samplePos.x)*topLeft + samplePos.x*topRight;
    let bottom = (1-samplePos.x)*bottomLeft + samplePos.x*bottomRight;

    return (1-samplePos.y)*top + samplePos.y*bottom;
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

// need to min this with 1 maybe
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

fn reflectionSpectrum(color: vec3f, wavelength: f32) -> f32 {
    let hsv = rgbToHsv(color);
    let mainWavelength = hueToWavelength(hsv.x);

    return hsv.z * min(f2((wavelength-mainWavelength)/300, saturationToSpectrumStretch(hsv.y)), 1);
}

@compute @workgroup_size(1) fn updateBoundaries(
    @builtin(global_invocation_id) id: vec3u
) {
    let b = textureLoad(boundaryTexture, id.xy, 0).xy;

    if (b.x != 0 || b.y != 0) { //this is an boundary, so do stuff on it
        let o = textureLoad(obstaclesTexture, id.xy, 0);
        let l = textureLoad(lastTexture, id.xyz, 0);

        let lastValue = textureLoad(lastTexture, id.xyz, 0).xy;

        let newSamplePos = vec3f(id.xyz) + vec3f(b.x, b.y, 0);
        let topLeft = vec3u(u32(floor(newSamplePos.x)), u32(ceil(newSamplePos.y)), id.z);
        let topRight = vec3u(u32(ceil(newSamplePos.x)), u32(ceil(newSamplePos.y)), id.z);
        let bottomLeft = vec3u(u32(floor(newSamplePos.x)), u32(floor(newSamplePos.y)), id.z);
        let bottomRight = vec3u(u32(ceil(newSamplePos.x)), u32(floor(newSamplePos.y)), id.z);

        var b1 = b;
        if (b.x < 0) {b1.x += 1;}
        if (b.y < 0) {b1.y += 1;}

        let sampleValue = bilinearInterpolation(
            b1,
            textureLoad(lastTexture, topLeft, 0).rg,
            textureLoad(lastTexture, topRight, 0).rg,
            textureLoad(lastTexture, bottomLeft, 0).rg,
            textureLoad(lastTexture, bottomRight, 0).rg,
        );

        // gradient of the wave in the direction of the boundary's normal
        let normalGradient = (lastValue-sampleValue)/ds;

        let absorbingValue = -c*dt*normalGradient + lastValue;
        let reflectingValue = vec2f(0);



        let thisBoundaryColor = textureLoad(obstaclesTexture, id.xy, 0).rgb;
        let thisWavelength = (700-400)*(f32(id.z)+.5)/numWavelengths+400;

        let reflectionAmount = reflectionSpectrum(thisBoundaryColor, thisWavelength);



        textureStore(outputTexture, id.xyz, vec4f(
            (1-reflectionAmount)*absorbingValue + reflectionAmount*reflectingValue,
        0, 0));
    }
}

`