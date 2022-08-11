export type Mode = "selection" | "square" | "circle" | "triangle" | "text" | "pencil";

export interface IElement {
  type: Mode;
  position: [fabric.Point, fabric.Point]; // array of 2 Point objects, [initial, final]
  drawable: fabric.Object;
}
