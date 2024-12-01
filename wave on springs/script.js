const numPoints = 1500
const padding = 30

import clearCode from "./shaders/clear.wgsl.js"
import updateCode from "./shaders/update.wgsl.js"
import displayCode from "./shaders/display.wgsl.js"
import renderCode from "./shaders/render.wgsl.js"

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
    const canvasBounds = canvas.getBoundingClientRect()
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device,
        format: presentationFormat
    })

    let cursor = { x: 0, y: 0 }
    document.addEventListener("mousemove", function (e) {
        cursor = {
            x: e.clientX - canvasBounds.left,
            y: e.clientY - canvasBounds.top
        }
    })
    let mouseDown = false
    document.addEventListener("mousedown", function (e) { mouseDown = true })
    document.addEventListener("mouseup", function (e) { mouseDown = false })

    const linearSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    })



    const displayTexture = device.createTexture({
        label: "texture that will be displayed to the screen",
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
            { binding: 0, resource: displayTexture.createView() }
        ]
    })



    const updateModule = device.createShaderModule({
        label: "updating spring module",
        code: updateCode
            .replace("_NUMPOINTS", numPoints)
            .replace("_POINTSPACING", (canvas.clientWidth-2*padding)/numPoints)
    })

    const updatePipeline = device.createComputePipeline({
        label: "updating spring pipeline",
        layout: "auto",
        compute: {
            module: updateModule
        }
    })

    const pointsBuffers = [
        device.createBuffer({
            label: "buffer for all the points 1",
            size: numPoints * 4,
            usage: GPUBufferUsage.STORAGE
        }),
        device.createBuffer({
            label: "buffer for all the points 2",
            size: numPoints * 4,
            usage: GPUBufferUsage.STORAGE
        }),
    ]

    const waveUniformsBuffer = device.createBuffer({
        size: 12,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const waveUniformsValues = new ArrayBuffer(12)
    const waveUniformsViews = {
        startValue: new Float32Array(waveUniformsValues, 0, 1),
        tension: new Float32Array(waveUniformsValues, 4, 1),
        massPerLength: new Float32Array(waveUniformsValues, 8, 1),
    }



    const displayModule = device.createShaderModule({
        label: "displaying spring module",
        code: displayCode
            .replace("_NUMPOINTS", numPoints)
            .replace("_TEXTURESIZE", `vec2u(${canvas.clientWidth}, ${canvas.clientHeight})`)
            .replace("_SIDEPADDING", padding)
    })

    const displayPipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: displayModule
        }
    })



    const renderModule = device.createShaderModule({
        label: "render module",
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
            { binding: 1, resource: linearSampler }
        ]
    })



    let iterations = 0
    function render(time) {
        iterations++

        const clearEncoder = device.createCommandEncoder()
        const clearPass = clearEncoder.beginComputePass()
        clearPass.setPipeline(clearPipeline)
        clearPass.setBindGroup(0, clearBindGroup)
        clearPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        clearPass.end()

        const clearCommandBuffer = clearEncoder.finish()
        device.queue.submit([clearCommandBuffer])



        waveUniformsViews.startValue[0] = mouseDown ? cursor.y - canvas.clientHeight / 2 : 0
        waveUniformsViews.tension[0] = 10
        waveUniformsViews.massPerLength[0] = 1
        device.queue.writeBuffer(waveUniformsBuffer, 0, waveUniformsValues)

        const updateBindGroup = device.createBindGroup({
            label: "updating spring bind group",
            layout: updatePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: pointsBuffers[iterations % 2] } }, //the current one to update
                { binding: 1, resource: { buffer: pointsBuffers[(iterations + 1) % 2] } }, //the last one, information needed for the new update
                { binding: 2, resource: { buffer: waveUniformsBuffer } }
            ]
        })

        const updateEncoder = device.createCommandEncoder()
        const updatePass = updateEncoder.beginComputePass()
        updatePass.setPipeline(updatePipeline)
        updatePass.setBindGroup(0, updateBindGroup)
        updatePass.dispatchWorkgroups(numPoints)
        updatePass.end()

        const updateCommandBuffer = updateEncoder.finish()
        device.queue.submit([updateCommandBuffer])



        const displayBindGroup = device.createBindGroup({
            layout: displayPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: pointsBuffers[iterations % 2] } },
                { binding: 1, resource: displayTexture.createView() }
            ]
        })

        const displayEncoder = device.createCommandEncoder()
        const displayPass = displayEncoder.beginComputePass()
        displayPass.setPipeline(displayPipeline)
        displayPass.setBindGroup(0, displayBindGroup)
        displayPass.dispatchWorkgroups(numPoints - 1)
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