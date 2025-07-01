let pivotInput, massInput, lengthInput, forcePositionInput, addForceButton;

const barWidth = 20
let length = 200
let pivot = 50 
let mass = 1
let angularVelocity = 0
let angularAcceleration = 0
let angle = 0
let forces = []
let forcesTemp = []


let pivotX = -pivot * (400 / length)

let isRunning = false
        

function setup() {
    const c = createCanvas(800, 800) //creating the canvas, 800 pixels by 800 pixels
    c.parent(document.getElementById("canvasContainer")) //controls under canvas


    // getting the elements from html
    lengthInput = document.getElementById("lengthInput")
    massInput = document.getElementById("massInput")
    pivotInput = document.getElementById("pivotInput")

    forcePositionInput = document.getElementById("forcePositionInput")
    forceInputX = document.getElementById("forceInputX")
    forceInputY = document.getElementById("forceInputY")

    document.getElementById("inputForceButton").addEventListener("click", function (){
        const forcePosition = document.getElementById("forcePositionInput").value
        const forceMagnitudeX = document.getElementById("forceInputX").value
        const forceMagnitudeY = document.getElementById("forceInputY").value
        forcesTemp.push([forcePosition, createVector(forceMagnitudeX, forceMagnitudeY)])
    })

    document.getElementById("startButton").addEventListener("click", function (){
        // set velocity and acceleration to 0
        // update globals from elements' values

        forces = forcesTemp

        length = parseFloat(lengthInput.value)
        mass = parseFloat(massInput.value)
        pivot = parseFloat(pivotInput.value)

        angularVelocity = 0
        angularAcceleration = 0
        angle = 0
        isRunning = true
    })

    document.getElementById("stopButton").addEventListener("click", function () {
        isRunning = false
    }) 
}


        
let t = 0 //a variable to keep track of the time since the simulation started
function draw() {
    background(51) //filling the background of the canvas with a solid color (i think this looks nice but you can do whatever with it)
    //p5 keeps track of deltaTime, which is the time between frames in milliseconds. adding this (converted to seconds) to our tally of the time keeps the time up to date
    if (isRunning) {
    let momentOfInertia = calculateMomentOfInertia(mass, length, pivot)
   
        
    let netTorque = sumTorque(pivot)

    document.getElementById("netTorqueDisplay").innerText = `Net Torque: ${netTorque.toFixed(2)} Nm`; //two decimals

    angularAcceleration = netTorque / momentOfInertia
    angularVelocity += angularAcceleration * (deltaTime / 1000)
    angle += angularVelocity * (deltaTime / 1000)
    }

    // bar
    push();
    translate(width / 2 + pivotX, height / 2);
    rotate(-angle); // rotate around the pivot with angle calculated due to angularVelocity
    rect(-pivot * (400 / length), -barWidth / 2, 400, barWidth);
    pop();

    // pivot
    push();
    translate(width / 2 + pivotX, height / 2); // this movesit to pivot point
    fill(255, 0, 0); // red!!!
    ellipse(0, 0, 10);
    pop();

    let showTorqueForcesOnly = document.getElementById("toggleTorqueForces").checked;
    
    // forces
    push();
    translate(width / 2 + pivotX, height / 2);
    rotate(-angle);

    for (let force of forces) {
        let posX = (force[0] - pivot) * (400 / length);
        if (!showTorqueForcesOnly) {
            // x if its off
            stroke(255, 0, 0); // Red for Fx
            drawVector(
                createVector(force[1].x, 0),
                createVector(posX, -force[1].y),
                20,
                0.5
            );
    
            // this is not always visible since it's net
            strokeWeight(4);
            stroke(0, 255, 0); // Green
            drawVector(
                force[1],
                createVector(posX, 0),
                20,
                0.5
            );
        }

        //y
        stroke(0, 0, 255); // blu
        strokeWeight(2);
        drawVector(
            createVector(0, force[1].y),
            createVector(posX, 0),
            20,
            0.5
        );
    
       
    }
    pop();
}



function getTorque(radius, force) {
    return radius * force.y
}


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


function calculateMomentOfInertia(mass, length, pivot) {
    let density = mass / length
    let I1 = (pivot ** 3) / 3
    let I2 = (((length ** 3) / 3) - (pivot * (length ** 2))) + (((pivot ** 2) * length) - ((pivot ** 3) / 3))
    return density * (I1 + I2)

}


function drawVector(vector, position, headLength, headAngle) {
    push()
    translate(position.x, position.y)
    rotate(vector.heading() + Math.PI)
    line(0, 0, vector.mag(), 0)
    line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), headLength * Math.sin(headAngle))
    line(vector.mag(), 0, vector.mag() - headLength * Math.cos(headAngle), -headLength * Math.sin(headAngle))
    pop()
}
