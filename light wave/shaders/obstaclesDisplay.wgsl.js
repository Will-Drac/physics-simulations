export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var obstacleTexture: texture_2d<f32>;
@group(0) @binding(2) var boundariesTexture: texture_2d<f32>;

@compute @workgroup_size(1) fn obstaclesDisplay(
    @builtin(global_invocation_id) id: vec3u
) {
    var o = textureLoad(obstacleTexture, id.xy, 0);
    let b = textureLoad(boundariesTexture, id.xy, 0);

    let borderHighlight = min(1, 10*(abs(b.x) + abs(b.y)));

    let borderCol = vec4f(1, 0, 0, 1) * borderHighlight;

    o.a = round(o.a);

    if (borderHighlight == 0) {
        textureStore(outputTexture, id.xy, o);
    }
    else {
        textureStore(outputTexture, id.xy, borderCol);
    }

    // textureStore(outputTexture, id.xy, vec4f(b.x, b.y, 0, 1));
}

`