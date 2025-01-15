const e = 1.60217e-19
const c = 20

let protons = []
let electrons = []

let outParticleSpeed = 10

function relativityShiftVelocity(oldVel, forVel) {
    return (oldVel+forVel)/(1+(oldVel*forVel)/c)
}

function getLengthContraction(velRel) {
    return Math.sqrt(1-(velRel/c)**2)
}

class Particle {
    constructor(pos, speed, charge) {
        this.pos = pos
        this.speed = speed
        this.charge = charge
    }

    update() {
        this.pos.x += relativityShiftVelocity(this.speed, -outParticleSpeed)
        // this.pos.x += this.speed
        this.pos.x = this.pos.x%width
        while (this.pos.x < 0) {
            this.pos.x+=width
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
        ellipse(
            getLengthContraction(relativityShiftVelocity(this.speed, -outParticleSpeed))*(this.pos.x-width/2)+width/2,
            this.pos.y,
            5
        )
    }
}

function setup() {
    createCanvas(800, 800)

    for (let i = 0; i < 100; i++) {
        protons.push(new Particle(createVector(random(0, 800), random(600, 750)), 0, e))
        electrons.push(new Particle(createVector(random(0, 800), random(600, 750)), -10, -e))
    }
}

function draw() {
    background(51)

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

    fill(255, 0, 0)
    ellipse(width/2, height/2, 20)
}


/*
stationary protons and moving electrons, and their density is even

then, when you have a moving charge,
    if you're moving with the electrons, they spread out, while the protons contract
        protons seem more dense
    if you're moving against the electrons, they contract more than the protons do
        electrons seem more dense
*/