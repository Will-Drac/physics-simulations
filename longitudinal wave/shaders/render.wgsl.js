export default /*wgsl*/ `

    struct vertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f
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
        output.texcoord = (xy + 1.)/2.;

        return output;
    }


    @group(0) @binding(0) var drawTexture: texture_2d<f32>;
    @group(0) @binding(1) var linearSampler: sampler;

    @fragment fn fs(fsInput:vertexShaderOutput)->@location(0)vec4f{
        return textureSample(drawTexture, linearSampler, fsInput.texcoord);
    }

`