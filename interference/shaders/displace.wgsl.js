export default /*wgsl*/ `

const canvasSize = _CANVASSIZE;
const numPointsSqrt = _NUMPOINTSSQRT;

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

@group(0) @binding(0) var<storage, read> origins: array<vec2f>;
@group(0) @binding(1) var<uniform> u: uniforms;
@group(0) @binding(2) var<storage, read_write> positions: array<vec2f>;

@compute @workgroup_size(1) fn displace(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x * numPointsSqrt + id.y;

    let origin = origins[i];

    let s = (u.canvasWidth/f32(canvasSize.x));

    let d1 = distance(origin, u.e1Pos)*s;
    let d2 = distance(origin, u.e2Pos)*s;

    let dir1 = normalize(origin-u.e1Pos);
    let dir2 = normalize(origin-u.e2Pos);

    let theta1 = 2*PI*u.e1Frequency*d1/343 - 2*PI*u.e1Frequency*u.time + u.e1PhaseOffset;
    let theta2 = 2*PI*u.e2Frequency*d2/343 - 2*PI*u.e2Frequency*u.time + u.e2PhaseOffset;

    let displacement1 = u.e1Amplitude / s * dir1 * u.e1Amplitude * sin(theta1);
    let displacement2 = u.e2Amplitude / s * dir2 * u.e2Amplitude * sin(theta2);

    positions[i] = origin + displacement1 + displacement2;
}

`