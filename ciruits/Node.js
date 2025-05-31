class Node {
    constructor(x, y) {
        this.pos = {x, y}

        this.connections = [] // contains [connector, "A" or "B" for if this node is its A or B]
    }
}
