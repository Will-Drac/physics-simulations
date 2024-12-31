const dt = 0.016

const g = 9.81
const L = 4

let startAngle = 20 * Math.PI / 180

let angles = [startAngle, startAngle]

const graphScale = 90

function restartSimulation() {
    startAngle = Number(document.getElementById("initialAngleInput").value) * Math.PI / 180
    t = 0
    angles = [startAngle, startAngle]
}

let graphCanvas
function setup() {
    createCanvas(800, 800)
    strokeWeight(3)
    fill(10)

    createP("Comparing the angles of the two pendulums over time:")

    graphCanvas = createGraphics(width, height / 4)
    graphCanvas.strokeWeight(5 / graphScale)
    graphCanvas.background(20)
}

let t = 0
function draw() {
    background(20)

    t += dt

    const length = width / 3

    // approximated pendulum
    const w = Math.sqrt(g / L)
    const approximatedAngle = startAngle * Math.cos(w * t)
    push()
    translate(width / 2, height / 2)
    rotate(approximatedAngle)
    stroke(50, 50, 255)
    line(0, 0, 0, length)
    rect(-20, -20 + length, 40, 40)
    pop()



    // simulated pendulum
    const simulatedAngle = updatePendulum(L, g, dt, angles[1], angles[0])

    angles[0] = angles[1]
    angles[1] = simulatedAngle

    push()
    translate(width / 2, height / 2)
    rotate(simulatedAngle)
    stroke(255, 50, 50)
    line(0, 0, 0, length)
    rect(-20, -20 + length, 40, 40)

    stroke(255, 50, 255)
    drawVector(
        createVector(100 * Math.sin(simulatedAngle), 0),
        createVector(0, length),
        Math.abs(20 * Math.sin(simulatedAngle)),
        0.5
    )
    drawVector(
        createVector(0, 100 * Math.cos(simulatedAngle)),
        createVector(0, length),
        Math.abs(20 * Math.cos(simulatedAngle)),
        0.5
    )
    stroke(255, 255, 255)
    drawVector(
        createVector(0, -100 * Math.cos(simulatedAngle)),
        createVector(0, length),
        Math.abs(20 * Math.cos(simulatedAngle)),
        0.5
    )
    pop()



    // drawing the graph
    const drawT = t % (width / graphScale)
    graphCanvas.push()
    graphCanvas.translate(0, graphCanvas.height / 2)
    graphCanvas.scale(graphScale, graphScale)

    graphCanvas.stroke(255, 50, 50)
    graphCanvas.line(drawT - dt, angles[0] / startAngle, drawT, angles[1] / startAngle)

    graphCanvas.stroke(50, 50, 255)
    graphCanvas.line(drawT - dt, Math.cos(w * (t - dt)), drawT, Math.cos(w * t))

    graphCanvas.pop()

    if (drawT - dt <= 0) { //if we just restarted drawing the graph, fill in the background
        graphCanvas.background(20)
    }
}

function updatePendulum(length, gravity, timeStep, lastAngle, beforeLastAngle) {
    return -gravity / length * timeStep * timeStep * Math.sin(lastAngle) + 2 * lastAngle - beforeLastAngle
}

function drawVector(vector, position, headLength, headAngle) {
    push()
    translate(position.x, position.y)
    rotate(vector.heading())
    line(0, 0, vector.mag(), 0)
    line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), headLength * Math.sin(headAngle))
    line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), -headLength * Math.sin(headAngle))
    pop()
}