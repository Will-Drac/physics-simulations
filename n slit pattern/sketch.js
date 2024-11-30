let animationPlaying = false
let P = {} // the parameters object
function startSimulation() {
    animationPlaying = true
    t = 0
    interferencePlot = []; diffractionPlot = []
    sCanvas.background(0)
    P = getParameters()
}

function stopSimulation() {
    animationPlaying = false
}

function getParameters() {
    return {
        NumSlits: document.getElementById("numInput").value,
        SlitSpacing: document.getElementById("dInput").value,
        SlitWidth: document.getElementById("aInput").value,
        DistToScreen: document.getElementById("distInput").value,
        ScreenRange: document.getElementById("sizeInput").value,
        Wavelength: document.getElementById("wavelengthInput").value,
        TimePerSweep: document.getElementById("tInput").value
    }
}

const NumDiffractionPhasers = 30 //this should technically be infinity

let phasersCanvasSize = 400

// let mainCanvas
let iCanvas
let dCanvas
let gCanvas
let sCanvas
let startPos //will just be set once,  the center of the screen
function setup() {
    noCanvas()

    iCanvas = createGraphics(phasersCanvasSize, phasersCanvasSize)
    dCanvas = createGraphics(phasersCanvasSize, phasersCanvasSize)

    createElement("br")

    gCanvas = createGraphics(2 * phasersCanvasSize, phasersCanvasSize)
    createElement("br")
    sCanvas = createGraphics(2 * phasersCanvasSize, phasersCanvasSize)

    startPos = createVector(phasersCanvasSize / 2, phasersCanvasSize / 2)
}

let interferencePlot = []
let diffractionPlot = []

t = 0
function draw() {
    if (!animationPlaying) { return }
    if (t > P.TimePerSweep) {
        t = 0
        interferencePlot = []; diffractionPlot = []
    }
    else {
        // t += deltaTime / 1000
        t += 16/1000
    }

    const ScreenPos = t * P.ScreenRange / P.TimePerSweep
    const AngularPos = Math.atan2(ScreenPos, P.DistToScreen)

    // ---------- INTERFERENCE ----------
    iCanvas.background(25)

    let iArrowPoints = [startPos]
    const iAngleDiff = 2 * Math.PI * P.SlitSpacing * Math.sin(AngularPos) / P.Wavelength //phi
    for (let i = 0; i < P.NumSlits; i++) {
        const thisAngle = -iAngleDiff * i
        iArrowPoints.push(getArrowEnd(iArrowPoints[i], (phasersCanvasSize / 2) / P.NumSlits, thisAngle))
    }

    iCanvas.stroke(255)
    iCanvas.strokeWeight(1)
    for (let i = 0; i < iArrowPoints.length - 1; i++) {
        arrow(iCanvas, iArrowPoints[i], iArrowPoints[i + 1])
    }

    iCanvas.stroke(255, 0, 0)
    iCanvas.strokeWeight(5)
    arrow(iCanvas, iArrowPoints[0], iArrowPoints[iArrowPoints.length - 1])

    const interferenceValue = iArrowPoints[0].dist(iArrowPoints[iArrowPoints.length - 1]) / (phasersCanvasSize / 2)
    const interferenceIntensity = interferenceValue ** 2

    interferencePlot.push({ x: ScreenPos, y: interferenceIntensity })

    // ---------- DIFFRACTION ----------
    dCanvas.background(25)

    let dPoints = [startPos]
    const dAngleDiff = 2 * Math.PI * P.SlitWidth * Math.sin(AngularPos) / P.Wavelength //this is sigma
    const dAngleDiffPerLine = dAngleDiff / (NumDiffractionPhasers - 1)
    for (let i = 0; i < NumDiffractionPhasers; i++) {
        const thisAngle = -dAngleDiffPerLine * i
        dPoints.push(getArrowEnd(dPoints[i], (phasersCanvasSize / 2) / NumDiffractionPhasers, thisAngle))
    }

    dCanvas.stroke(255)
    dCanvas.strokeWeight(1)
    for (let i = 0; i < dPoints.length - 2; i++) {
        headlessArrow(dCanvas, dPoints[i], dPoints[i + 1])
    }
    arrow(dCanvas, dPoints[dPoints.length - 2], dPoints[dPoints.length - 1])

    dCanvas.stroke(0, 255, 0)
    dCanvas.strokeWeight(5)
    arrow(dCanvas, dPoints[0], dPoints[dPoints.length - 1])

    const diffractionValue = dPoints[0].dist(dPoints[dPoints.length - 1]) / (phasersCanvasSize / 2)
    const diffractionIntensity = diffractionValue ** 2

    diffractionPlot.push({ x: ScreenPos, y: diffractionIntensity })

    // ---------- GRAPH ----------
    gCanvas.background(25)

    gCanvas.stroke(255, 255, 255)
    gCanvas.strokeWeight(5)
    for (let i = 0; i < Math.min(interferencePlot.length, diffractionPlot.length) - 1; i++) {
        const thisIntensity = interferencePlot[i].y * diffractionPlot[i].y
        const thisGraphPos = toGraphPos({ x: interferencePlot[i].x, y: thisIntensity })

        const nextIntensity = interferencePlot[i + 1].y * diffractionPlot[i + 1].y
        const nextGraphPos = toGraphPos({ x: interferencePlot[i + 1].x, y: nextIntensity })

        gCanvas.line(thisGraphPos.x, thisGraphPos.y, nextGraphPos.x, nextGraphPos.y)
        gCanvas.line(-thisGraphPos.x + gCanvas.width, thisGraphPos.y, -nextGraphPos.x + gCanvas.width, nextGraphPos.y)
    }

    gCanvas.strokeWeight(1)
    gCanvas.stroke(255, 0, 0)
    for (let i = 0; i < interferencePlot.length - 1; i++) {
        const thisGraphPos = toGraphPos(interferencePlot[i])
        const nextGraphPos = toGraphPos(interferencePlot[i + 1])

        gCanvas.line(thisGraphPos.x, thisGraphPos.y, nextGraphPos.x, nextGraphPos.y)
        gCanvas.line(-thisGraphPos.x + gCanvas.width, thisGraphPos.y, -nextGraphPos.x + gCanvas.width, nextGraphPos.y)
    }

    gCanvas.stroke(0, 255, 0)
    for (let i = 0; i < diffractionPlot.length - 1; i++) {
        const thisGraphPos = toGraphPos(diffractionPlot[i])
        const nextGraphPos = toGraphPos(diffractionPlot[i + 1])

        gCanvas.line(thisGraphPos.x, thisGraphPos.y, nextGraphPos.x, nextGraphPos.y)
        gCanvas.line(-thisGraphPos.x + gCanvas.width, thisGraphPos.y, -nextGraphPos.x + gCanvas.width, nextGraphPos.y)
    }

    // ---------- SCREEN ----------
    const latestInterference = interferencePlot[interferencePlot.length - 1].y
    const latestDiffraction = diffractionPlot[diffractionPlot.length - 1].y
    const latestIntensity = latestInterference * latestDiffraction *100

    const latestPosX = toGraphPos(interferencePlot[interferencePlot.length - 1]).x

    let col = displayColor(P.Wavelength, latestIntensity, 0.5)
    if (col[0]==0 && col[1]==0 &&col[2]==0) {col = [10*latestIntensity, 10*latestIntensity, 10*latestIntensity]}
    sCanvas.stroke(col[0], col[1], col[2])
    sCanvas.strokeWeight(phasersCanvasSize/P.TimePerSweep*(16/1000)+1)
    sCanvas.line(latestPosX, sCanvas.height / 2 + 100, latestPosX, sCanvas.height / 2 - 100)
    sCanvas.line(-latestPosX+sCanvas.width, sCanvas.height / 2 + 100, -latestPosX+sCanvas.width, sCanvas.height / 2 - 100)
}

