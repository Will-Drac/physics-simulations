#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uField;
uniform float uTime;

const float PI = 3.1415926535;

float fromBase256(vec3 base256) {
    vec3 b = base256 * 255.; //bring it back to its original [0-256] instead of [0-1]
    return b.x + b.y * 256. + b.z * 256. * 256.;
}

vec2 channelToVec2(float channel) {
    float angle = channel * 2. * PI;

    return vec2(sin(angle), -cos(angle));
}

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;

    vec4 textureValue = texture2D(uField, uv);
    vec2 field = fromBase256(textureValue.gba) * channelToVec2(textureValue.r);

    // gl_FragColor = vec4(vec2(abs(field)) / 10000000., 0., 1.);
    gl_FragColor = vec4(vec3(fromBase256(textureValue.gba)) / 5000000., 1.);
}