#ifdef GL_ES
precision highp float;
#endif

// get it from the vertex shader
varying vec2 vTexCoord;

uniform sampler2D uPotential;
uniform vec2 uRes;
uniform float uTime;
uniform bool uShouldAnimateEquipotentials;

float base256ToFloat(vec4 base256) {
    vec4 b = base256 * 255.; //bring it back to its original [0-256] instead of [0-1]
    float val = b.x + b.y * 256. + b.z * 256. * 256. + b.w * 256. * 256. * 256.;
    return val - 2147483648.; //to get negative numbers back
}

bool isNearValue(float value, float thisValue, float upValue, float downValue, float leftValue, float rightValue) {
    if (thisValue <= value && (upValue > value || downValue > value || leftValue > value || rightValue > value)) {
        return true;
    }
    if (thisValue >= value && (upValue < value || downValue < value || leftValue < value || rightValue < value)) {
        return true;
    }
    return false;
}

void main() {
    vec2 uv = vTexCoord;

    uv.y = 1.0 - uv.y;

    float thisVal = base256ToFloat(texture2D(uPotential, uv));
    float upVal = base256ToFloat(texture2D(uPotential, (uv * uRes + vec2(0, 1.)) / uRes));
    float downVal = base256ToFloat(texture2D(uPotential, (uv * uRes + vec2(0, -1.)) / uRes));
    float leftVal = base256ToFloat(texture2D(uPotential, (uv * uRes + vec2(-1., 0)) / uRes));
    float rightVal = base256ToFloat(texture2D(uPotential, (uv * uRes + vec2(1, 0)) / uRes));

    float maxEquipotential = 10000000.;
    bool isOnEquipotential = false;
    for (float i = 0.; i < 10.; i += 1.) {

        float thisPotential;
        if (uShouldAnimateEquipotentials) {
            thisPotential = -2. * mod(1000000. * (uTime + i), maxEquipotential) + maxEquipotential;
        } else {
            thisPotential = -2. * mod(1000000. * i, maxEquipotential) + maxEquipotential;
        }

        if (isNearValue(thisPotential, thisVal, upVal, downVal, leftVal, rightVal)) {
            isOnEquipotential = true;
            break;
        }
    }

    if (isOnEquipotential) {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    } else {
        gl_FragColor = vec4(0., 0., 0., 1.);
    }
}