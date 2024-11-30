#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uPotential;

float base256ToFloat(vec4 base256) {
    vec4 b = base256 * 255.; //bring it back to its original [0-256] instead of [0-1]
    float val = b.x + b.y * 256. + b.z * 256. * 256. + b.w * 256. * 256. * 256.;
    return val - 2147483648.; //to get negative numbers back
}

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;

    float decodedPotential = base256ToFloat(texture2D(uPotential, uv));

    gl_FragColor = vec4(decodedPotential / 5000000., 0., -decodedPotential / 5000000., 1.);
}