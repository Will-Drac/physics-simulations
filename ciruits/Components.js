id = 1

let componentsIndex = {}

class Connection {
    constructor(nodeA, nodeB) {
        this.connectA(nodeA)
        this.connectB(nodeB)

        this.id = id
        componentsIndex[id] = this

        id++
    }

    connectA(node) {
        this.nodeA = node
        node.connections.push({ connector: this, nodeLabel: "A" })
    }

    connectB(node) {
        this.nodeB = node
        node.connections.push({ connector: this, nodeLabel: "B" })
    }
}

class Wire extends Connection {
    constructor(nodeA, nodeB) {
        super(nodeA, nodeB)
    }
}

class Resistor extends Connection {
    constructor(resistance, nodeA, nodeB) {
        super(nodeA, nodeB)
        this.R = resistance
    }
}

class Battery extends Connection {
    constructor(emf, nodeA, nodeB) {
        super(nodeA, nodeB)
        this.emf = emf
    }
}

class Capacitor extends Connection {
    constructor(capacitance, nodeA, nodeB){
        super(nodeA, nodeB)
        this.C = capacitance
        this.Q = 0
    }
}

// i would want to add capacitor