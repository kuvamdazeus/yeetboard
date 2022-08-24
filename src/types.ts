import { CanvasActions } from "./events";

export type Mode = "selection" | "square" | "circle" | "triangle" | "text" | "pencil";

// export interface IElement {
//   type: Mode;
//   position: [fabric.Point, fabric.Point]; // array of 2 Point objects, [initial, final]
//   drawable: fabric.Object;
// }

export interface CanvasActionData {
  type?: Mode;
  action: CanvasActions;
  initiator: string;
  element?: string;
  indexes?: number[];
  index?: number;
  timestamp: number;
}

export interface IElement {
  type: "square" | "circle" | "triangle" | "text" | "pencil";
  left: number;
  top: number;
  radius?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: number;
  strokeWidth?: number;
}
