#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uCharges;
uniform vec2 uRes;

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;

    vec4 chargesColor = texture2D(uCharges, uv);

    if (chargesColor.a != 1.) {
        if (texture2D(uCharges, (uv * uRes + vec2(1., 0.)) / uRes).a != 0. ||
            texture2D(uCharges, (uv * uRes + vec2(-1., 0.)) / uRes).a != 0. ||
            texture2D(uCharges, (uv * uRes + vec2(0., 1.)) / uRes).a != 0. ||
            texture2D(uCharges, (uv * uRes + vec2(0., -1.)) / uRes).a != 0.) {
            gl_FragColor = vec4(1.0);
        } else {
            gl_FragColor = vec4(0., 0., 0., 1.);
        }
    } else {
        gl_FragColor = vec4(0., 0., 0., 1.);
    }
}