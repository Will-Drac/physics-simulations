const nodes = [
    new Node(0, 0),
    new Node(1, 0),
    new Node(1, 1),
    new Node(1, -1),
    new Node(2, 1),
    new Node(2, -1),
    new Node(2, 0),
    new Node(3, 0),
    new Node(3, 2),
    new Node(0, 2)
]

const components = [
    new Resistor(10, nodes[0], nodes[1]),

    new Wire(nodes[1], nodes[2]),
    new Wire(nodes[1], nodes[3]),

    new Resistor(5, nodes[2], nodes[4]),
    new Capacitor(0.5, nodes[3], nodes[5]),

    new Wire(nodes[4], nodes[6]),
    new Wire(nodes[5], nodes[6]),

    new Wire(nodes[6], nodes[7]),
    new Wire(nodes[8], nodes[7]), //this one is turned around for testing purposes
    new Wire(nodes[8], nodes[9]),
    new Battery(10, nodes[9], nodes[0])
]

// const nodes = [
//     new Node(0, 0),
//     new Node(1, 0),
//     new Node(1, 1)
// ]

// const components = [
//     new Battery(10, nodes[0], nodes[1]),
//     new Resistor(5, nodes[1], nodes[2]),
//     new Capacitor(0.5, nodes[2], nodes[0])
// ]

// returns two matrices I and T such that C = I * T * b where C are the currents 
function getCircuitInformation() {
    let junctionRuleEquations = [] //hold the equations such as I1+I2-I3=0 or just I4=I5

    let noBranches = [] //if it doesnt branch, the current is the same, so join them into one current to save computing later

    // putting together either a junction rule equation or an equivalence between the current at some nodes
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]

        if (n.connections.length == 2) {
            const sign = n.connections[0].nodeLabel == n.connections[1].nodeLabel ? -1 : 1 //if they are connected A to A or B to B then i1 = -i2 since we assume current flows from A to B
            noBranches.push([n.connections[0].connector.id, sign * n.connections[1].connector.id])
        }
        else {
            junctionRuleEquations.push([])

            for (let j = 0; j < n.connections.length; j++) {
                junctionRuleEquations[junctionRuleEquations.length - 1].push({
                    currentId: n.connections[j].connector.id,
                    coefficient: n.connections[j].nodeLabel == "A" ? -1 : 1 //if this node is A for the component, we assume it is pulling current away, if B, its pushing current towards
                })
            }
        }
    }

    //putting all of the equivalent currents together
    let currentEquivalences = []

    // a==b, b==c -> a==b==c
    // this might need a few steps, sometimes it wont catch some depending on the order of the check
    function accumulateCurrentEquivalences(input) {
        let output = []
        let didWork = false

        for (let i = 0; i < input.length; i++) {
            let equivalenceFound = false
            let equivalenceIndex = -1
            let sign = 1
            for (let j = 0; j < input[i].length; j++) {
                for (let k = 0; k < output.length; k++) {
                    for (let l = 0; l < output[k].length; l++) {
                        if (Math.abs(output[k][l]) == Math.abs(input[i][j])) {
                            equivalenceFound = true
                            equivalenceIndex = k
                            sign = output[k][l] / input[i][j] //if the two are equivalent in magnitude but not in sign, still consider them equivalent and flip the sign later (they are just in different directions)
                            break
                        }
                    }
                }
            }

            if (equivalenceFound) {
                for (let j = 0; j < input[i].length; j++) {
                    output[equivalenceIndex].push(sign * input[i][j])
                }
                didWork = true
            }
            else {
                output.push(input[i])
            }
        }

        return { output, didWork }
    }

    let accumulationResult = accumulateCurrentEquivalences(noBranches)
    while (accumulationResult.didWork) {
        accumulationResult = accumulateCurrentEquivalences(accumulationResult.output)
    }
    currentEquivalences = accumulationResult.output

    // at this point, currentEquivalences might have doubles. removing them:
    function removeDoubles(input) {
        let output = []
        for (let i = 0; i < input.length; i++) {
            output.push([...new Set(input[i])]) //thanks chatgpt
        }
        return output
    }
    currentEquivalences = removeDoubles(currentEquivalences)

    // using currentEquivalences to make an object which translates all equivalent currents to only one of them
    let currentEquivalenceDictionary = []
    for (let i = 0; i < currentEquivalences.length; i++) {
        for (let j = 0; j < currentEquivalences[i].length; j++) {
            currentEquivalenceDictionary[Math.abs(currentEquivalences[i][j])] = Math.sign(currentEquivalences[i][j]) * (i + 1)
        }
    }

    // translating the prior junction rule equations
    for (let i = 0; i < junctionRuleEquations.length; i++) {
        for (let j = 0; j < junctionRuleEquations[i].length; j++) {
            junctionRuleEquations[i][j].currentId = currentEquivalenceDictionary[junctionRuleEquations[i][j].currentId]
        }
    }

    let loops = [] //if an element is negative its because the component is backwards compared to what we assumed
    function getLoops(component, sideToSearch, pastConnections) { //pastConnections is holding the ids of the past connections and not the components themselves
        let nodeToSearch = sideToSearch == "A" ? component.nodeA : component.nodeB

        for (let connection of nodeToSearch.connections) {
            const C = connection.connector
            if (C !== component) {

                for (let i = 0; i < pastConnections.length; i++) {
                    if (Math.abs(pastConnections[i]) == Math.abs(C.id)) {
                        pastConnections.splice(0, i)
                        loops.push(pastConnections)
                        return
                    }
                }

                const connectedSide = connection.nodeLabel
                const nextNodeToSearch = connectedSide == "A" ? "B" : "A" //which side of the connected component to continue searching from

                const sign = connectedSide == "A" ? 1 : -1

                if (pastConnections.length == 0) {
                    getLoops(C, nextNodeToSearch, [sign * C.id])
                }
                else {
                    const pastConnectionsCopy = deepCopy(pastConnections)
                    pastConnectionsCopy.push(sign * C.id)
                    getLoops(C, nextNodeToSearch, pastConnectionsCopy)
                }
            }
        }
    }
    getLoops(components[0], "A", [])
    let loopRuleEquations = [] //holds the equations for the loop rule
    let capacitors = []
    for (let i = 0; i < loops.length; i++) {
        let thisEquation = []
        for (let j = 0; j < loops[i].length; j++) {
            let id = loops[i][j]
            const componentDirection = Math.sign(id)
            id = Math.abs(id)
            const component = componentsIndex[id]

            if (component.constructor.name == "Resistor") {
                thisEquation.push({ currentId: currentEquivalenceDictionary[id], coefficient: componentDirection * component.R })
            }
            else if (component.constructor.name == "Capacitor") {
                // thisEquation.push({V: -componentDirection*component.Q/component.C}) //the voltage across a capacitor is always Q/C (but Q changes)
                capacitors.push([i + junctionRuleEquations.length, -componentDirection * component.id]) //equation i includes capacitor with a certain id
            }
            else if (component.constructor.name == "Battery") {
                thisEquation.push({ V: componentDirection * component.emf })
            }
        }
        loopRuleEquations.push(thisEquation)
    }

    const totalNumEquations = junctionRuleEquations.length + loopRuleEquations.length
    const numDifferentCurrents = currentEquivalences.length

    let A = new Matrix(totalNumEquations, numDifferentCurrents)
    let b = new Matrix(totalNumEquations, 1)

    for (let i = 0; i < loopRuleEquations.length; i++) {
        let constant = 0
        for (let e of loopRuleEquations[i]) {
            if (e.V) { constant += e.V }
        }
        b.entries[junctionRuleEquations.length + i][0] = constant
    }

    for (let i = 0; i < junctionRuleEquations.length; i++) {
        for (let term of junctionRuleEquations[i]) {
            A.entries[i][term.currentId - 1] = term.coefficient //ids start at 1
        }
    }
    for (let i = 0; i < loopRuleEquations.length; i++) {
        for (let term of loopRuleEquations[i]) {
            if (term.currentId) {
                A.entries[junctionRuleEquations.length + i][term.currentId - 1] += term.coefficient
            }
        }
    }

    // Ax=b => A^T A x = A^T b => x = (A^T A)^-1 (A^T b)

    const T = A.transpose()
    const M = T.multiplyMatrix(A)
    const I = M.inverse()

    // needs a thing to say where the capacitor values should go in b, like [[entry, id], [entry, id], ...]
    // Q/C of the capacitor with id gets added to the entry of b
    return { b, capacitors, I, T, currentEquivalences }
}

