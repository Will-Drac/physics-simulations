import pressureCode from "./shaders/pressure.wgsl.js"
import displaceCode from "./shaders/displace.wgsl.js"
import clearCode from "./shaders/clear.wgsl.js"
import drawPointsCode from "./shaders/drawPoints.wgsl.js"
import displayCode from "./shaders/display.wgsl.js"
import renderCode from "./shaders/render.wgsl.js"

const numPointsSqrt = 350
const iconSize = 40

function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max)
}

async function main() {
    // set up the device (gpu)
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
        return
    }

    const canvas = document.getElementById("display")
    const context = canvas.getContext("webgpu")
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device,
        format: presentationFormat
    })



    const iconsCanvas = new OffscreenCanvas(canvas.clientWidth, canvas.clientHeight)
    const iCtx = iconsCanvas.getContext("2d")
    const speakerImg = new Image()
    speakerImg.src = "icons/speaker.png"



    let e1Pos = { x: 100, y: 100, grabbed: false }
    let e2Pos = { x: 400, y: 400, grabbed: false }
    let cursor = { x: 0, y: 0 }
    document.addEventListener("mousemove", function (e) {
        const canvasBounds = canvas.getBoundingClientRect()
        cursor = {
            x: e.clientX - canvasBounds.left,
            y: e.clientY - canvasBounds.top
        }

        if (e1Pos.grabbed) {
            e1Pos.x = clamp(cursor.x, 0, canvas.clientWidth)
            e1Pos.y = clamp(cursor.y, 0, canvas.clientHeight)
        }
        else if (e2Pos.grabbed) {
            e2Pos.x = clamp(cursor.x, 0, canvas.clientWidth)
            e2Pos.y = clamp(cursor.y, 0, canvas.clientHeight)
        }
    })
    document.addEventListener("mousedown", function (e) {
        if ((cursor.x - e1Pos.x) ** 2 + (cursor.y - e1Pos.y) ** 2 < (iconSize/2) ** 2) {
            e1Pos.grabbed = true
        }
        else if ((cursor.x - e2Pos.x) ** 2 + (cursor.y - e2Pos.y) ** 2 < (iconSize/2) ** 2) {
            e2Pos.grabbed = true
        }
    })
    document.addEventListener("mouseup", function (e) {
        e1Pos.grabbed = false
        e2Pos.grabbed = false
    })



    const linearSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    })



    const iconsTexture = device.createTexture({
        label: "texture with the icons in the right spots",
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
    })

    function updateIconsTexture() {
        const bitmap = iconsCanvas.transferToImageBitmap()
        device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: iconsTexture },
            [canvas.clientWidth, canvas.clientHeight]
        )
    }



    const pressureTexture = device.createTexture({
        label: "texture holding the real and imaginary components of the waves",
        format: "rg32float",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const pressureModule = device.createShaderModule({
        label: "module to update the wave",
        code: pressureCode.replace("_CANVASSIZE", `vec2u(${canvas.clientWidth}, ${canvas.clientHeight})`)
    })

    const pressurePipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: pressureModule
        }
    })

    const uniformsBuffer = device.createBuffer({
        size: 56,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const uniformsValues = new ArrayBuffer(56)
    const uniformsViews = {
        e1Pos: new Float32Array(uniformsValues, 0, 2),
        e1PhaseOffset: new Float32Array(uniformsValues, 8, 1),
        e1Amplitude: new Float32Array(uniformsValues, 12, 1),
        e1Frequency: new Float32Array(uniformsValues, 16, 1),
        e2Pos: new Float32Array(uniformsValues, 24, 2),
        e2PhaseOffset: new Float32Array(uniformsValues, 32, 1),
        e2Amplitude: new Float32Array(uniformsValues, 36, 1),
        e2Frequency: new Float32Array(uniformsValues, 40, 1),
        time: new Float32Array(uniformsValues, 44, 1),
        canvasWidth: new Float32Array(uniformsValues, 48, 1),
    }

    const pressureBindGroup = device.createBindGroup({
        label: "h",
        layout: pressurePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformsBuffer } },
            { binding: 1, resource: pressureTexture.createView() }
        ]
    })



    let pointsOrigins = []
    for (let i = 0; i < numPointsSqrt ** 2; i++) {
        pointsOrigins.push(
            Math.random() * canvas.clientWidth,
            Math.random() * canvas.clientHeight
        )
    }
    const pointsOriginsArray = new Float32Array(pointsOrigins)
    const pointsOriginsBuffer = device.createBuffer({
        label: "buffer containing the origins of the wiggling points",
        size: pointsOriginsArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(pointsOriginsBuffer, 0, pointsOriginsArray)

    const pointsBuffer = device.createBuffer({
        label: "buffer containing the current location of the points",
        size: pointsOriginsArray.byteLength,
        usage: GPUBufferUsage.STORAGE
    })

    const displaceModule = device.createShaderModule({
        label: "shader module displacing points depending on the speakers",
        code: displaceCode
            .replace("_CANVASSIZE", `vec2u(${canvas.clientWidth}, ${canvas.clientHeight})`)
            .replace("_NUMPOINTSSQRT", numPointsSqrt)
    })

    const displacePipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: displaceModule
        }
    })

    const displaceBindGroup = device.createBindGroup({
        layout: displacePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: pointsOriginsBuffer } },
            { binding: 1, resource: { buffer: uniformsBuffer } },
            { binding: 2, resource: { buffer: pointsBuffer } }
        ]
    })



    const drawPointsTexture = device.createTexture({
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const clearModule = device.createShaderModule({
        label: "module to clear a texture",
        code: clearCode
    })

    const clearPipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: clearModule
        }
    })

    const clearBindGroup = device.createBindGroup({
        layout: clearPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: drawPointsTexture.createView() }
        ]
    })



    const drawPointsModule = device.createShaderModule({
        code: drawPointsCode.replace("_NUMPOINTSSQRT", numPointsSqrt)
    })

    const drawPointsPipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: drawPointsModule
        }
    })

    const drawPointsBindGroup = device.createBindGroup({
        layout: drawPointsPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: pointsBuffer } },
            { binding: 1, resource: drawPointsTexture.createView() }
        ]
    })



    const displayModule = device.createShaderModule({
        label: "module to turn the wave information into an image",
        code: displayCode
    })

    const displayPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: displayModule }
    })

    const displayTexture = device.createTexture({
        label: "texture for the image representing the wave",
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const displayBindGroup = device.createBindGroup({
        layout: displayPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: pressureTexture.createView() },
            { binding: 1, resource: displayTexture.createView() }
        ]
    })



    const renderModule = device.createShaderModule({
        label: "module to render the wave",
        code: renderCode
    })

    const renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: renderModule },
        fragment: {
            module: renderModule,
            targets: [{ format: presentationFormat }]
        }
    })

    const renderPassDescriptor = {
        colorAttachments: [{
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: "clear",
            storeOp: "store"
        }]
    }

    const renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: displayTexture.createView() },
            { binding: 1, resource: drawPointsTexture.createView() },
            { binding: 2, resource: iconsTexture.createView() },
            { binding: 3, resource: linearSampler }
        ]
    })



    let timeOld = 0
    let t = 0
    function render(time) {

        const dt = time / 1000 - timeOld
        timeOld = time / 1000

        iCtx.clearRect(0, 0, iconsCanvas.clientWidth, iconsCanvas.clientWidth)
        iCtx.drawImage(speakerImg, e1Pos.x - iconSize / 2, e1Pos.y - iconSize / 2, iconSize, iconSize)
        iCtx.drawImage(speakerImg, e2Pos.x - iconSize / 2, e2Pos.y - iconSize / 2, iconSize, iconSize)
        updateIconsTexture()

        const timeScale = (document.getElementById("timeScale").value) ** 5
        document.getElementById("timeScaleDisplay").innerText = timeScale.toFixed(3) + "x real time"
        t += timeScale * dt

        uniformsViews.time[0] = t % 100

        const widthScale = document.getElementById("widthScale").value
        uniformsViews.canvasWidth[0] = widthScale

        // const amplitude = 343 / (Number(document.getElementById("e1Frequency").value) + Number(document.getElementById("e2Frequency").value)) / 2

        document.getElementById("e1PosDisplay").innerText = `(${(e1Pos.x * widthScale / canvas.clientWidth).toFixed(2)}, ${(widthScale - e1Pos.y * widthScale / canvas.clientHeight).toFixed(2)})`
        uniformsViews.e1Pos[0] = e1Pos.x; uniformsViews.e1Pos[1] = e1Pos.y
        uniformsViews.e1Amplitude[0] = document.getElementById("e1Amplitude").value
        // uniformsViews.e1Amplitude[0] = amplitude
        uniformsViews.e1Frequency[0] = document.getElementById("e1Frequency").value
        uniformsViews.e1PhaseOffset[0] = document.getElementById("e1PhaseOffset").value * Math.PI

        document.getElementById("e2PosDisplay").innerText = `(${(e2Pos.x * widthScale / canvas.clientWidth).toFixed(2)}, ${(widthScale - e2Pos.y * widthScale / canvas.clientHeight).toFixed(2)})`
        uniformsViews.e2Pos[0] = e2Pos.x; uniformsViews.e2Pos[1] = e2Pos.y
        uniformsViews.e2Amplitude[0] = document.getElementById("e2Amplitude").value
        // uniformsViews.e2Amplitude[0] = amplitude
        uniformsViews.e2Frequency[0] = document.getElementById("e2Frequency").value
        uniformsViews.e2PhaseOffset[0] = document.getElementById("e2PhaseOffset").value * Math.PI

        device.queue.writeBuffer(uniformsBuffer, 0, uniformsValues)



        const pressureEncoder = device.createCommandEncoder()
        const pressurePass = pressureEncoder.beginComputePass()
        pressurePass.setPipeline(pressurePipeline)
        pressurePass.setBindGroup(0, pressureBindGroup)
        pressurePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        pressurePass.end()

        const pressureCommandBuffer = pressureEncoder.finish()
        device.queue.submit([pressureCommandBuffer])



        const displaceEncoder = device.createCommandEncoder()
        const displacePass = displaceEncoder.beginComputePass()
        displacePass.setPipeline(displacePipeline)
        displacePass.setBindGroup(0, displaceBindGroup)
        displacePass.dispatchWorkgroups(numPointsSqrt, numPointsSqrt)
        displacePass.end()

        const displaceCommandBuffer = displaceEncoder.finish()
        device.queue.submit([displaceCommandBuffer])



        const clearEncoder = device.createCommandEncoder()
        const clearPass = clearEncoder.beginComputePass()
        clearPass.setPipeline(clearPipeline)
        clearPass.setBindGroup(0, clearBindGroup)
        clearPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        clearPass.end()

        const clearCommandBuffer = clearEncoder.finish()
        device.queue.submit([clearCommandBuffer])



        const drawPointsEncoder = device.createCommandEncoder()
        const drawPointsPass = drawPointsEncoder.beginComputePass()
        drawPointsPass.setPipeline(drawPointsPipeline)
        drawPointsPass.setBindGroup(0, drawPointsBindGroup)
        drawPointsPass.dispatchWorkgroups(numPointsSqrt, numPointsSqrt)
        drawPointsPass.end()

        const drawPointsCommandBuffer = drawPointsEncoder.finish()
        device.queue.submit([drawPointsCommandBuffer])



        const displayEncoder = device.createCommandEncoder()
        const displayPass = displayEncoder.beginComputePass()
        displayPass.setPipeline(displayPipeline)
        displayPass.setBindGroup(0, displayBindGroup)
        displayPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        displayPass.end()

        const displayCommandBuffer = displayEncoder.finish()
        device.queue.submit([displayCommandBuffer])



        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()

        const renderEncoder = device.createCommandEncoder()
        const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderPipeline)
        renderPass.setBindGroup(0, renderBindGroup)
        renderPass.draw(6)
        renderPass.end()

        const renderCommandBuffer = renderEncoder.finish()
        device.queue.submit([renderCommandBuffer])


        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

main()



/*

TODO:

add icons for where the speakers are
add a microphone that you can actually hear from
add option to see waves or sound intensity
add option to have amplitude drop off with distance

*/