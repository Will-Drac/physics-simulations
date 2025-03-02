import emitterTemplate from "./shaders/emitterTemplate.wgsl.js"
import computeBoundariesCode from "./shaders/computeBoundaries.wgsl.js"
import obstaclesDisplayCode from "./shaders/obstaclesDisplay.wgsl.js"
import updateBoundaryCode from "./shaders/updateBoundary.wgsl.js"
import updateCode from "./shaders/updateWave.wgsl.js"
import colorCode from "./shaders/color.wgsl.js"
import waveDisplayCode from "./shaders/waveDisplay.wgsl.js"
import renderCode from "./shaders/renderWave.wgsl.js"



let shouldStop = false
document.getElementById("startButton").addEventListener("click", function () {
    shouldStop = true
})



class Emitter {
    constructor() {
        this.pos = { x: 300, y: 300 } //in the case of an area emitter, this is the center
        this.col = { r: 255, g: 255, b: 255 }
        this.type = "Point"
        this.size = 0 // if you have an area emitter that emits along 15 pixels, this will be (15-1)/2 = 7
        this.direction = { x: 1, y: 0 } //for area emitters, a unit vector that points from one end to the other
    }
}

let emitters = []

document.getElementById("addEmitter").addEventListener("click", function () {
    emitters.push(new Emitter())

    compileEmitterShaders()
    updateEmittersHTML()
})

function updateEmittersHTML() {
    const div = document.getElementById("emitters")
    div.innerHTML = ""

    for (let i = 0; i < emitters.length; i++) {
        const container = document.createElement("div")
        container.classList.add("emitterContainer")
        div.append(container)

        function rgbToHex(r, g, b) {
            r = Math.round(r * 255)
            g = Math.round(g * 255)
            b = Math.round(b * 255)
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
        }
        const color = document.createElement("input")
        color.type = "color"
        color.value = rgbToHex(emitters[i].col.r, emitters[i].col.g, emitters[i].col.b)
        container.append(color)

        color.addEventListener("input", function (e) {
            function hexToRgb(hex) {
                let r = 0, g = 0, b = 0
                if (hex.length == 4) {
                    r = parseInt(hex[1] + hex[1], 16)
                    g = parseInt(hex[2] + hex[2], 16)
                    b = parseInt(hex[3] + hex[3], 16)
                } else if (hex.length == 7) {
                    r = parseInt(hex[1] + hex[2], 16)
                    g = parseInt(hex[3] + hex[4], 16)
                    b = parseInt(hex[5] + hex[6], 16)
                }
                return { r: r / 255, g: g / 255, b: b / 255 }
            }

            const rgb = hexToRgb(e.target.value)
            emitters[i].col = rgb

            compileEmitterShaders()
        })

        const type = document.createElement("select")
        container.append(type)

        const typePoint = document.createElement("option")
        typePoint.innerText = "Point"
        type.append(typePoint)

        const typeArea = document.createElement("option")
        typeArea.innerText = "Area"
        type.append(typeArea)

        type.value = emitters[i].type

        type.addEventListener("input", function (e) {
            emitters[i].type = e.target.value

            if (e.target.value == "Point") {
                emitters[i].size = 0
            }
            else if (e.target.value == "Area") {
                emitters[i].size = 25
            }

            compileEmitterShaders()
        })

        const remove = document.createElement("span")
        remove.style = "background: rgb(40, 50, 50); color: white; padding: 5px; border-radius: 5px;"
        remove.innerText = "Remove"
        container.append(remove)

        remove.addEventListener("click", function () {
            emitters.splice(i, 1)
            compileEmitterShaders()
            updateEmittersHTML()
        })
    }
}

let emittersCode = []
function compileEmitterShaders() {
    emittersCode = []
    for (let i = 0; i < emitters.length; i++) {
        let e = emitters[i]
        let c = emitterTemplate

        c = c.replaceAll("_POS", `${e.pos.x}, ${e.pos.y}`)
        c = c.replaceAll("_DIRVEC", `${e.direction.x}, ${e.direction.y}`)
        c = c.replaceAll("_SIZE", e.size)

        emittersCode.push({ code: c, numPixels: 2 * e.size + 1 })
    }
}



