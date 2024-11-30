class Emitter {
    constructor(pos, charge, mass, lifeMax) {
        this.pos = pos
        this.charge = charge
        this.mass = mass
        this.lifeMax = lifeMax
        this.particles = []
    }

    emit() {
        this.particles.push(new Particle(
            this.pos.copy(),
            createVector(random(-1, 1), random(-1, 1)),
            this.charge,
            this.mass
        ))
    }

    applyElectricForce() {
        for (let p of this.particles) {
            p.applyElectricForce()
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].life > this.lifeMax || this.particles[i].pos.x < 0 || this.particles[i].pos.x > width || this.particles[i].pos.y < 0 || this.particles[i].pos.y > height) {
                this.particles.splice(i, 1)
            }
        }
        for (let p of this.particles) {
            p.update(dt)
        }
    }

    draw(canvas) {
        for (let p of this.particles) {
            p.draw(canvas)
        }
        canvas.fill(Math.max(this.charge * 155, 0) + 100, 100, Math.max(-this.charge, 0) * 155 + 100, 255)
        canvas.ellipse(this.pos.x, this.pos.y, 25, 25)

        canvas.stroke(255)
        if (this.charge < 0) {
            canvas.line(this.pos.x - 5, this.pos.y, this.pos.x + 5, this.pos.y)
        }
        else {
            canvas.line(this.pos.x - 5, this.pos.y, this.pos.x + 5, this.pos.y)
            canvas.line(this.pos.x, this.pos.y - 5, this.pos.x, this.pos.y + 5)
        }
    }
}