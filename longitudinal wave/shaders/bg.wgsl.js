export default /*wgsl*/ `

struct waveControls {
    wavelength: f32,
    period: f32,
    amplitude: f32
}

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> wc: waveControls;
@group(0) @binding(2) var drawTexture: texture_storage_2d<rgba8unorm, write>;

const PI = 3.1415926535;

@compute @workgroup_size(1) fn wiggle(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.xy;

    let k = 2*PI/wc.wavelength;
    let omega = 2*PI/wc.period;

    let v = sin(k*f32(i.x) - omega*time + PI/2);
    let v2 = 0.5*(0.5*v+1);
    textureStore(
        drawTexture,
        i,
        vec4f(v2)
    );
}

`