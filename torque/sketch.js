const barWidth = 15 //you can set this to whatever looks good
pivot = 50 //this should be set by the user, but for testing it's how you can set the pivot position of the bar
length = 200 //this should also be set by the user
let mass = 1 //user defined
let angularVelocity = 0
let angularAcceleration = 0
let angle = 0
let forces = []

let pivotInput, massInput, lengthInput, forcePositionInput, forceMagnitudeInput, addForceButton;


function setup() {
    createCanvas(800, 800) //creating the canvas, 800 pixels by 800 pixels

    createP("Length of bar:")
    lengthInput = createInput(length.toString());
    lengthInput.input(() => {
        length = parseFloat(lengthInput.value()); //float makes sense right
    });
    
    createP("Mass of bar:")
    massInput = createInput(mass.toString());
    massInput.input(() => {
        mass = parseFloat(massInput.value());
    });

    createP("Position of pivot:")
    pivotInput = createInput(pivot.toString());
    pivotInput.input(() => {
        pivot = parseFloat(pivotInput.value());
    });

    createP("Position of force on bar:");
    forcePositionInput = createInput("100") //what

    createP("Magnitude of force (y component)")
    forceMagnitudeY = createInput("10") //also what

   
}

let t = 0 //a variable to keep track of the time since the simulation started
function draw() {
    background(51) //filling the background of the canvas with a solid color (i think this looks nice but you can do whatever with it)
    t += deltaTime / 1000 //p5 keeps track of deltaTime, which is the time between frames in milliseconds. adding this (converted to seconds) to our tally of the time keeps the time up to date

    let barMomentOfInertia = (mass * length ** 2) / 3 //***assuming that I bar = 1/3mL^2?? but the pivot changes so doesnt that change mot as well???***

    // between push and pop, you can do things like translate, rotate, and scale, so that when you draw something it would be affected by those transformations
    // i find it makes most sense to read them bottom to top
    push()
    translate(width / 2, height / 2) //finally it's moved to the center of the canvas: at a position with half the width and height of the canvas
    rotate(t) //it then rotates the rectangle. rotation always happens around the origin, that's why it's only being moved to the center of the canvas in the translate above
    rect(-pivot / length * 400, -barWidth / 2, 400, barWidth) //this one is kinda hard to explain, so i drew it out in "bar diagram.png"
    pop()
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