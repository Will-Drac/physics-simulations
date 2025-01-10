export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_3d<rg32float, write>;
@group(0) @binding(1) var lastTexture: texture_3d<f32>;
@group(0) @binding(2) var boundaryTexture: texture_2d<f32>;
@group(0) @binding(3) var obstaclesTexture: texture_2d<f32>;

const c = 299792458.;
const dt = 0.000000000004;
const ds = 0.003; //the spacing between each pixel

fn bilinearInterpolation(samplePos: vec2f, topLeft: vec2f, topRight: vec2f, bottomLeft: vec2f, bottomRight: vec2f) -> vec2f {
    let top = (1-samplePos.x)*topLeft + samplePos.x*topRight;
    let bottom = (1-samplePos.x)*bottomLeft + samplePos.x*bottomRight;

    return (1-samplePos.y)*top + samplePos.y*bottom;
}

@compute @workgroup_size(1) fn updateBoundaries(
    @builtin(global_invocation_id) id: vec3u
) {
    let b = textureLoad(boundaryTexture, id.xy, 0).xy;

    if (b.x != 0 || b.y != 0) { //this is an boundary, so do stuff on it
        let o = textureLoad(obstaclesTexture, id.xy, 0);
        let l = textureLoad(lastTexture, id.xyz, 0);

        let lastValue = textureLoad(lastTexture, id.xyz, 0).xy;

        let newSamplePos = vec3f(id.xyz) + vec3f(b.x, b.y, 0);
        let topLeft = vec3u(u32(floor(newSamplePos.x)), u32(ceil(newSamplePos.y)), id.z);
        let topRight = vec3u(u32(ceil(newSamplePos.x)), u32(ceil(newSamplePos.y)), id.z);
        let bottomLeft = vec3u(u32(floor(newSamplePos.x)), u32(floor(newSamplePos.y)), id.z);
        let bottomRight = vec3u(u32(ceil(newSamplePos.x)), u32(floor(newSamplePos.y)), id.z);

        var b1 = b;
        if (b.x < 0) {b1.x += 1;}
        if (b.y < 0) {b1.y += 1;}

        let sampleValue = bilinearInterpolation(
            b1,
            textureLoad(lastTexture, topLeft, 0).rg,
            textureLoad(lastTexture, topRight, 0).rg,
            textureLoad(lastTexture, bottomLeft, 0).rg,
            textureLoad(lastTexture, bottomRight, 0).rg,
        );

        // gradient of the wave in the direction of the boundary's normal
        let normalGradient = (lastValue-sampleValue )/ds;

        let newValue = -c*dt*normalGradient + lastValue;

        textureStore(outputTexture, id.xyz, vec4f(newValue, 0, 0));
    }
}

`