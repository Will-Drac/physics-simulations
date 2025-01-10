export default /*wgsl*/ `

@group(0) @binding(0) var outputTexture: texture_storage_2d<rg32float, write>;
@group(0) @binding(1) var obstaclesTexture: texture_2d<f32>;

@compute @workgroup_size(1) fn getBoundaries(
    @builtin(global_invocation_id) id: vec3u
) {
    let dim = textureDimensions(obstaclesTexture);

    let rightVal = textureLoad(obstaclesTexture, id.xy + vec2u(1, 0), 0);
    let upVal = textureLoad(obstaclesTexture, id.xy + vec2u(0, 1), 0);
    let thisVal = textureLoad(obstaclesTexture, id.xy, 0);

    if (id.x == 0) {
        textureStore(outputTexture, id.xy, vec4f(1, 0, 0, 0));
    }
    else if (id.x == dim.x-1) {
        textureStore(outputTexture, id.xy, vec4f(-1, 0, 0, 0));
    }
    else if (id.y == 0) {
        textureStore(outputTexture, id.xy, vec4f(0, 1, 0, 0));
    }
    else if (id.y == dim.y-1) {
        textureStore(outputTexture, id.xy, vec4f(0, -1, 0, 0));
    }

    else if ( // if this texel is on an edge
        (rightVal.a > 0.5 && thisVal.a < 0.5) ||
        (rightVal.a < 0.5 && thisVal.a > 0.5) ||
        (upVal.a > 0.5 && thisVal.a < 0.5) ||
        (upVal.a < 0.5 && thisVal.a > 0.5)
    ) {
        let gradient = vec2f(
            thisVal.a - rightVal.a,
            thisVal.a - upVal.a
        );

        textureStore(outputTexture, id.xy, vec4f(normalize(gradient), 0, 0));
    }
}

`