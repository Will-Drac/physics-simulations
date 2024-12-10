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



    const linearSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    })



    const waveTexture = device.createTexture({
        label: "texture holding the real and imaginary components of the waves",
        format: "rg32float",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })


    const updateModule = device.createShaderModule({
        label: "module to update the wave",
        code: updateCode
    })

    const updatePipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: updateModule
        }
    })

    const uniformsBuffer = device.createBuffer({
        size: 68,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const uniformsValues = new ArrayBuffer(48)
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
    }

    const updateBindGroup = device.createBindGroup({
        label: "h",
        layout: updatePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformsBuffer } },
            { binding: 1, resource: waveTexture.createView() }
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
            { binding: 0, resource: waveTexture.createView() },
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
            { binding: 1, resource: linearSampler }
        ]
    })



    let iterations = 0
    function render(time) {

        uniformsViews.time[0] = time/10000

        uniformsViews.e1Pos[0] = 100; uniformsViews.e1Pos[1] = 100
        uniformsViews.e1Amplitude[0] = 1
        uniformsViews.e1PhaseOffset[0] = 0
        uniformsViews.e1Frequency[0] = 20

        uniformsViews.e2Pos[0] = 400+100*Math.sin(time/1000); uniformsViews.e2Pos[1] = 400
        uniformsViews.e2Amplitude[0] = 1
        uniformsViews.e2PhaseOffset[0] = 0
        uniformsViews.e2Frequency[0] = 20

        device.queue.writeBuffer(uniformsBuffer, 0, uniformsValues)



        const updateEncoder = device.createCommandEncoder()
        const updatePass = updateEncoder.beginComputePass()
        updatePass.setPipeline(updatePipeline)
        updatePass.setBindGroup(0, updateBindGroup)
        updatePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        updatePass.end()

        const updateCommandBuffer = updateEncoder.finish()
        device.queue.submit([updateCommandBuffer])



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

control everything about the emitters
add option to see waves or sound intensity
add option to have amplitude drop off with distance

*/