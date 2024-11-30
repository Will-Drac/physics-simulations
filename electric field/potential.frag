#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uWorld;
uniform vec2 uRes;

vec4 toBase256(float inputValue) {
    inputValue += 2147483648.; //256^4/2, this is to make negative numbers able to be encoded

    // Extract four base-256 digits from the floating-point input
    float digit1 = mod(inputValue, 256.0);
    float digit2 = mod(floor(inputValue / 256.0), 256.0);
    float digit3 = mod(floor(inputValue / (256.0 * 256.0)), 256.0);
    float digit4 = mod(floor(inputValue / (256.0 * 256.0 * 256.0)), 256.0);

    // Normalize the digits to the range [0, 1]
    digit1 /= 255.0;
    digit2 /= 255.0;
    digit3 /= 255.0;
    digit4 /= 255.0;

    return vec4(digit1, digit2, digit3, digit4);
}

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;
    float electricPotential = 0.;
    for (int i = 0; i < 800; i += 10) { //skip over a lot of the original image for performance
        for (int j = 0; j < 800; j += 10) {
            vec2 thisSamplePoint = vec2(float(i) / uRes.x, float(j) / uRes.y);
            vec4 thisSample = texture2D(uWorld, thisSamplePoint);
            if (!(thisSample.r == 0. && thisSample.b == 0.)) { //only continue the calculations if there's actually a charge there
                float distToSample = distance(uv, thisSamplePoint) / 100.; //dividing by 100 makes the whole thing 1cm x 1cm
                electricPotential += 10. * 10. * (thisSample.r / distToSample - thisSample.b / distToSample);
            }
        }
    }

    // gl_FragColor = signedIntToColor(int(electricPotential));
    gl_FragColor = toBase256(electricPotential);
}