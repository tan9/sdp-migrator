export function bootify(webModule: string): void {
    console.log(`開始將 ${webModule} 網頁模組轉換成 Spring Boot 架構`)

    try {
        process.chdir(`./${webModule}`)
        // TDOO

    } finally {
        process.chdir('..')
    }
}
