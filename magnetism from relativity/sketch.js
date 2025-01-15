const e = 1.60217e-19
const c = 10

let protons = []
let electrons = []

let protonsVisible = 0
let electronsVisible = 0

let outParticleSpeed = 0
const outParticleSpeedInput = document.getElementById("speedInput")

const speedDisplay = document.getElementById("speedDisplay")
const electronsDisplay = document.getElementById("numElectronsDisplay")
const protonsDisplay = document.getElementById("numProtonsDisplay")
const chargeDisplay = document.getElementById("chargeDisplay")

function relativityShiftVelocity(oldVel, forVel) {
    return (oldVel + forVel) / (1 + (oldVel * forVel) / (c ** 2))
}

function getLengthContraction(velRel) {
    return Math.sqrt(1 - (velRel / c) ** 2)
}

class Particle {
    constructor(pos, speed, charge) {
        this.pos = pos
        this.speed = speed
        this.charge = charge
    }

    update() {
        this.relVel = relativityShiftVelocity(this.speed, -outParticleSpeed)
        this.lenCon = getLengthContraction(this.relVel)
        this.pos.x += this.relVel
        while (this.pos.x < -this.lenCon * width / 2) {
            this.pos.x += this.lenCon * width
        }
        while (this.pos.x > this.lenCon * width / 2) {
            this.pos.x -= this.lenCon * width
        }
    }

    draw() {
        if (this.charge < 0) {
            fill(0, 0, 255)
        }
        else if (this.charge > 0) {
            fill(255, 0, 0)
        }
        else {
            fill(0, 0, 0)
        }

        const w = width * this.lenCon
        const n = Math.ceil(1 / this.lenCon)
        for (let i = -n; i <= n; i++) {

            const p = this.pos.x + width / 2 + i * w
            if (p > 0 && p < width) {
                ellipse(
                    p,
                    this.pos.y,
                    10
                )

                if (this.charge < 0) { electronsVisible++ }
                else if (this.charge > 0) { protonsVisible++ }
            }

        }
    }
}

let bgShapes = []

class BGShape {
    constructor(pos, size) {
        this.pos = this.projectReverse(pos.x, pos.y, pos.z)
        this.size = size; this.posProj = createVector()
    }

    project() {
        return createVector(
            (this.pos.x - width / 2) / this.pos.z + width / 2,
            (this.pos.y - height / 2) / this.pos.z + height / 2,
        )
    }

    projectReverse(px, py, z) {
        return createVector(
            z * (px - width / 2) + width / 2,
            z * (py - width / 2) + width / 2,
            z
        )
    }

    update() {
        this.pos.x -= outParticleSpeed
        this.posProj = this.project()

        if (this.posProj.x < -this.size || this.posProj.x > width + this.size) {
            this.shouldDelete = true //marks that this object should be removed
        }
    }

    draw() {
        ellipse(
            this.posProj.x,
            this.posProj.y,
            getLengthContraction(outParticleSpeed) * this.size / this.pos.z,
            this.size / this.pos.z
        )
    }
}

function setup() {
    const c = createCanvas(800, 800)
    c.parent(document.getElementById("canvasContainer"))

    for (let i = 0; i < 15; i++) {
        protons.push(new Particle(createVector(random(0, 800), random(600, 750)), 0, 1))
    }
    for (let i = 0; i < 10; i++) {
        electrons.push(new Particle(createVector(random(0, 800), random(600, 750)), -7.5, -1))
    }

    for (let i = 0; i < 20; i++) {
        bgShapes.push(new BGShape(createVector(random(0, 800), random(0, 800), random(1, 10)), 200))
    }
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

let oldParticleSpeed = 0
function draw() {
    background(51)

    protonsVisible = 0; electronsVisible = 0; chargeVisible = 0

    outParticleSpeed = parseFloat(outParticleSpeedInput.value)
    speedDisplay.innerText = (outParticleSpeed / 10).toFixed(2) + "c"
    if (oldParticleSpeed !== outParticleSpeed) {
        for (let proton of protons) {
            proton.pos = createVector(random(-width / 2, width / 2), random(600, 750))
        }
        for (let electron of electrons) {
            electron.pos = createVector(random(-width / 2, width / 2), random(600, 750))
        }
    }
    oldParticleSpeed = outParticleSpeed

    const numBGParticles = Math.floor(Math.abs(20/getLengthContraction(-outParticleSpeed)))

    console.log(numBGParticles, bgShapes.length)

    if (bgShapes.length < numBGParticles) {
        bgShapes.push(new BGShape(createVector(outParticleSpeed > 0 ? width + 200 : -200, random(0, 800), random(1, 10)), 200))
    }

    while (bgShapes.length > numBGParticles) {
        bgShapes.pop()
    }

    fill(255, 255, 255, 50)
    noStroke()
    for (let bgShape of bgShapes) {
        bgShape.update()
        bgShape.draw()
    }
    for (let i = bgShapes.length - 1; i >= 0; i--) {
        if (bgShapes[i].shouldDelete) {
            bgShapes.splice(i, 1)
        }
    }

    stroke(0)
    fill(255, 255, 0)
    rect(0, 580, 800, 190)
    fill(100, 100, 0)
    rect(0, 600, 800, 150)

    for (let proton of protons) {
        proton.update()
        proton.draw()
    }

    for (let electron of electrons) {
        electron.update()
        electron.draw()
    }

    strokeWeight(15)
    stroke(255, 0, 0)
    if (Math.abs(electronsVisible - protonsVisible) > 3) {
        drawVector(createVector(0, 5 * (electronsVisible - protonsVisible)), createVector(width / 2, height / 2), 20, 0.7)
    }

    strokeWeight(2)
    if (Math.abs(outParticleSpeed) > 1) {
        stroke(0, 255, 0)
        drawVector(createVector(10*outParticleSpeed, 0), createVector(width / 2, height / 2), 20, 0.7)
    } 

    stroke(0)
    fill(255, 0, 0)
    ellipse(width / 2, height / 2, 30)

}

setInterval(function () {
    electronsDisplay.innerText = electronsVisible
    protonsDisplay.innerText = protonsVisible
    chargeDisplay.innerText = protonsVisible - electronsVisible + "e"
}, 150)

/*
stationary protons and moving electrons, and their density is even

then, when you have a moving charge,
    if you're moving with the electrons, they spread out, while the protons contract
        protons seem more dense
    if you're moving against the electrons, they contract more than the protons do
        electrons seem more dense
*/