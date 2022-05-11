import fs from 'node:fs';
import figlet from 'figlet';
import { GIT_ERROR, MIGRATE_ERROR, PROJECT_ERROR } from './constants.js';
import { exit } from './exception.js';
import { bootify } from './bootify.js';
import { commitReplacedResults, deleteFilesAndCommit, git, moveFilesAndCommit } from './git.js';
import { readXml } from './xml.js';
import replaceInFilePkg from 'replace-in-file';
import glob from 'glob-promise';

const {replaceInFile, replaceInFileSync} = replaceInFilePkg

// 列印 banner
console.log(
    figlet.textSync('SDP Migrator') + '\n'
)

// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    exit(PROJECT_ERROR, `${process.cwd()} 並不是有效的 Maven 專案，請切換到專案目錄下再試一次。`)
}

const pom = readXml('./pom.xml')
const projectId = pom.project?.artifactId

if (!/^[a-z]{3}$/.test(projectId)) {
    exit(PROJECT_ERROR, `"${projectId}" 不是有效的專案，請切換到有效的 SDP 應用系統專案下再試一次。`)
}

// 確認專案在 git 管控，而且沒有什麼髒東西
git.checkIsRepo()
    .then((isRepo: boolean) => {
        if (!isRepo) {
            exit(GIT_ERROR, '路徑不在 git 版控中，無法進行升版。')
        }
    })

git.status()
    .then(status => {
        if (!status.isClean()) {
            console.log('git 目錄中有未 commit 的異動，請確認所有異動都已儲存後再試一次。')
            console.log('\n末儲存變更的檔案如下:')
            console.debug(status.files.map(file => file.path))
            exit(GIT_ERROR)
        }
    })

// 開工
console.log(`開始對 ${projectId} 應用系統進行 SDP 升版...\n`)

// 更新 Parent POM 版本
await replaceInFile({
    files: '**/pom.xml',
    from: /(<parent>.*<artifactId>fdc<\/artifactId>.*<version>).*?(<\/version>.*<\/parent>)/s,
    to: '$13.0.0-SNAPSHOT$2',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('將 Parent POM 更新為 3.0.0-SNAPSHOT')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `更新 parent POM 版本時發生錯誤: ${error}`)
    })

// 移除 POM 已經在上游管控或是不需要的 build 設定
await replaceInFile({
    files: '**/pom.xml',
    from: /^.*<outputDirectory>src\/main\/webapp\/WEB-INF\/classes<\/outputDirectory>.*$\r?\n/m,
    to: '',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('移除 pom.xml 的 build.outputDirectory 設定')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `移除 pom.xml 的 build.outputDirectory 設定時發生錯誤: ${error}`)
    })

await replaceInFile({
    files: '**/pom.xml',
    from: /^\s*?<plugin>.*?<artifactId>maven-compiler-plugin<\/artifactId>.*?<\/plugin>\s*?$\r?\n/ms,
    to: '',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('移除 pom.xml 的 maven-compiler-plugin 設定')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `移除 pom.xml 的 maven-compiler-plugin 設定時發生錯誤: ${error}`)
    })

await replaceInFile({
    files: '**/pom.xml',
    from: /^(?:\r?\n)+[ \t]*?<build>\s*?<plugins>\s*?<\/plugins>\s*?<\/build>[ \t]*?$(\r?\n)+/ms,
    to: '$1',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('移除 pom.xml 中的空 build 設定')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `移除 pom.xml 中的空 build 設定時發生錯誤: ${error}`)
    })

await replaceInFile({
    files: '**/pom.xml',
    from: /http:\/\/192.168.30.67:8080\/nexus\//g,
    to: 'http://192.168.30.95/nexus/',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('修正 pom.xml repository 的網址')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `修正 pom.xml repository 的網址時發生錯誤: ${error}`)
    })

