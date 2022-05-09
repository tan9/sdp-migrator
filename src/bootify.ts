import { CODE_GENERATION_ERROR } from './constants.js';
import { exit } from './exception.js';
import { git } from './git.js';
import { renderFile } from './template.js';
import { readXml } from './xml.js';
import glob from 'glob-promise';
import commonPathPrefix from 'common-path-prefix';
import { pascalCase } from 'pascal-case';
import fs from 'node:fs';
import path from 'node:path';

export async function bootify(webModule: string): Promise<void> {
    console.log(`將 "${webModule}" 網頁模組轉換成 Spring Boot 架構...`)

    const projectRoot = process.cwd()
    try {
        process.chdir(`./${webModule}`)
        // 共用常數
        const moduleRoot = process.cwd()
        const pom = readXml('./pom.xml')
        const isWebModule = pom.project.artifactId.endsWith('-web')
        const isWebServiceModule = pom.project.artifactId.endsWith('-webservice')

        let simpleGit = git;

        // 開始寫 Bootstrap Class
        process.chdir('./src/main/java')

        let packagePath = commonPathPrefix(glob.sync('gov/fdc/**/*.java'))
        if (!packagePath) {
            packagePath = 'gov/fdc/' + pom.project.parent.artifactId
        }
        if (packagePath.endsWith('/')) {
            packagePath = packagePath.substring(0, packagePath.length - 1)
        }

        const bootstrapClassName = `${pascalCase(pom.project.artifactId)}Application`
            .replace('Webservice', 'WebService')
        const packageName = packagePath.replaceAll('/', '.')
        const scanBasePackages = [`gov.fdc.${pom.project.parent.artifactId}`]
        if (!packageName.startsWith(scanBasePackages[0])) {
            scanBasePackages.push(packageName)
        }

        await renderFile('/template/web.java.ejs',
            {
                bootstrapClassName,
                packageName,
                scanBasePackages,
                isWebModule,
                isWebServiceModule,
            }
        )
            .then(content => {
                fs.writeFileSync(`${packagePath}/${bootstrapClassName}.java`, content)
                console.log(` - 寫入 ${bootstrapClassName}.java`)
                simpleGit = simpleGit.add(path.resolve(`${packagePath}/${bootstrapClassName}.java`))
            })
            .catch(error =>
                exit(CODE_GENERATION_ERROR, `寫入 ${bootstrapClassName}.java 失敗: ${error}`)
            )

        // 開始寫 application.yml
        process.chdir(moduleRoot)
        process.chdir('./src/main/resources')

        const contextPath = pom.project.artifactId.endsWith('-web')
            ? pom.project.parent.artifactId : pom.project.artifactId
        let serverPort
        if (contextPath.length === 3) {
            serverPort = 8080
        } else if (contextPath.endsWith('-webservice')) {
            serverPort = 8081
        } else if (contextPath.endsWith('-scheduler')) {
            serverPort = 9090
        } else {
            serverPort = 8088
        }

        await renderFile('template/application.yml.ejs',
            {
                projectId: pom.project.parent.artifactId,
                contextPath,
                serverPort,
                isWebServiceModule,
            }
        )
            .then(content => {
                if (!fs.existsSync('config')) {
                    fs.mkdirSync('config')
                }
                fs.writeFileSync(`config/application.yml`, content)
                console.log(` - 寫入 application.yml`)
                simpleGit = simpleGit.add(path.resolve(`config/application.yml`))
            })
            .catch(error =>
                exit(CODE_GENERATION_ERROR, `寫入 application.yml 失敗: ${error}`)
            )

        const commitMessage = `將 "${webModule}" 網頁模組轉換成 Spring Boot 架構。`
        return simpleGit.commit(commitMessage)
            .then(result => {
                const changes = result.summary.changes + result.summary.deletions + result.summary.insertions
                if (changes > 0) {
                    console.log(` - 將以上新增或異動的檔案 commit 完成`)
                } else {
                    console.log(` - 沒有新增或異動的檔案，不需要 commit`)
                }
            });

    } finally {
        process.chdir(projectRoot)
    }
}
