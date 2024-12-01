export default /*wgsl*/ `

struct waveUniforms {
    startValue: f32,
    tension: f32,
    massPerLength: f32
  }

@group(0) @binding(0) var<storage, read_write> points: array<f32>;
@group(0) @binding(1) var<storage, read_write> pointsOld: array<f32>;
@group(0) @binding(2) var<uniform> u: waveUniforms;

const numPoints = _NUMPOINTS;
const pointSpacing = _POINTSPACING;

@compute @workgroup_size(1) fn updatePoints(
    @builtin(global_invocation_id) id: vec3u
) {
    let i = id.x;

    if (i==0) {
        pointsOld[i] = u.startValue;
    }
    else if (i==numPoints-1) {
        pointsOld[i] = 0;
    }
    else {
        // update the wave according to the equation
        pointsOld[i] = ((u.tension/u.massPerLength)*(0.016/pointSpacing)*(points[i-1]-2*points[i]+points[i+1])+2*points[i]-pointsOld[i]);
    }
}

`