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

@group(0) @binding(0) var displayTexture: texture_2d<f32>;
@group(0) @binding(1) var drawPointsTexture: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

@fragment fn render(i: vertexShaderOutput) -> @location(0) vec4f {
    return textureSample(displayTexture, linearSampler, i.uv) + 0.5*textureSample(drawPointsTexture, linearSampler, i.uv);
}

`