function getArrowEnd(start, length, angle) {
    return createVector(start.x + length * Math.cos(angle), start.y + length * Math.sin(angle))
}

function arrow(canvas, start, end) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const length = start.dist(end)
    canvas.push()
    canvas.translate(start.x, start.y)
    canvas.rotate(angle)
    canvas.line(0, 0, length, 0)
    canvas.line(length, 0, length - (10), -(5))
    canvas.line(length, 0, length - (10), (5))
    canvas.pop()
}

function headlessArrow(canvas, start, end) {
    canvas.line(start.x, start.y, end.x, end.y)
}

function toGraphPos(point) {
    return {
        x: point.x / P.ScreenRange * (gCanvas.width / 2) + gCanvas.width / 2,
        y: gCanvas.height * (1 - point.y)
    }
}

function wavelengthToColor(wavelength) { //https://gist.github.com/hypercompetent/cad598361683b10c5bc6787aa9951d64
    var Gamma = 0.80,
        IntensityMax = 255,
        factor, red, green, blue
    if ((wavelength >= 380) && (wavelength < 440)) {
        red = -(wavelength - 440) / (440 - 380)
        green = 0.0
        blue = 1.0
    } else if ((wavelength >= 440) && (wavelength < 490)) {
        red = 0.0
        green = (wavelength - 440) / (490 - 440)
        blue = 1.0
    } else if ((wavelength >= 490) && (wavelength < 510)) {
        red = 0.0
        green = 1.0
        blue = -(wavelength - 510) / (510 - 490)
    } else if ((wavelength >= 510) && (wavelength < 580)) {
        red = (wavelength - 510) / (580 - 510)
        green = 1.0
        blue = 0.0
    } else if ((wavelength >= 580) && (wavelength < 645)) {
        red = 1.0
        green = -(wavelength - 645) / (645 - 580)
        blue = 0.0
    } else if ((wavelength >= 645) && (wavelength < 781)) {
        red = 1.0
        green = 0.0
        blue = 0.0
    } else {
        red = 0.0
        green = 0.0
        blue = 0.0
    };
    // Let the intensity fall off near the vision limits
    if ((wavelength >= 380) && (wavelength < 420)) {
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380)
    } else if ((wavelength >= 420) && (wavelength < 701)) {
        factor = 1.0
    } else if ((wavelength >= 701) && (wavelength < 781)) {
        factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700)
    } else {
        factor = 0.0
    };
    if (red !== 0) {
        red = Math.round(IntensityMax * Math.pow(red * factor, Gamma))
    }
    if (green !== 0) {
        green = Math.round(IntensityMax * Math.pow(green * factor, Gamma))
    }
    if (blue !== 0) {
        blue = Math.round(IntensityMax * Math.pow(blue * factor, Gamma))
    }
    return [red, green, blue]
}

function displayColor(wavelength, intensity, exposure) {
    let col = wavelengthToColor(wavelength*1e9)
    col[0] = 255*toneMap(exposure*intensity*col[0]/255)
    col[1] = 255*toneMap(exposure*intensity*col[1]/255)
    col[2] = 255*toneMap(exposure*intensity*col[2]/255)
    return col
}

function toneMap(v){
    return 1-(1/(v+1))
}