import pressureDisplayCode from "./shaders/pressure.wgsl.js"
import renderCode from "./shaders/render.wgsl.js"

const iconSize = 40

let cursor = { x: 0, y: 0 }

const waveSpeed = 100 //(pixels per second)
const speakerFrequency = 2
const maxSpeakerSpeed = 0.9 * waveSpeed

const iterationsPerSpeakerUpdate = 10
const maxSpeakerPositions = Math.ceil(Math.sqrt(2) * document.getElementById("displayCanvas").clientWidth / waveSpeed / ((1 / 144) * iterationsPerSpeakerUpdate))

let speakerPos = { x: 400, y: 400, grabbed: false }
let speakerVel = { x: 0, y: 0 }
let speakerAccelerationConstant = 1
let speakerPositions = []



let microphonePos = { x: 400, y: 600, grabbed: false }

let audioContext, oscillator, audioGainNode
let audioPlaying = false
let audioFrequency = 200
document.getElementById("audioStartButton").addEventListener("click", function () {
    if (audioPlaying) { return }
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    oscillator = audioContext.createOscillator()
    oscillator.type = "sine"
    audioGainNode = audioContext.createGain()
    oscillator.connect(audioGainNode)
    audioGainNode.connect(audioContext.destination)
    oscillator.start()

    oscillator.frequency.setValueAtTime(audioFrequency, audioContext.currentTime)

    audioPlaying = true
})
document.getElementById("audioStopButton").addEventListener("click", function () {
    if (oscillator) { oscillator.stop() }

    audioPlaying = false
})

document.getElementById("frequencyInput").addEventListener("change", function () {
    audioFrequency = Number(document.getElementById("frequencyInput").value)
})
document.getElementById("volumeInput").addEventListener("change", function () {
    audioGainNode.gain.setValueAtTime(document.getElementById("volumeInput").value, audioContext.currentTime)
})



function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max)
}

function checkSpeakerPos(speakerPosition, samplePosition, time) {
    return waveSpeed * (time - speakerPosition.t) / Math.sqrt((speakerPosition.x - samplePosition.x) ** 2 + (speakerPosition.y - samplePosition.y) ** 2)
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin
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
        if ((cursor.x - microphonePos.x) ** 2 + (cursor.y - microphonePos.y) ** 2 < (iconSize / 2) ** 2) {
            microphonePos.grabbed = true
        }
        else if ((cursor.x - speakerPos.x) ** 2 + (cursor.y - speakerPos.y) ** 2 < (iconSize / 2) ** 2) {
            speakerPos.grabbed = true
        }
    })
    document.addEventListener("mouseup", function (e) {
        microphonePos.grabbed = false
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
            .replace("_FREQUENCY", speakerFrequency)
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

        // moving the microphone
        if (microphonePos.grabbed) {
            microphonePos.x = clamp(cursor.x, 0, canvas.clientWidth)
            microphonePos.y = clamp(cursor.y, 0, canvas.clientWidth)
        }
        // moving the speaker
        else if (speakerPos.grabbed) {
            const positionDifference = { x: cursor.x - speakerPos.x, y: cursor.y - speakerPos.y }
            const positionDifferenceMag = Math.sqrt(positionDifference.x ** 2 + positionDifference.y ** 2)
            const positionDifferenceDir = {
                x: positionDifference.x / positionDifferenceMag,
                y: positionDifference.y / positionDifferenceMag
            }
            const d = 10 * Math.min(positionDifferenceMag, 50)
            speakerVel = {
                x: speakerVel.x + speakerAccelerationConstant * d * positionDifferenceDir.x,
                y: speakerVel.y + speakerAccelerationConstant * d * positionDifferenceDir.y,
            }
            const speakerVelMag = Math.sqrt(speakerVel.x ** 2 + speakerVel.y ** 2)
            const speakerVelDir = {
                x: speakerVel.x / speakerVelMag,
                y: speakerVel.y / speakerVelMag
            }

            const newSpeakerVelMag = maxSpeakerSpeed * (speakerVelMag / (maxSpeakerSpeed + speakerVelMag))
            speakerVel = {
                x: newSpeakerVelMag * speakerVelDir.x,
                y: newSpeakerVelMag * speakerVelDir.y
            }
        }
        else if (!speakerPos.grabbed) {
            speakerVel = {
                x: speakerVel.x * 0.9,
                y: speakerVel.y * 0.9
            }
        }
        speakerPos = {
            x: speakerPos.x + speakerVel.x * dt,
            y: speakerPos.y + speakerVel.y * dt,
            grabbed: speakerPos.grabbed
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
        iCtx.drawImage(microphoneImg, microphonePos.x - iconSize / 2, microphonePos.y - iconSize / 2, iconSize, iconSize)
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



        // playing audio from the microphone
        if (audioPlaying) {
            for (let i = 0; i < speakerPositions.length - 1; i++) {
                const vThis = speakerPositions[i]
                const vNext = speakerPositions[i + 1]

                const cThis = checkSpeakerPos(vThis, microphonePos, time / 1000)
                const cNext = checkSpeakerPos(vNext, microphonePos, time / 1000)
                if (cThis >= 1 && cNext <= 1) {
                    const midX = mapRange(1, cThis, cNext, vThis.x, vNext.x)
                    const midY = mapRange(1, cThis, cNext, vThis.y, vNext.y)

                    // vector from the microphone to the speaker
                    const r = { x: midX - microphonePos.x, y: midY - microphonePos.y }

                    // change in position of the speaker
                    const dx = vNext.x - vThis.x
                    const dy = vNext.y - vThis.y

                    // change in position of the speaker perpendicular to the line between the microphone and the speaker
                    const ds = (dx * r.x + dy * r.y) / Math.sqrt(r.x * r.x + r.y * r.y)

                    const dt = vNext.t - vThis.t

                    const dopplerShift = (waveSpeed / (waveSpeed + (ds / dt)))

                    oscillator.frequency.setValueAtTime(audioFrequency * dopplerShift, audioContext.currentTime)
                }
            }
        }



        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

main()