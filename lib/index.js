"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const replace_in_file_1 = require("replace-in-file");
const simple_git_1 = __importDefault(require("simple-git"));
const git = (0, simple_git_1.default)();
// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    console.warn('pom.xml 不存在，請切換到專案目錄下再執行本程式。');
    process.exit(1);
}
// 確認專案在 git 管控，而且沒有什麼髒東西
git.checkIsRepo()
    .then(isRepo => {
    if (!isRepo) {
        console.log("路徑不在 git 版控中，無法進行升版。");
        process.exit(2);
    }
});
git.status()
    .then(status => {
    if (!status.isClean()) {
        console.log("git 目錄中有未 commit 的異動，請確認所有異動都已儲存後再試一次。");
        process.exit(2);
    }
});
// 更新 Parent POM 版本
(0, replace_in_file_1.replaceInFile)({
    files: '**/pom.xml',
    from: /(<parent>.*<artifactId>fdc<\/artifactId>.*)<version>2.0.0<\/version>/s,
    to: '$1<version>3.0.0-SNAPSHOT</version>',
}).then(results => {
    let replacedFiles = results.filter(result => result.hasChanged);
    if (replacedFiles.length > 0) {
        console.log("Parent POM 版本已更新為 3.0.0-SNAPSHOT。");
        replacedFiles.forEach(replacedFile => {
            git.add(replacedFile.file);
        });
        git.commit("Upgrade SDP parent to 3.0.0-SNAPSHOT.");
    }
}).catch(error => {
    console.error('更新 parent POM 版本時發生錯誤:', error);
    process.exit(3);
});
