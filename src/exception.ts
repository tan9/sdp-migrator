export function exit(exitCode: number, message?: string): void {
    if (message) {
        console.error(message)
    }
    process.exit(exitCode)
}