async function start(device) {
    let obstacleTexture = await loadTexture(
        document.getElementById("obstacleSelect").value,
        device
    )

    let iorTexture = await loadTexture(
        document.getElementById("IORSelect").value,
        device
    )

    let numWavelengths = Number(document.getElementById("numWavelengths").value)
    main({ obstacleTexture, iorTexture, emittersCode, numWavelengths })
}

// a function to load an external image as a texture
async function loadTexture(url, device) {

    async function loadImageBitmap(url) {
        const res = await fetch(url)
        const blob = await res.blob()
        return await createImageBitmap(blob, { colorSpaceConversion: "none" })
    }

    const source = await loadImageBitmap(url)
    const texture = device.createTexture({ // this is the actual texture object that webgpu know what to do with
        label: url,
        format: "rgba8unorm", // <- rgba means red, green, blue, and alpha; 8 means each of those is 8 bits; unorm means unsigned and normalized (values from 0 to 1)
        size: [source.width, source.height],
        usage:
            GPUTextureUsage.TEXTURE_BINDING | //we want to use it as a texture in a bind group
            GPUTextureUsage.COPY_DST | //we want to copy something to it (the next thing we do)
            GPUTextureUsage.RENDER_ATTACHMENT //also need this to copy something to it
    })

    device.queue.copyExternalImageToTexture(
        { source, flipY: false },
        { texture },
        { width: source.width, height: source.height }
    )

    return texture
}

let device; let canvas; let context; let presentationFormat
// runs once when the page is first opened
async function setup() {
    // set up the device (gpu)
    const adapter = await navigator.gpu?.requestAdapter()
    device = await adapter?.requestDevice()
    if (!device) {
        alert("need a browser that supports WebGPU")
        return
    }

    // get the canvas from the html
    canvas = document.getElementById("mainCanvas")
    context = canvas.getContext("webgpu")

    // the gpu prefers a format to use when rendering
    presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device,
        format: presentationFormat,
    })

    start(device)
}
setup()

