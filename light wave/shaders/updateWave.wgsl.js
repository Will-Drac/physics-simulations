export default /*wgsl*/ `

// telling the gpu what everything it was sent in the bind group is
@group(0) @binding(0) var outputTexture: texture_storage_3d<rg32float, write>;
@group(0) @binding(1) var lastTexture: texture_3d<f32>;
@group(0) @binding(2) var beforeLastTexture: texture_3d<f32>;
@group(0) @binding(3) var iorTexture: texture_2d<f32>;

_NUMWAVELENGTHS

const c = 299792458.; //the speed of light
const dt = 0.000000000004; //the time between each frame
const dx = 0.003;
const dy = 0.003;
const pi = 3.141592653589793438;

@compute @workgroup_size(1) fn updateWave( //@workgroup_size(1) means one thread per workgroup (and i already set one workgroup per pixel); because it has the tag @compute, the shader knows to start here
    @builtin(global_invocation_id) id:vec3<u32> //this workgroup knows which one it is
){
    let i = vec3i(id.xyz); //because I have each pixel a workgroup, its id corresponds to the pixel it should work on

    let ior = textureLoad(iorTexture, i.xy, 0).r * 2;
    let v = c/ior;

    let beforeLastValue = textureLoad(beforeLastTexture, i, 0);
    let lastValue = textureLoad(lastTexture, i, 0);

    var lastValueRight = textureLoad(lastTexture, i + vec3i(1, 0, 0), 0);
    var lastValueLeft = textureLoad(lastTexture, i + vec3i(-1, 0, 0), 0);
    var lastValueTop = textureLoad(lastTexture, i + vec3i(0, 1, 0), 0);
    var lastValueBottom = textureLoad(lastTexture, i + vec3i(0, -1, 0), 0);


    // this is where all the big work of solving the wave equation happens (it's surprisingly short)
    var nextValue = 2*lastValue - beforeLastValue 
    + pow(v*dt/dx, 2)*(lastValueRight - 2*lastValue + lastValueLeft)
    + pow(v*dt/dy, 2)*(lastValueTop - 2*lastValue + lastValueBottom);

    // !might be able to remove the 0.999
    textureStore(outputTexture, i, vec4f(nextValue.r*0.999, nextValue.g*0.999, 0, 0)); //i multiply by a bit less than 1 because it would get too crazy otherwise as the wave rebounds and adds up
}

`