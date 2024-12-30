import pressureDisplayCode from "./shaders/pressure.wgsl.js"
import renderCode from "./shaders/render.wgsl.js"

const iconSize = 40

let cursor = { x: 0, y: 0 }

const waveSpeed = 200 //(pixels per second)
const maxSpeakerSpeed = 0.9 * waveSpeed

const iterationsPerSpeakerUpdate = 10
const maxSpeakerPositions = Math.ceil(Math.sqrt(2)*document.getElementById("displayCanvas").clientWidth/waveSpeed/((1/144)*iterationsPerSpeakerUpdate))
console.log(maxSpeakerPositions)
let speakerPos = { x: 400, y: 400, grabbed: false }
let speakerPositions = []
const speakerFrequency = 1

function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max)
}

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
        format: presentationFormat
    })



    const linearSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    })



    const iconsCanvas = new OffscreenCanvas(canvas.clientWidth, canvas.clientHeight)
    const iCtx = iconsCanvas.getContext("2d")
    const speakerImg = new Image()
    speakerImg.src = "icons/speaker.png"
    const microphoneImg = new Image()
    microphoneImg.src = "icons/microphone.png"

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

    document.addEventListener("mousemove", function (e) {
        const canvasBounds = canvas.getBoundingClientRect()
        cursor = {
            x: e.clientX - canvasBounds.left,
            y: e.clientY - canvasBounds.top
        }
    })
    document.addEventListener("mousedown", function (e) {
        if ((cursor.x - speakerPos.x) ** 2 + (cursor.y - speakerPos.y) ** 2 < (iconSize / 2) ** 2) {
            speakerPos.grabbed = true
        }
    })
    document.addEventListener("mouseup", function (e) {
        speakerPos.grabbed = false
    })



    let speakerPositionsArray = new Float32Array(4 * maxSpeakerPositions)
    const speakerPositionsBuffer = device.createBuffer({
        size: speakerPositionsArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    const pressureUniformsBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const pressureUniformsValues = new ArrayBuffer(4)
    const pressureUniformsViews = {
        time: new Float32Array(pressureUniformsValues),
    }

    const pressureDisplayTexture = device.createTexture({
        label: "texture for displaying the pressure in the scene",
        format: "rgba8unorm",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const pressureDisplayModule = device.createShaderModule({
        label: "module to display the pressure at every point in the scene",
        code: pressureDisplayCode
            .replace("_CANVASSIZE", `vec2u(${canvas.clientWidth}, ${canvas.clientHeight})`)
            .replace("_MAXSPEAKERPOSITIONS", maxSpeakerPositions)
            .replace("_WAVESPEED", waveSpeed)
    })

    const pressureDisplayPipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
            module: pressureDisplayModule
        }
    })

    const pressureDisplayBindGroup = device.createBindGroup({
        layout: pressureDisplayPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: speakerPositionsBuffer } },
            { binding: 1, resource: pressureDisplayTexture.createView() },
            { binding: 2, resource: { buffer: pressureUniformsBuffer } }
        ]
    })



    const renderModule = device.createShaderModule({
        label: "module to render to the screen",
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
            { binding: 0, resource: linearSampler },
            { binding: 1, resource: pressureDisplayTexture.createView() },
            { binding: 2, resource: iconsTexture.createView() }
        ]
    })


    let lastTime = 0
    let iteration = 0
    function render(time) {
        iteration++

        const dt = (time - lastTime) / 1000
        lastTime = time

        // moving the speaker
        if (speakerPos.grabbed) {
            const positionDifference = { x: cursor.x - speakerPos.x, y: cursor.y - speakerPos.y }
            const positionDifferenceMag = Math.sqrt(positionDifference.x ** 2 + positionDifference.y ** 2)

            if (positionDifferenceMag > maxSpeakerSpeed * dt) { // getting to the mouse would require going faster than the speed limit, so make it lag behind
                const positionDifferenceClamped = {
                    x: positionDifference.x / positionDifferenceMag * maxSpeakerSpeed * dt,
                    y: positionDifference.y / positionDifferenceMag * maxSpeakerSpeed * dt
                }
                speakerPos.x = clamp(speakerPos.x + positionDifferenceClamped.x, 0, canvas.clientWidth)
                speakerPos.y = clamp(speakerPos.y + positionDifferenceClamped.y, 0, canvas.clientHeight)
            }
            else {
                speakerPos.x = clamp(cursor.x, 0, canvas.clientWidth)
                speakerPos.y = clamp(cursor.y, 0, canvas.clientHeight)
            }
        }

        // every few frames, update the gpu about the speaker
        if (iteration % iterationsPerSpeakerUpdate == 0) {
            speakerPositions.push({ x: speakerPos.x, y: speakerPos.y, t: time / 1000 })
            if (speakerPositions.length > maxSpeakerPositions) {
                speakerPositions.splice(0, speakerPositions.length - maxSpeakerPositions)
            }

            // copying speakerPositions to a buffer for the gpu
            speakerPositionsArray = new Float32Array(speakerPositions.flatMap(({ x, y, t }) => [x, y, t, 0]))
            device.queue.writeBuffer(speakerPositionsBuffer, 0, speakerPositionsArray)
        }



        iCtx.clearRect(0, 0, iconsCanvas.clientWidth, iconsCanvas.clientWidth)
        iCtx.drawImage(speakerImg, speakerPos.x - iconSize / 2, speakerPos.y - iconSize / 2, iconSize, iconSize)
        updateIconsTexture()



        pressureUniformsViews.time[0] = time / 1000
        device.queue.writeBuffer(pressureUniformsBuffer, 0, pressureUniformsValues)

        const pressureDisplayEncoder = device.createCommandEncoder()
        const pressureDisplayPass = pressureDisplayEncoder.beginComputePass()
        pressureDisplayPass.setPipeline(pressureDisplayPipeline)
        pressureDisplayPass.setBindGroup(0, pressureDisplayBindGroup)
        pressureDisplayPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        pressureDisplayPass.end()

        const pressureDisplayCommandBuffer = pressureDisplayEncoder.finish()
        device.queue.submit([pressureDisplayCommandBuffer])



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

keep track of where the speaker is and its phase through time
for each pixel, look back through time, the phase of the wave at this pixel will be the phase of the speaker at a time t such that t=v/x, where x was its distance away at that time
to get the frequency at a point, check dp/dt of the speaker at the time described above

*/