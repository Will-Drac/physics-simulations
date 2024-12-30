export default /*wgsl*/ `

const canvasSize = _CANVASSIZE;
const maxSpeakerPositions = _MAXSPEAKERPOSITIONS;

struct uniforms {
    time: f32,
}

@group(0) @binding(0) var<storage, read> speakerPositions: array<vec4f, maxSpeakerPositions>; 
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> u: uniforms;

const waveSpeed = _WAVESPEED.;

// v = ∆x/∆t => v∆t/∆x = 1
fn f(pos: vec4f, samplePos: vec2f) -> f32 {
    return waveSpeed * (u.time-pos[2]) / (distance(pos.xy, samplePos));
}

fn wave(theta: f32) -> f32 {
    return sin(2*3.141592*_FREQUENCY*theta);
}

fn mapRange(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return (value-inMin)/(inMax-inMin)*(outMax-outMin)+outMin;
}

struct RampColor {
    col: vec3f,
    pos: f32
}
fn colorRamp5(value: f32, colors: array<RampColor, 5>) -> vec3f {
    if (value < colors[0].pos) {return colors[0].col;}
    if (value > colors[4].pos) {return colors[4].col;}

    for (var i: i32 = 0; i < 4; i++) {
        let beforeColor = colors[i];
        let afterColor = colors[i+1];

        if (value >= beforeColor.pos && value <= afterColor.pos) {
            let t = (value-beforeColor.pos) / (afterColor.pos-beforeColor.pos);
            return mix(beforeColor.col, afterColor.col, t);
        }
    }

    return colors[4].col;
}

@compute @workgroup_size(maxSpeakerPositions, 1, 1) fn displayPressure(
    @builtin(workgroup_id) gid: vec3u,
    @builtin(local_invocation_id) iid: vec3u
) {
    let g = vec2f(gid.xy);
    let i = i32(iid.x);

    let vThis = speakerPositions[i];
    let vNext = speakerPositions[i+1];

    let fThis = f(vThis, g);
    let fNext = f(vNext, g);

    if (fThis >= 1 && fNext <= 1) {
        let midTime = mapRange(1, fThis, fNext, vThis[2], vNext[2]);
        let waveValue = wave(midTime);
        let c = colorRamp5(
            waveValue*0.85,
            array(
                RampColor(vec3f(0, 0, 0), -1),
                RampColor(vec3f(0.35, 0, 0.6), -0.2),
                RampColor(vec3f(1, 0, 0), 0.2),
                RampColor(vec3f(1, 1, 0), 0.6),
                RampColor(vec3f(1, 1, 1), 1)
            )
        );
        textureStore(outputTexture, gid.xy, vec4f(c, 1));
    }
}

`