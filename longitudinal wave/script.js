import bgCode from "./shaders/bg.wgsl.js"
import wiggleCode from "./shaders/wiggle.wgsl.js"
import drawCode from "./shaders/draw.wgsl.js"
import renderCode from "./shaders/render.wgsl.js"

const numPoints = 65535

async function main() {
    // set up the device
    const adapter = await navigator.gpu?.requestAdapter()
    const device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
        return
    }

    const canvas = document.querySelector("canvas")
    const context = canvas.getContext("webgpu")
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device,
        format: presentationFormat,
    })

    // ---------------------------------------------------

    const timeValue = new Float32Array(1)
    timeValue.set([0])
    const timeBuffer = device.createBuffer({
        size: timeValue.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const waveControlsValues = new ArrayBuffer(12)
    const waveControlsViews = {
        wavelength: new Float32Array(waveControlsValues, 0, 1),
        period: new Float32Array(waveControlsValues, 4, 1),
        amplitude: new Float32Array(waveControlsValues, 8, 1),
    }
    const waveControlsBuffer = device.createBuffer({
        size: 12,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    // ---------------------------------------------------

    const drawTexture = device.createTexture({
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const bgModule = device.createShaderModule({
        code: bgCode
    })

    const bgPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: bgModule }
    })

    const bgBindGroup = device.createBindGroup({
        layout: bgPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: timeBuffer } },
            { binding: 1, resource: { buffer: waveControlsBuffer } },
            { binding: 2, resource: drawTexture.createView() }
        ]
    })

    // ---------------------------------------------------

    const wiggleModule = device.createShaderModule({
        label: "points wiggle compute module",
        code: wiggleCode
    })

    const wigglePipeline = device.createComputePipeline({
        label: "points wiggle compute pipeline",
        layout: "auto",
        compute: {
            module: wiggleModule
        }
    })

    let pointsOrigins = [] //this will hold the original positions of the particles
    for (let i = 0; i < numPoints; i++) {
        pointsOrigins.push(
            Math.random() * canvas.clientWidth,
            Math.random() * canvas.clientHeight
        )
    }

    const pointsOriginsArray = new Float32Array(pointsOrigins)

    const originsBuffer = device.createBuffer({
        label: "buffer containing the points origins",
        size: pointsOriginsArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(originsBuffer, 0, pointsOriginsArray)

    const pointsBuffer = device.createBuffer({
        label: "buffer containing the points positions",
        size: pointsOriginsArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(pointsBuffer, 0, pointsOriginsArray)

    const wiggleBindGroup = device.createBindGroup({
        layout: wigglePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: originsBuffer } },
            { binding: 1, resource: { buffer: pointsBuffer } },
            { binding: 2, resource: { buffer: timeBuffer } },
            { binding: 3, resource: { buffer: waveControlsBuffer } }
        ]
    })

    // ---------------------------------------------------

    const drawPointsModule = device.createShaderModule({
        code: drawCode
    })

    const drawPipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: drawPointsModule
        }
    })

    const drawBindGroup = device.createBindGroup({
        layout: drawPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: pointsBuffer } },
            { binding: 1, resource: drawTexture.createView() }
        ]
    })

    // ---------------------------------------------------

    const renderModule = device.createShaderModule({
        code: renderCode
    })

    const renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: renderModule },
        fragment: { module: renderModule, targets: [{ format: presentationFormat }] }
    })

    const linearSampler = device.createSampler({
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
    })

    const renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: drawTexture.createView() },
            { binding: 1, resource: linearSampler }
        ]
    })

    const renderPassDescriptor = {
        colorAttachments: [{
            // view: <- to be filled out when we render
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: "clear",
            storeOp: "store"
        }]
    }

    // ---------------------------------------------------

    let lastTime = 0
    function render(time) {
        const t = time / 1000
        let deltaTime = t - lastTime
        lastTime = t

        // ---------------------------------------------------

        // set the time
        timeValue.set([t])
        device.queue.writeBuffer(timeBuffer, 0, timeValue)


        document.getElementById("wavelengthValue").innerText = (waveControlsViews.wavelength[0] = document.getElementById("wavelengthSlider").value) + " px"
        document.getElementById("periodValue").innerText = (waveControlsViews.period[0] = document.getElementById("periodSlider").value) + " s"
        document.getElementById("amplitudeValue").innerText = (waveControlsViews.amplitude[0] = document.getElementById("amplitudeSlider").value) + " px"
        device.queue.writeBuffer(waveControlsBuffer, 0, waveControlsValues)

        document.getElementById("speedDisplay").innerText = (waveControlsViews.wavelength[0]/waveControlsViews.period[0]).toFixed(2) + " px/s"

        // ---------------------------------------------------

        // draw the background
        const bgEncoder = device.createCommandEncoder()
        const bgPass = bgEncoder.beginComputePass()
        bgPass.setPipeline(bgPipeline)
        bgPass.setBindGroup(0, bgBindGroup)
        bgPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight) //run the compute shader once on every point
        bgPass.end()

        const bgCommandBuffer = bgEncoder.finish()
        device.queue.submit([bgCommandBuffer])

        // ---------------------------------------------------

        // wiggle the points
        const wiggleEncoder = device.createCommandEncoder()
        const wigglePass = wiggleEncoder.beginComputePass()
        wigglePass.setPipeline(wigglePipeline)
        wigglePass.setBindGroup(0, wiggleBindGroup)
        wigglePass.dispatchWorkgroups(pointsOriginsArray.length / 2) //run the compute shader once on every point
        wigglePass.end()

        const wiggleCommandBuffer = wiggleEncoder.finish()
        device.queue.submit([wiggleCommandBuffer])

        // ---------------------------------------------------

        // draw the wiggled points to a texture
        const drawEncoder = device.createCommandEncoder()
        const drawPass = drawEncoder.beginComputePass()
        drawPass.setPipeline(drawPipeline)
        drawPass.setBindGroup(0, drawBindGroup)
        drawPass.dispatchWorkgroups(pointsOriginsArray.length / 2) //run the compute shader once on every point
        drawPass.end()

        const drawCommandBuffer = drawEncoder.finish()
        device.queue.submit([drawCommandBuffer])

        // ---------------------------------------------------

        // draw the texture to the screen

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()

        const renderEncoder = device.createCommandEncoder()
        const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderPipeline)
        renderPass.setBindGroup(0, renderBindGroup)
        renderPass.draw(6) //call it 6 times, 3 vertices for 2 triangles to make a quad
        renderPass.end()

        const renderCommandBuffer = renderEncoder.finish()
        device.queue.submit([renderCommandBuffer])

        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
main()

