export default /*wgsl*/ `

struct waveControls {
    wavelength: f32,
    period: f32,
    amplitude: f32
}

const PI = 3.1415926535;

@group(0) @binding(0) var<storage, read> origins: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> positions: array<vec2f>;
@group(0) @binding(2) var<uniform> time: f32;
@group(0) @binding(3) var<uniform> wc: waveControls;

@compute @workgroup_size(1) fn wiggle(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x;

    let k = 2*PI/wc.wavelength;
    let omega = 2*PI/wc.period;

    let v = sin(k*f32(origins[i].x) - omega*time);

    positions[i].x = wc.amplitude * v + origins[i].x;
}

`