import { Mode, IElement } from "../../types";
import { fabric } from "fabric";
import { SHA256 } from "crypto-js";

export function areSameElements(canvasElem: fabric.Object, remoteElem: fabric.Object) {
  return JSON.stringify(canvasElem) === JSON.stringify(remoteElem);
}

export function generateHash(jsonObj: any) {
  return SHA256(JSON.stringify(jsonObj)).toString();
}
