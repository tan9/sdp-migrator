export function exit(exitCode, message) {
    if (message) {
        console.error(message);
    }
    process.exit(exitCode);
}
