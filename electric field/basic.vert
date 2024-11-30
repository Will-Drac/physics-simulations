#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 aPosition;
attribute vec2 aTexCoord;

// set up a varying so that the texture coordinate can be passed to the fragment shader
varying vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;

    vec4 positionVec4 = vec4(aPosition, 1.);

    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;

    gl_Position = positionVec4;
}