import { Mode, IElement } from "../../types";
import { fabric } from "fabric";

export const createCanvasElement = (
  mode: Mode,
  startMousePosition: fabric.Point,
  stopMousePosition: fabric.Point
) => {
  if (mode === "pencil" || mode === "selection") return null;

  let element: IElement;

  const positionCoords = [
    startMousePosition.x,
    startMousePosition.y,
    stopMousePosition.x,
    stopMousePosition.y,
  ];

  const positionPoints: [fabric.Point, fabric.Point] = [startMousePosition, stopMousePosition];

  // if (mode === "line") {
  //   element = {
  //     position: positionPoints,
  //     type: mode,
  //     drawable: new fabric.Line(positionCoords, { stroke: "red" }),
  //   };
  // } else if (mode === "rectangle") {
  //   element = {
  //     position: positionPoints,
  //     type: mode,
  //     drawable: new fabric.Line(positionCoords),
  //   };
  // } else {
  //   // circle
  //   element = {
  //     position: positionPoints,
  //     type: mode,
  //     drawable: new fabric.Line(positionCoords),
  //   };
  // }

  return null;
};
