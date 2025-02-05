export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var waveTexture: texture_2d<f32>;


// tone mapping
fn f(x: f32) -> f32 {
    return x/(x+1);
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

@compute @workgroup_size(1) fn displayWave(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = vec2f(id.xy);

    let w = textureLoad(waveTexture, id.xy, 0).xy;

    let I = w.x*w.x+w.y*w.y;

    // textureStore(outputTexture, id.xy, vec4f(10*w.x, 10*w.y, 0, 1));

    textureStore(outputTexture, id.xy,
        vec4f(
            colorRamp5(
                15*f(I),
                array(
                    RampColor(vec3f(0, 0, 0), 0),
                    RampColor(vec3f(0.35, 0, 0.6), 0.4),
                    RampColor(vec3f(1, 0, 0), 0.6),
                    RampColor(vec3f(1, 1, 0), 0.8),
                    RampColor(vec3f(1, 1, 1), 1)
                )
            ),
            1
        )
    );

}

`