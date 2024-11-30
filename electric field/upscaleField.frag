#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uField;
uniform vec2 uOriginalRes;

const float PI = 3.1415926535;

float fromBase256(vec3 base256) {
    vec3 b = base256 * 255.; //bring it back to its original [0-256] instead of [0-1]
    return b.x + b.y * 256. + b.z * 256. * 256.;
}

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

vec2 channelToVec2(float channel) {
    float angle = channel * 2. * PI;

    return vec2(sin(angle), -cos(angle));
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

    // getting the four nearest pixels in the original buffer
    vec2 p = uv * uOriginalRes; //pixel on the original image
    vec2 topLeftS = vec2(floor(p.x), floor(p.y)) + 0.5;
    vec2 topRightS = vec2(ceil(p.x), floor(p.y)) + 0.5;
    vec2 bottomLeftS = vec2(floor(p.x), ceil(p.y)) + 0.5;
    vec2 bottomRightS = vec2(ceil(p.x), ceil(p.y)) + 0.5;

    // pulling their values out of the texture
    vec4 topLeftVal = texture2D(uField, topLeftS / uOriginalRes);
    vec4 topRightVal = texture2D(uField, topRightS / uOriginalRes);
    vec4 bottomLeftVal = texture2D(uField, bottomLeftS / uOriginalRes);
    vec4 bottomRightVal = texture2D(uField, bottomRightS / uOriginalRes);

    // getting the unit vector pointing in the direction of the field
    vec2 topLeftAngle = channelToVec2(topLeftVal.r);
    vec2 topRightAngle = channelToVec2(topRightVal.r);
    vec2 bottomLeftAngle = channelToVec2(bottomLeftVal.r);
    vec2 bottomRightAngle = channelToVec2(bottomRightVal.r);

    // getting the magnitude out of them
    float topLeftMag = fromBase256(topLeftVal.gba);
    float topRightMag = fromBase256(topRightVal.gba);
    float bottomLeftMag = fromBase256(bottomLeftVal.gba);
    float bottomRightMag = fromBase256(bottomRightVal.gba);

    vec2 inPixelCoordinate = fract(p);
    // interpolate the angle
    vec2 interpolatedAngle = (1. - inPixelCoordinate.x) * (1. - inPixelCoordinate.y) * topLeftAngle + inPixelCoordinate.x * (1. - inPixelCoordinate.y) * topRightAngle + (1. - inPixelCoordinate.x) * inPixelCoordinate.y * bottomLeftAngle + inPixelCoordinate.x * inPixelCoordinate.y * bottomRightAngle;
    // interpolate the magnitude
    float interpolatedMag = (1. - inPixelCoordinate.x) * (1. - inPixelCoordinate.y) * topLeftMag + inPixelCoordinate.x * (1. - inPixelCoordinate.y) * topRightMag + (1. - inPixelCoordinate.x) * inPixelCoordinate.y * bottomLeftMag + inPixelCoordinate.x * inPixelCoordinate.y * bottomRightMag;

    gl_FragColor = vec4(vec2AngleToChannel(interpolatedAngle), toBase256(interpolatedMag));
}