async function main(scene) {
    // Tells the fragment shader how to sample images. This blends pixels linearly and repeats the image for values out of the bounds of [0, 1]
    const linearSampler = device.createSampler({
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
    })

    // -----------------textures setup----------------- //

    const obstaclesTexture = scene.obstacleTexture
    const iorTexture = scene.iorTexture

    // to do the simulation (to approximate a second derivative), I need to store 3 frames: this one, the last one, and the before-last one
    // so I have an array of 3 and cycle through them, keeping track of which is the most recent
    let waveTextures = []
    let lastUpdatedTexture = 2 //keeps track of which is the latest
    for (let i = 0; i < 3; i++) {
        waveTextures[i] = device.createTexture({
            label: "wave texture " + i,
            format: "rg32float",
            dimension: "3d",
            size: [canvas.clientWidth, canvas.clientHeight, scene.numWavelengths],
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING // <- storage binding because it's going to be the output of a compute shader (to do that, it needs to be a storage texture), texture binding because it's going to be the input of another compute shader (to do that it needs to be a regular texture)
        })
    }

    // -----------------computing boundaries----------------- //

    const boundariesTexture = device.createTexture({
        label: "texture containing the boundaries of the simulation",
        format: "rg32float",
        dimension: "2d",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const computeBoundariesModule = device.createShaderModule({
        label: "module to compute the boundaries",
        code: computeBoundariesCode
    })

    const computeBoundariesPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: computeBoundariesModule }
    })

    const computeBoundariesBindGroup = device.createBindGroup({
        layout: computeBoundariesPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: boundariesTexture.createView() },
            { binding: 1, resource: obstaclesTexture.createView() }
        ]
    })

    const computeBoundariesEncoder = device.createCommandEncoder()
    const computeBoundariesPass = computeBoundariesEncoder.beginComputePass()
    computeBoundariesPass.setPipeline(computeBoundariesPipeline)
    computeBoundariesPass.setBindGroup(0, computeBoundariesBindGroup)
    computeBoundariesPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
    computeBoundariesPass.end()

    const computeBoundariesCommandBuffer = computeBoundariesEncoder.finish()
    device.queue.submit([computeBoundariesCommandBuffer])

    // -----------------making a texture to display obstacles----------------- //

    const obstacleDisplayTexture = device.createTexture({
        label: "texture with the obstacle texture to be displayed",
        format: "rgba8unorm",
        dimension: "2d",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    })

    const obstacleDisplayModule = device.createShaderModule({
        label: "module to make a display texture for the obstacles",
        code: obstaclesDisplayCode
    })

    const obstacleDisplayPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: obstacleDisplayModule }
    })

    const obstacleDisplayBindGroup = device.createBindGroup({
        layout: obstacleDisplayPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: obstacleDisplayTexture.createView() },
            { binding: 1, resource: scene.obstacleTexture.createView() },
            { binding: 2, resource: boundariesTexture.createView() }
        ]
    })

    const obstacleDisplayEncoder = device.createCommandEncoder()
    const obstacleDisplayPass = obstacleDisplayEncoder.beginComputePass()
    obstacleDisplayPass.setPipeline(obstacleDisplayPipeline)
    obstacleDisplayPass.setBindGroup(0, obstacleDisplayBindGroup)
    obstacleDisplayPass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
    obstacleDisplayPass.end()

    const obstacleDisplayCommandBuffer = obstacleDisplayEncoder.finish()
    device.queue.submit([obstacleDisplayCommandBuffer])

    // -----------------emit setup----------------- //

    let emittersSetup = []
    for (let i = 0; i < emittersCode.length; i++) {
        const module = device.createShaderModule({
            label: `module for emitter ${i}`,
            code: emittersCode[i].code.replace("_NUMWAVELENGTHS", `const numWavelengths = ${scene.numWavelengths};`)
        })

        const pipeline = device.createComputePipeline({
            label: `pipeline for emitter ${i}`,
            layout: "auto",
            compute: { module }
        })

        emittersSetup.push({ module, pipeline, numPixels:emittersCode[i].numPixels })
    }

    const emitUniformsBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const emitUniformsValues = new ArrayBuffer(4)
    const emitUniformsViews = {
        time: new Float32Array(emitUniformsValues, 0, 1),
    }

    emitUniformsViews.time[0] = 0

    // bind group set later


    // -----------------update boundary setup-----------------//

    const updateBoundaryModule = device.createShaderModule({
        label: "update boundary texels module",
        code:
            updateBoundaryCode
                .replace("_NUMWAVELENGTHS", `const numWavelengths = ${scene.numWavelengths};`)
    })

    const updateBoundaryPipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: updateBoundaryModule }
    })

    // bind group set later


    // -----------------update setup----------------- //

    const updateModule = device.createShaderModule({
        label: "wave update shader module",
        code:
            updateCode
                .replace("_NUMWAVELENGTHS", `const numWavelengths = ${scene.numWavelengths};`)
        // .replace("_EMITTER", scene.emitterCode)
    })

    const updatePipeline = device.createComputePipeline({
        label: "wave update pipeline",
        layout: "auto",
        compute: { module: updateModule }
    })

    // bind group set later


    // -----------------color setup----------------- //
    const colorModule = device.createShaderModule({
        label: "simulation to color module",
        code: colorCode.replace("_NUMWAVELENGTHS", `const numWavelengths = ${scene.numWavelengths};`)
    })

    const colorPipeline = device.createComputePipeline({
        label: "simulation to color pipeline",
        layout: "auto",
        compute: { module: colorModule }
    })

    const colorTexture = device.createTexture({
        label: "wave simulation to color texture",
        format: "rgba8unorm",
        dimension: "2d",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
    })

    const colorUniformsBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const colorUniformsValues = new ArrayBuffer(4)
    const colorUniformsViews = {
        brightness: new Float32Array(colorUniformsValues),
    }
    colorUniformsViews.brightness[0] = 0


    // -----------------wave display setup----------------- //

    const waveDisplay = device.createShaderModule({
        label: "wave texture transcribe module",
        code: waveDisplayCode
    })

    const waveDisplayPipeline = device.createComputePipeline({
        label: "wave texture transcribe pipeline",
        layout: "auto",
        compute: { module: waveDisplay }
    })

    const waveDisplayTexture = device.createTexture({
        label: "transcribed wave texture to an rgba8unorm texture",
        format: "rgba8unorm",
        dimension: "2d",
        size: [canvas.clientWidth, canvas.clientHeight],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
    })


    // -----------------render setup----------------- //

    const renderModule = device.createShaderModule({
        label: "wave render module",
        code: renderCode
    })

    const renderPipeline = device.createRenderPipeline({
        label: "wave render pipeline",
        layout: "auto",
        vertex: {
            module: renderModule
        },
        fragment: {
            module: renderModule,
            targets: [{ format: presentationFormat }]
        }
    })

    const renderUniformsBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const renderUniformsValues = new ArrayBuffer(4)
    const renderUniformsViews = {
        renderMode: new Int32Array(renderUniformsValues),
    }

    renderUniformsViews.renderMode[0] = 1

    const renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: waveDisplayTexture.createView() }, //<- the wave texture to render
            { binding: 1, resource: colorTexture.createView() },
            { binding: 2, resource: linearSampler }, //<- a sampler, telling the shader how to sample the texture
            { binding: 3, resource: obstacleDisplayTexture.createView() }, //<- the texture containing the obstacles, because I want to overlay the obstacles on top of the wave
            { binding: 4, resource: iorTexture.createView() },
            { binding: 6, resource: { buffer: renderUniformsBuffer } },
        ]
    })

    const renderPassDescriptor = {
        label: "wave render renderPass",
        colorAttachments: [
            {
                // view: <- to be filled out when we render (it's what we render to)
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    }



    let frameCount = 0
    async function render() {
        if (shouldStop) {
            shouldStop = false
            await start(device)
            return
        }

        frameCount++
        document.getElementById("frameCount").innerHTML = "Time Elapsed: " + (frameCount * 0.065).toFixed(1) + "fs"

        // -----------------emit stuff----------------- //

        emitUniformsViews.time[0] = frameCount
        device.queue.writeBuffer(emitUniformsBuffer, 0, emitUniformsValues)

        for (let i = 0; i < emittersSetup.length; i++) {
            const emitBindGroup = device.createBindGroup({
                layout: emittersSetup[i].pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: waveTextures[lastUpdatedTexture].createView() },
                    { binding: 1, resource: iorTexture.createView() },
                    { binding: 2, resource: { buffer: emitUniformsBuffer } }
                ]
            })

            const emitEncoder = device.createCommandEncoder()
            const emitComputePass = emitEncoder.beginComputePass()
            emitComputePass.setPipeline(emittersSetup[i].pipeline)
            emitComputePass.setBindGroup(0, emitBindGroup)
            emitComputePass.dispatchWorkgroups(emittersSetup[i].numPixels, 1, scene.numWavelengths)
            emitComputePass.end()
            const emitCommandBuffer = emitEncoder.finish()
            device.queue.submit([emitCommandBuffer])
        }


        // -----------------update boundary stuff----------------- //
        const updateBoundaryBindGroup = device.createBindGroup({
            layout: updateBoundaryPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: waveTextures[lastUpdatedTexture].createView() }, //we're editing the last texture
                { binding: 1, resource: waveTextures[(lastUpdatedTexture + 2) % 3].createView() }, //with the help of the before-last texture
                { binding: 2, resource: boundariesTexture.createView() },
                { binding: 3, resource: obstaclesTexture.createView() } //has the color of the boundary
            ]
        })

        const updateBoundaryEncoder = device.createCommandEncoder()
        const updateBoundaryComputePass = updateBoundaryEncoder.beginComputePass()
        updateBoundaryComputePass.setPipeline(updateBoundaryPipeline)
        updateBoundaryComputePass.setBindGroup(0, updateBoundaryBindGroup)
        updateBoundaryComputePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight, scene.numWavelengths)
        updateBoundaryComputePass.end()
        const updateBoundaryCommandBuffer = updateBoundaryEncoder.finish()
        device.queue.submit([updateBoundaryCommandBuffer])

        // -----------------update stuff----------------- //

        const updateBindGroup = device.createBindGroup({
            layout: updatePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: waveTextures[(lastUpdatedTexture + 1) % 3].createView() }, //the texture we're going to be updating (after this, it will be the most recent)
                { binding: 1, resource: waveTextures[lastUpdatedTexture].createView() }, //the last texture that was updated
                { binding: 2, resource: waveTextures[(lastUpdatedTexture + 2) % 3].createView() }, //the before-last texture
                { binding: 3, resource: iorTexture.createView() }
            ]
        })

        // all this just gets the gpu to do its thing
        const updateEncoder = device.createCommandEncoder({
            label: "wave update command encoder"
        })
        const updateComputePass = updateEncoder.beginComputePass({
            label: "wave update compute pass"
        })
        updateComputePass.setPipeline(updatePipeline)
        updateComputePass.setBindGroup(0, updateBindGroup)
        updateComputePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight, scene.numWavelengths) //make each pixel be dealt with by its own thread (that's what makes the gpu so powerful) (technically a workgroup can be multiple threads, but in gpu code I say it's just one)
        updateComputePass.end()
        const updateCommandBuffer = updateEncoder.finish()
        device.queue.submit([updateCommandBuffer])

        lastUpdatedTexture = (lastUpdatedTexture + 1) % 3

        // -----------------color stuff-----------------
        colorUniformsViews.brightness[0] = Math.pow(10, document.getElementById("brightness").value)
        device.queue.writeBuffer(colorUniformsBuffer, 0, colorUniformsValues)
        const colorBindGroup = device.createBindGroup({
            layout: colorPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: colorTexture.createView() },
                { binding: 1, resource: waveTextures[lastUpdatedTexture].createView() },
                { binding: 2, resource: { buffer: colorUniformsBuffer } }
            ]
        })

        const colorEncoder = device.createCommandEncoder()
        const colorComputePass = colorEncoder.beginComputePass()
        colorComputePass.setPipeline(colorPipeline)
        colorComputePass.setBindGroup(0, colorBindGroup)
        colorComputePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        colorComputePass.end()
        const colorCommandBuffer = colorEncoder.finish()
        device.queue.submit([colorCommandBuffer])

        // -----------------wave display stuff----------------- //
        const waveDisplayBindGroup = device.createBindGroup({
            layout: waveDisplayPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: waveDisplayTexture.createView() },
                { binding: 1, resource: waveTextures[lastUpdatedTexture].createView() },
                { binding: 2, resource: { buffer: colorUniformsBuffer } }
            ]
        })

        const waveDisplayEncoder = device.createCommandEncoder({
            label: "wave texture transcribe command encoder"
        })
        const waveDisplayComputePass = waveDisplayEncoder.beginComputePass({
            label: "wave texture transcribe compute pass"
        })
        waveDisplayComputePass.setPipeline(waveDisplayPipeline)
        waveDisplayComputePass.setBindGroup(0, waveDisplayBindGroup)
        waveDisplayComputePass.dispatchWorkgroups(canvas.clientWidth, canvas.clientHeight)
        waveDisplayComputePass.end()
        const waveDisplayCommandBuffer = waveDisplayEncoder.finish()
        device.queue.submit([waveDisplayCommandBuffer])

        // -----------------render stuff----------------- //
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView() //set the target of the shader to be the canvas

        const renderMode = document.getElementById("renderSelect").value
        if (renderMode == "wave") {
            renderUniformsViews.renderMode[0] = 0
        }
        else if (renderMode == "color") {
            renderUniformsViews.renderMode[0] = 1
        }
        else if (renderMode == "direction") {
            renderUniformsViews.renderMode[0] = 2
        }
        device.queue.writeBuffer(renderUniformsBuffer, 0, renderUniformsValues)

        const renderEncoder = device.createCommandEncoder({
            label: "wave render command encoder"
        })
        const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderPipeline)
        renderPass.setBindGroup(0, renderBindGroup)
        renderPass.draw(6)
        renderPass.end()
        const renderCommandBuffer = renderEncoder.finish()
        device.queue.submit([renderCommandBuffer])
        // the wave should now be rendered to the screen

        requestAnimationFrame(render) //how move on to the next frame
    }
    requestAnimationFrame(render)
}

/*
TODO:

figure out what's going on with dx dy ds and that weird constant at the wavelength calculation
multiple emitters, coloured, and movable?
redo all obstacle textures with the new way
redo ior textures to be smooth (maybe that helps)
*/