const ci = getCircuitInformation()

// inputs what getCircuitInformation returns
function updateCurrents(ci, dt) {
    // adding the capacitors with their most recent charge values into the vector
    let b = deepCopy(ci.b)
    for (let i = 0; i < ci.capacitors.length; i++) {
        const equationEntry = ci.capacitors[i][0]
        const capacitorId = ci.capacitors[i][1]
        const capacitor = componentsIndex[Math.abs(capacitorId)]
        b.entries[equationEntry][0] += Math.sign(capacitorId) * capacitor.Q / capacitor.C
    }

    // debugger

    const B = ci.T.multiplyVector(b)
    const representativeCurrents = ci.I.multiplyVector(B)

    // now these representative currents need to be used to update all of the components

    for (let i = 0; i < ci.currentEquivalences.length; i++) {
        for (let j = 0; j < ci.currentEquivalences[i].length; j++) {
            const id = ci.currentEquivalences[i][j]
            const thisComponent = componentsIndex[Math.abs(id)]
            const thisComponentRepresentativeCurrent = i //the entry in the representativeCurrents vector which will be used for this component
            thisComponent.I = Math.sign(id) * representativeCurrents.entries[thisComponentRepresentativeCurrent][0]
            // if (thisComponent.I < 0) { thisComponent.I = 0 }
        }
    }

    // now update the charge on all capacitors using the current going through them
    for (let i = 0; i < components.length; i++) {
        if (components[i].constructor.name == "Capacitor") {
            components[i].Q += components[i].I * dt
        }
    }
}

function deepCopy(object) {
    return JSON.parse(JSON.stringify(object))
}

const circuitInformation = getCircuitInformation()
function setup() {
    createCanvas(400, 400)
}

let i = 0
let results = ''
function draw() {
    background(220)

    updateCurrents(circuitInformation, 16 * 1e-3)

    console.log(components[4].I, components[4].Q)

    // if (i%10==0) {
    //     results += `(${16*1e-3*i}, ${components[2].Q}), `
    // }
    // i++
}


/*
finding current:

each connection has a current, we assume it goes A->B so if it's negative it's going B->A
    the current contribution to a node from a connector is -I if the node is A and I if the node is B
for each node, have a function that adds up all of the current contributions from each of its connectors
this sum must be equal to 0

starting at one node and traversing the nodes, branching out when necessary, and collecting potential difference across each connection, the sum should be 0 for each branch

these equations can get put into a matrix to find the vector for all currents
then V=IR, find potential difference everywhere

the matrix should have number of columns matching the number of connections and however many rows all equations fit (it will probably be more than the number of connections)

*/