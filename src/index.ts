import fs from 'node:fs';
import path from 'node:path';
import figlet from 'figlet';
import { exit } from './exception.js';
import { commitReplacedResults, deleteFilesAndCommit, git } from './git.js';
import { GIT_ERROR, MIGRATE_ERROR, PROJECT_ERROR } from './constants.js';
import replaceInFilePkg from 'replace-in-file';
import glob from 'glob-promise';

const {replaceInFile} = replaceInFilePkg

// 列印 banner
console.log(
    figlet.textSync('SDP Migrator') + '\n'
)

const pwd = path.resolve();

// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    exit(PROJECT_ERROR, `${pwd} 目錄下沒有 pom.xml，請切換到專案目錄下再試一次。`)
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

// 更新 Parent POM 版本
await replaceInFile({
    files: '**/pom.xml',
    from: /(<parent>.*<artifactId>fdc<\/artifactId>.*)<version>2.0.0<\/version>/s,
    to: '$1<version>3.0.0-SNAPSHOT</version>',
}).then(replaceResults =>
    commitReplacedResults(
        '將 Parent POM 更新為 3.0.0-SNAPSHOT',
        replaceResults)
).catch(error => {
    exit(MIGRATE_ERROR, `更新 parent POM 版本時發生錯誤: ${error}`)
});

// 移除 POM 已經在上游管控或是不需要的 build 設定
await replaceInFile({
    files: '**/pom.xml',
    from: /^.*<outputDirectory>src\/main\/webapp\/WEB-INF\/classes<\/outputDirectory>.*$\n/m,
    to: '',
}).then(replaceResults =>
    commitReplacedResults(
        '移除 pom.xml 的 build.outputDirectory 設定',
        replaceResults)
).catch(error => {
    exit(MIGRATE_ERROR, `移除 pom.xml 的 build.outputDirectory 設定時發生錯誤: ${error}`)
});

await replaceInFile({
    files: '**/pom.xml',
    from: /^\s*?<plugin>.*?<artifactId>maven-compiler-plugin<\/artifactId>.*?<\/plugin>\s*?$\n/ms,
    to: '',
}).then(replaceResults =>
    commitReplacedResults(
        '移除 pom.xml 的 maven-compiler-plugin 設定',
        replaceResults)
).catch(error => {
    exit(MIGRATE_ERROR, `移除 pom.xml 的 maven-compiler-plugin 設定時發生錯誤: ${error}`)
});

await replaceInFile({
    files: '**/pom.xml',
    from: /^[ \t]*?<build>\s*?<plugins>\s*?<\/plugins>\s*?<\/build>[ \t]*?$\n/ms,
    to: '',
}).then(replaceResults =>
    commitReplacedResults(
        '移除 pom.xml 中的空 build 設定',
        replaceResults)
).catch(error => {
    exit(MIGRATE_ERROR, `移除 pom.xml 中的空 build 設定時發生錯誤: ${error}`)
});

// 刪除專案中不必要的設定檔
await glob('**/persistence-*.xml')
    .then(
        deleteFilesAndCommit('刪除 persistence-*.xml')
    )
    .catch(error =>
        exit(MIGRATE_ERROR, `刪除 persistence-*.xml 時發生錯誤: ${error}`)
    )

await glob('**/mvc-config.xml')
    .then(
        deleteFilesAndCommit('刪除 mvc-config.xml')
    )
    .catch(error =>
        exit(MIGRATE_ERROR, `刪除 mvc-config.xml 時發生錯誤: ${error}`)
    )
