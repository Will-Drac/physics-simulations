function setup() {
    createCanvas(800, 800)
}

function draw() {
    pivot = 0
    length = 10

    background(220)
    push()
    //translate(width/2, height/2)
    scale(2)
    //rotate(2)
    rect(pivot / length, 0, 1, 40)
    pop()
}

function getTorque(radius, force) {
    return radius * force.y
}

let forces = []
let pivot, mass, length, angularVelocity, angularAcceleration, angle

function sumTorque() {
    let netTorque = 0
    for (let i = 0; i < forces.length; i += 1) {
        const r = forces[i][0] - pivot
        const F = forces[i][1]
        const T = getTorque(r, F)
        netTorque += T

    }

    return netTorque
}