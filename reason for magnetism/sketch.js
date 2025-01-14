const e = 1.60217e-19

let protons = []
let electrons = []

class Particle {
    constructor(pos, speed, charge) {
        this.pos = pos
        this.vel = createVector(speed, 0)
        this.charge = charge
    }

    update() {
        this.pos.add(this.vel)
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
        ellipse(this.pos.x, this.pos.y, 5)
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
}


/*
stationary protons and moving electrons, and their density is even

then, when you have a moving charge,
    if you're moving with the electrons, they spread out, while the protons contract
        protons seem more dense
    if you're moving against the electrons, they contract more than the protons do
        electrons seem more dense
*/