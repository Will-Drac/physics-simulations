import startCode from "./shaders/start.wgsl.js"
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
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device,
        format: presentationFormat
    })



    const linearSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    })



    let waveTextures = []
    for (let i = 0; i < 2; i++) {
        waveTextures.push(
            device.createTexture({
                label: "texture storing the real and imaginary component of the wave " + i,
                format: "rg32float",
                size: [canvas.clientWidth, canvas.clientHeight],
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            })
        )
    }



    // before the simulation starts, place a particle in the scene (a compute shader with one thread)
    const startModule = device.createShaderModule({
        label: "module to get the simulation started",
        code: startCode
    })

    const startPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: startModule }
    })

    const startBindGroup = device.createBindGroup({
        layout: startPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: waveTextures[0].createView() }
        ]
    })

    const startEncoder = device.createCommandEncoder()
    const startPass = startEncoder.beginComputePass()
    startPass.setPipeline(startPipeline)
    startPass.setBindGroup(0, startBindGroup)
    startPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
    startPass.end()

    const startCommandBuffer = startEncoder.finish()
    device.queue.submit([startCommandBuffer])



    const updateModule = device.createShaderModule({
        label: "module to update the wave",
        code: updateCode
    })

    const updatePipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: updateModule }
    })

    // bind group set in render



    const displayTexture = device.createTexture({
        label: "texture storing to be displayed to the screen",
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const displayModule = device.createShaderModule({
        label: "module to create the display texture for the wave",
        code: displayCode
    })

    const displayPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: displayModule }
    })

    // bind group set in render



    const renderModule = device.createShaderModule({
        label: "module to render the wave",
        code: renderCode
    })

    const renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: renderModule,
        },
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
            { binding: 0, resource: linearSampler },
            { binding: 1, resource: displayTexture.createView() }
        ]
    })

    let currentWaveTexture = 0
    function render(time) {

        for (let i = 0; i < 50; i++) {
            currentWaveTexture = (currentWaveTexture + 1) % 2

            const updateBindGroup = device.createBindGroup({
                layout: updatePipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: waveTextures[currentWaveTexture].createView() }, //the one being written to
                    { binding: 1, resource: waveTextures[(currentWaveTexture + 1) % 2].createView() } //the last one that was updated
                ]
            })

            const updateEncoder = device.createCommandEncoder()
            const updatePass = updateEncoder.beginComputePass()
            updatePass.setPipeline(updatePipeline)
            updatePass.setBindGroup(0, updateBindGroup)
            updatePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
            updatePass.end()

            const updateCommandBuffer = updateEncoder.finish()
            device.queue.submit([updateCommandBuffer])
        }



        const displayBindGroup = device.createBindGroup({
            layout: displayPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: displayTexture.createView() },
                { binding: 1, resource: waveTextures[currentWaveTexture].createView() }
            ]
        })

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