class Particle {
    constructor(pos, vel, charge, mass) {
        this.pos = pos
        this.vel = vel
        this.acc = createVector(0, 0)
        this.charge = charge
        this.mass = mass
        this.life = 0
    }

    draw(canvas) {
        canvas.fill(Math.max(this.charge * 155, 0) + 100, 100, Math.max(-this.charge, 0) * 155 + 100, 255)
        canvas.ellipse(this.pos.x, this.pos.y, 15, 15)
    }

    applyForce(force) {
        this.acc.add(force.div(this.mass))
    }

    applyElectricForce() {
        const thisPixelIndex = (Math.floor(this.pos.x) + Math.floor(this.pos.y) * width) * 4
        const angle = cUpscaleField.pixels[thisPixelIndex] / 255 * 2 * Math.PI - Math.PI / 2
        const magnitude = cUpscaleField.pixels[thisPixelIndex + 1] +
            cUpscaleField.pixels[thisPixelIndex + 2] * 255 +
            cUpscaleField.pixels[thisPixelIndex + 3] * 255 * 255
        const forceVector = p5.Vector.fromAngle(angle, magnitude).mult(this.charge)
        this.applyForce(forceVector)
    }

    update(dt) {
        this.life += dt
        this.vel.add(this.acc.copy().mult(dt))
        this.pos.add(this.vel.copy().mult(dt))
        this.acc.mult(0)
    }
}