export default /*wgsl*/ `

@group(0) @binding(0) var waveTexture: texture_2d<f32>;
@group(0) @binding(1) var displayTexture: texture_storage_2d<rgba8unorm, write>;

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

@compute @workgroup_size(1) fn display(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.xy;

    let v = -textureLoad(waveTexture, i, 0).xy;

    let c = colorRamp5(
        v.x,
        array(
            RampColor(vec3f(0, 0, 0), -1),
            RampColor(vec3f(0.35, 0, 0.6), -0.2),
            RampColor(vec3f(1, 0, 0), 0.2),
            RampColor(vec3f(1, 1, 0), 0.6),
            RampColor(vec3f(1, 1, 1), 1)
        )
    );

    textureStore(displayTexture, i, vec4f(c, 1));
}

`