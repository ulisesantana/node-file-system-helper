import { spawn } from 'child_process'
import * as fs from 'fs'
import { join } from 'path'

export interface IAbortablePromise<T> extends Promise<T> {
    abort(): Promise<void>
}

export class FileSystemHelper {
    protected rootPath: string | void

    constructor(rootPath?: string) {
        this.rootPath = rootPath
    }

    public resolvePath(dirPath: string) {
        const dirPathString = Array.isArray(dirPath) ? join(...dirPath) : dirPath
        return this.rootPath ? join(this.rootPath, dirPathString) : dirPathString
    }

    public async mkdir(dirPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.mkdir(this.resolvePath(dirPath), { recursive: true }, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    public mkdirSync(dirPath: string) {
        if (fs.existsSync(this.resolvePath(dirPath))) {
            return
        }
        fs.mkdirSync(this.resolvePath(dirPath), { recursive: true })
    }

    public async writeFile(filePath: string, data: string, options = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.resolvePath(filePath), data, options, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    public writeFileSync(filePath: string, data: string, options = {}) {
        return fs.writeFileSync(this.resolvePath(filePath), data, options)
    }

    public async writeJSONFile(filePath: string, object: {}) {
        return this.writeFile(filePath, JSON.stringify(object))
    }

    public async readFile(filePath: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.resolvePath(filePath), (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        })
    }

    public readFileSync(filePath: string): Buffer {
        return fs.readFileSync(this.resolvePath(filePath))
    }

    public async readTXTFile(filePath: string): Promise<string> {
        return '' + (await this.readFile(filePath))
    }

    public readTXTFileSync(filePath: string): string {
        return '' + this.readFileSync(filePath)
    }

    public async readJSONFile(filePath: string) {
        const data = await this.readFile(filePath)

        return JSON.parse(data.toString())
    }

    public readJSONFileSync(filePath: string) {
        const data = this.readFileSync(filePath)

        return JSON.parse(data.toString())
    }

    public async fileExists(filePath: string): Promise<boolean> {
        return new Promise((resolve) => {
            fs.access(this.resolvePath(filePath), fs.constants.F_OK, (err) => {
                resolve(!err)
            })
        })
    }

    public fileExistsSync(filePath: string = '.') {
        try {
            fs.accessSync(this.resolvePath(filePath), fs.constants.F_OK)
            return true
        } catch (err) {
            return false
        }
    }

    public fileStatsSync(filePath: string): fs.Stats | null {
        try {
            return fs.statSync(this.resolvePath(filePath))
        } catch (err) {
            return null
        }
    }

    public async dirExists(dirPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            fs.stat(this.resolvePath(dirPath), (err) => {
                resolve(!err)
            })
        })
    }

    public dirExistsSync(dirPath: string) {
        try {
            fs.statSync(this.resolvePath(dirPath))
            return true
        } catch (e) {
            return false
        }
    }

