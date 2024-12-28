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

struct uniforms {
    renderMode: i32
}


@group(0) @binding(0) var pressureTexture: texture_2d<f32>;
@group(0) @binding(1) var drawPointsTexture: texture_2d<f32>;
@group(0) @binding(2) var intensityTexture: texture_2d<f32>;
@group(0) @binding(3) var iconsTexture: texture_2d<f32>;
@group(0) @binding(4) var linearSampler: sampler;
@group(0) @binding(5) var<uniform> u: uniforms;

fn alphaMix(colTop: vec4f, colBottom: vec4f) -> vec4f {
    return colTop.a * colTop + (1-colTop.a) * colBottom;
}

@fragment fn render(i: vertexShaderOutput) -> @location(0) vec4f {
    let pressure = textureSample(pressureTexture, linearSampler, i.uv);
    let particles = textureSample(drawPointsTexture, linearSampler, i.uv);
    let intensity = textureSample(intensityTexture, linearSampler, i.uv);
    let icons = textureSample(iconsTexture, linearSampler, i.uv);

    if (u.renderMode == 0) {
        return alphaMix(icons, pressure);
    }
    else if (u.renderMode == 1) {
        return alphaMix(icons, particles + vec4f(0, 0, 0.2, 1));
    }
    else if (u.renderMode == 2) {
        if (particles.r == 1) {
            return alphaMix(icons, 1-pressure);
        }
        else {
            return alphaMix(icons, pressure);
        }
    }
    else if (u.renderMode == 3) {
        return alphaMix(icons, intensity);
    }
    return vec4f(0);
}

`