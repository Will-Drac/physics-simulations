export default /*wgsl*/ `

struct vertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f
};

@vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
) -> vertexShaderOutput {
    let pos = array( //two triangles making a quad that covers the whole screen
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),

        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0)
    );

    var output: vertexShaderOutput;
    let xy = pos[vertexIndex];
    output.position = vec4f(xy, 0.0, 1.0);
    output.uv = (xy + 1.)/2.;
    output.uv.y = 1-output.uv.y;

    return output;
};


@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var pressureTexture: texture_2d<f32>;
@group(0) @binding(2) var iconsTexture: texture_2d<f32>;

fn alphaMix(colTop: vec4f, colBottom: vec4f) -> vec4f {
    return colTop.a * colTop + (1-colTop.a) * colBottom;
}

@fragment fn render(i: vertexShaderOutput) -> @location(0) vec4f {
    let pressure = textureSample(pressureTexture, linearSampler, i.uv);
    let icons = textureSample(iconsTexture, linearSampler, i.uv);

    return alphaMix(icons, pressure);
}

`