await replaceInFile({
    files: `**/src/**/${projectId}-beans-config.xml`,
    from: new RegExp(`^([ \\t\\r\\n]*)([ \\t]*?<!--.+?-->[ \\t\\r\\n]*?)?[ \\t]+?<context:component-scan\\s+base-package="gov\\.fdc\\.${projectId}"[\\s\\S]*?<\\/context:component-scan>[\\s\\n\\r]*$\\n`, 'gm'),
    to: '\n\n',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults(`移除 ${projectId}-beans-config.xml 裡的 component-scan 設定`)
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `移除 ${projectId}-beans-config.xml 裡的 component-scan 設定時發生錯誤: ${error}`)
    })

// 刪除專案中不必要的設定檔
await glob('**/src/**/persistence-*.xml')
    .then(
        deleteFilesAndCommit('刪除 persistence-*.xml')
    )
    .catch(error =>
        exit(MIGRATE_ERROR, `刪除 persistence-*.xml 時發生錯誤: ${error}`)
    )

await glob('**/src/**mvc-config.xml')
    .then(
        deleteFilesAndCommit('刪除 mvc-config.xml')
    )
    .catch(error =>
        exit(MIGRATE_ERROR, `刪除 mvc-config.xml 時發生錯誤: ${error}`)
    )

await glob('**/src/**/logback.xml')
    .then(
        deleteFilesAndCommit('刪除 logback.xml')
    )
    .catch(error =>
        exit(MIGRATE_ERROR, `刪除 logback.xml 時發生錯誤: ${error}`)
    )

// 搬移 tiles-front.xml 設定檔
await Promise.resolve(
    glob
        .sync('**/src/**/tiles-front.xml', {ignore: ['**/classes/**/tiles-front.xml']})
        .filter(file => file.indexOf('webapp') > -1)
        .map(file => {
            return {'from': file, 'to': file.replace(/webapp[\/\\]WEB-INF/, 'resources')}
        }))
    .then(
        moveFilesAndCommit('異動 tiles-front.xml 位置')
    )
    .catch(error => {
            exit(MIGRATE_ERROR, `異動 tiles-front.xml 位置時發生錯誤: ${error}`)
        }
    )

// 針對 Web 模組一個一個 Spring Bootify
const webModules = glob
    .sync('**/web.xml')
    .map(webModule => webModule.substring(0, webModule.indexOf('/')))
    .filter(webModule => pom.project.modules.module.includes(webModule))

for (const webModule of webModules) {
    await bootify(webModule)
}

// Modernize
await replaceInFile({
    files: '**/src/**/*.java',
    from: /(import sun.misc.BASE64..coder;([\n\r]+import sun.misc.BASE64..coder;)?)/,
    to: 'import java.util.Base64;',
    allowEmptyPaths: true,
})
    .then(
        results => {
            let changed = results
                .filter(result => result.hasChanged);

            changed.forEach(
                result => {
                    replaceInFileSync({
                        files: result.file,
                        from: /new BASE64Encoder\(\)\.encodeBuffer\(/g,
                        to: 'Base64.getEncoder().encodeToString('
                    })
                    replaceInFileSync({
                        files: result.file,
                        from: /new BASE64Decoder\(\)\.decodeBuffer\(/g,
                        to: 'Base64.getDecoder().decode('
                    })
                })
            return changed
        }
    )
    .then(
        commitReplacedResults('將 sun.misc.BASE64 改寫為 java.util.Base64')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `將 sun.misc.BASE64 改寫為 java.util.Base64 時發生錯誤: ${error}`)
    })

await replaceInFile({
    files: '**/Sche001wController.java',
    from: /(.getKey\(\))?.getName\(\)/g,
    to: '.getKey().getName()',
    allowEmptyPaths: true,
})
    .then(
        commitReplacedResults('改用 Quartz 2 API')
    )
    .catch(error => {
        exit(MIGRATE_ERROR, `改用 Quartz 2 API 時發生錯誤: ${error}`)
    })
