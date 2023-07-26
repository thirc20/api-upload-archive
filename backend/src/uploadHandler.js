const Busboy = require('busboy')
const { pipelineAsync } = require('./utils')
const { createWriteStream } = require('fs')
const { join } = require('path')
const path = require('path')
const ON_UPLOAD_EVENT = "file-uploaded"

class UploadHandler {
    #io
    #socketId

    constructor(io, socketId){
        this.#io = io
        this.#socketId = socketId
    }

    registerEvents(headers, onFinish){
        const busboy = Busboy({ headers })

        busboy.on("file", this.#onFile.bind(this))

        busboy.on("finish", onFinish)

        return busboy
    }

    #handleFileBytes(filename){
        async function * handlerData(data){
            for await (const item of data){
                const size = item.length

                this.#io.to(this.#socketId).emit(ON_UPLOAD_EVENT, size)

                yield item
            }
        }

        return handlerData.bind(this)
    }

    async #onFile (fieldname, file, filename){
        const saveFileTo = path.join(__dirname, '../', "upload", filename.filename)
        console.log('Uploading ', saveFileTo)

        await pipelineAsync(
            file,
            this.#handleFileBytes.apply(this, [ filename ]),
            createWriteStream(saveFileTo)
        )

        console.log('File [', filename.filename, '] finished!')
    }
}

module.exports = UploadHandler