    public async rmdir(dirPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            fs.rmdir(this.resolvePath(dirPath), (err) => {
                resolve(!err)
            })
        })
    }

    public rmdirSync(dirPath: string) {
        fs.rmdirSync(this.resolvePath(dirPath))
    }

    public async rm(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(this.resolvePath(filePath), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    public rmSync(filePath: string) {
        fs.unlinkSync(this.resolvePath(filePath))
    }

    public async touch(filePath: string, options = { flag: 'a' }) {
        return this.writeFile(filePath, '', options)
    }

    public touchSync(filePath: string, options = { flag: 'a' }) {
        return this.writeFileSync(filePath, '', options)
    }

    public async readDir(
        dirPath: string = '.',
        options: {
            acceptExtensions?: string[]
            recursiveLevels?: number
            onlyFiles?: boolean
            onlyDirs?: boolean
        } = {}
    ): Promise<fs.Dirent[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(this.resolvePath(dirPath), { withFileTypes: true }, async (err, files) => {
                if (err) {
                    reject(err)
                } else {
                    const { acceptExtensions, recursiveLevels, onlyFiles, onlyDirs } = options
                    let acceptedFiles = files
                    if (acceptExtensions) {
                        acceptedFiles = acceptedFiles.filter(
                            (file: fs.Dirent) =>
                                !file.isFile() ||
                                acceptExtensions.some((extension) => file.name.endsWith(`.${extension}`))
                        )
                    }
                    if (recursiveLevels) {
                        const foundFiles = []
                        for (const file of acceptedFiles) {
                            if (file.isDirectory()) {
                                const childrenFiles = await this.readDir(join(dirPath, file.name), {
                                    acceptExtensions,
                                    recursiveLevels: recursiveLevels - 1,
                                })
                                for (const childFile of childrenFiles) {
                                    childFile.name = join(file.name, childFile.name)
                                    foundFiles.push(childFile)
                                }
                            } else {
                                foundFiles.push(file)
                            }
                        }
                        acceptedFiles = foundFiles
                    }
                    if (onlyFiles) {
                        acceptedFiles = acceptedFiles.filter((file) => file.isFile())
                    }
                    if (onlyDirs) {
                        acceptedFiles = acceptedFiles.filter((file) => file.isDirectory())
                    }
                    resolve(acceptedFiles)
                }
            })
        })
    }

    public readDirSync(
        dirPath: string = '.',
        options: {
            acceptExtensions?: string[]
            recursiveLevels?: number
            onlyFiles?: boolean
            onlyDirs?: boolean
        } = {}
    ): fs.Dirent[] {
        const files = fs.readdirSync(this.resolvePath(dirPath), {
            withFileTypes: true,
        })
        const { acceptExtensions, recursiveLevels, onlyFiles, onlyDirs } = options
        let acceptedFiles = files
        if (acceptExtensions) {
            acceptedFiles = acceptedFiles.filter(
                (file: fs.Dirent) =>
                    !file.isFile() || acceptExtensions.some((extension) => file.name.endsWith(`.${extension}`))
            )
        }
        if (recursiveLevels) {
            const foundFiles = []
            for (const file of acceptedFiles) {
                if (file.isDirectory()) {
                    const childrenFiles = this.readDirSync(join(dirPath, file.name), {
                        acceptExtensions,
                        recursiveLevels: recursiveLevels - 1,
                    })
                    for (const childFile of childrenFiles) {
                        childFile.name = join(file.name, childFile.name)
                        foundFiles.push(childFile)
                    }
                } else {
                    foundFiles.push(file)
                }
            }
            acceptedFiles = foundFiles
        }
        if (onlyFiles) {
            acceptedFiles = acceptedFiles.filter((file) => file.isFile())
        }
        if (onlyDirs) {
            acceptedFiles = acceptedFiles.filter((file) => file.isDirectory())
        }

        return acceptedFiles
    }

    public watchDir(
        dirPath: string,
        options: { recursive?: boolean; persistent?: boolean } = {}
    ): IAbortablePromise<{ event: string; filename: string }> {
        let watcher: fs.FSWatcher
        const promise = new Promise((resolve) => {
            watcher = fs.watch(this.resolvePath(dirPath), options, (event: string, filename: string) =>
                resolve({ event, filename })
            )
        }) as IAbortablePromise<{ event: string; filename: string }>
        promise.abort = async () => {
            if (watcher) {
                watcher.close()
            }
        }
        return promise
    }

    public watchFile(
        filePath: string,
        options: { interval?: number; persistent?: boolean } = {}
    ): IAbortablePromise<{ curr: fs.Stats; prev: fs.Stats }> {
        const promise = new Promise((resolve) => {
            fs.watchFile(this.resolvePath(filePath), options, (curr: fs.Stats, prev: fs.Stats) =>
                resolve({ curr, prev })
            )
        }) as IAbortablePromise<{ curr: fs.Stats; prev: fs.Stats }>
        promise.abort = () => {
            return new Promise<void>((resolve) => {
                fs.unwatchFile(this.resolvePath(filePath), (curr: fs.Stats, prev: fs.Stats) => {
                    resolve()
                })
            })
        }
        return promise
    }

    public execute(command: string, args: string[]): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                const child = spawn(command, args)
                const stdout: string[] = []
                child.stdout.on('data', (buffer: Buffer) => {
                    const lines = buffer.toString().split('\n')
                    for (const line of lines) {
                        if (line !== '') {
                            stdout.push(line)
                        }
                    }
                })
                child.stdout.on('end', () => {
                    resolve(stdout)
                })
            } catch (e) {
                reject(e)
            }
        })
    }
}
