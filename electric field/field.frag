#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uWorld;
uniform vec2 uRes;

const float PI = 3.1415926535;

// vec3 this time, because the first colour channel will be for angle
// also not signed this time
vec3 toBase256(float inputValue) {
    // Extract four base-256 digits from the floating-point input
    float digit1 = mod(inputValue, 256.0);
    float digit2 = mod(floor(inputValue / 256.0), 256.0);
    float digit3 = mod(floor(inputValue / (256.0 * 256.0)), 256.0);

    // Normalize the digits to the range [0, 1]
    digit1 /= 255.0;
    digit2 /= 255.0;
    digit3 /= 255.0;

    return vec3(digit1, digit2, digit3);
}

float vec2AngleToChannel(vec2 vector) {
    if (vector.x > 0.) {
        return (atan(vector.y / vector.x) + PI / 2.) / (2. * PI);
    } else {
        return (atan(vector.y / vector.x) + PI / 2. + PI) / (2. * PI);
    }

}

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;
    vec2 field = vec2(0.);
    for (int i = 0; i < 800; i += 10) { //skip over a lot of the original image for performance
        for (int j = 0; j < 800; j += 10) {

            vec2 thisSamplePoint = vec2(float(i) / uRes.x, float(j) / uRes.y);
            vec4 thisSample = texture2D(uWorld, thisSamplePoint);

            if (!(thisSample.r == 0. && thisSample.b == 0.)) { //only continue the calculations if there's actually a charge there

                vec2 chargeDirection = normalize(uv - thisSamplePoint);
                float distToSample = distance(uv, thisSamplePoint) / 100.; //dividing by 100 makes the whole thing 1cm x 1cm

                field += 10. * 10. * ((thisSample.r - thisSample.b) / pow(distToSample, 2.)) * chargeDirection; //k*(q/r^2) * [direction vector]
            }
        }
    }

    // the angle of the vector is the first channel, it's length is the other 3
    gl_FragColor = vec4(vec2AngleToChannel(field), toBase256(length(field) / 5000.)); //the magnitude needs to be divided or else it will overflow the bits it has and look awful
}