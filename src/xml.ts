import fs from "node:fs";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser();

export function readXml(path: string): any {
    return xmlParser.parse(fs.readFileSync(path));
}
