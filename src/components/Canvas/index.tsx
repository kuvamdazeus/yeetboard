import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { ImPencil2 } from "react-icons/im";
import { BsSlashLg } from "react-icons/bs";
import { BiText } from "react-icons/bi";
import { IoTriangle, IoSquare, IoEllipse, IoShapesOutline } from "react-icons/io5";
import { FaMousePointer } from "react-icons/fa";
import { FiChevronUp } from "react-icons/fi";
import { Mode, IElement } from "../../types";
import { createCanvasElement } from "./utils";

// PAN & ZOOM

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const modeRef = useRef<Mode>();
  const currentElRef = useRef<fabric.Object>();
  const initialMouseCoordsRef = useRef<fabric.Point>();
  const acceptKeystrokes = useRef(true);
  const selectedTextEl = useRef<fabric.Text>();

  const [textField, setTextField] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("selection");
  const [showShapes, setShowShapes] = useState(false);

  modeRef.current = mode;

  const removeElementControls = () => {
    if (!fabricRef.current) return;

    const canvasElements = fabricRef.current._objects;

    canvasElements.map((el) => {
      el.lockMovementX = true;
      el.lockMovementY = true;
      el.setControlsVisibility({
        bl: false,
        mb: false,
        br: false,
        ml: false,
        mr: false,
        mt: false,
        mtr: false,
        tl: false,
        tr: false,
      });
    });
  };

  const addElementControls = () => {
    if (!fabricRef.current) return;

    const canvasElements = fabricRef.current._objects;

    canvasElements.map((el) => {
      el.lockMovementX = false;
      el.lockMovementY = false;
      el.setControlsVisibility({
        bl: true,
        mb: true,
        br: true,
        ml: true,
        mr: true,
        mt: true,
        mtr: true,
        tl: true,
        tr: true,
      });
    });
  };

  const mouseDown = (e: fabric.IEvent<MouseEvent>) => {
    if (!fabricRef.current) return;

    if (modeRef.current !== "pencil" && modeRef.current !== "selection") {
      removeElementControls();
    } else {
      if (e.target && "text" in e.target) {
        setTextField((e.target as any).text);
        selectedTextEl.current = e.target;
      } else {
        setTextField(null);
        selectedTextEl.current = undefined;
      }
    }

    if (modeRef.current === "circle") {
      initialMouseCoordsRef.current = e.absolutePointer;
      currentElRef.current = new fabric.Circle({
        left: e.absolutePointer?.x,
        top: e.absolutePointer?.y,
        radius: 0,
      });
      fabricRef.current?.add(currentElRef.current);
    }

    if (modeRef.current === "square") {
      initialMouseCoordsRef.current = e.absolutePointer;
      currentElRef.current = new fabric.Rect({
        left: e.absolutePointer?.x,
        top: e.absolutePointer?.y,
        width: 0,
        height: 0,
      });
      fabricRef.current?.add(currentElRef.current);
    }

    if (modeRef.current === "triangle") {
      initialMouseCoordsRef.current = e.absolutePointer;
      currentElRef.current = new fabric.Rect({
        left: e.absolutePointer?.x,
        top: e.absolutePointer?.y,
        width: 0,
        height: 0,
      });
      fabricRef.current?.add(currentElRef.current);
    }
  };

  const mouseMove = (e: fabric.IEvent<MouseEvent>) => {
    if (!currentElRef.current || !initialMouseCoordsRef.current || !e.absolutePointer) return;

    if (
      initialMouseCoordsRef.current.x > e.absolutePointer.x ||
      initialMouseCoordsRef.current.y > e.absolutePointer.y
    ) {
      return;
    }

    if (modeRef.current === "circle") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Circle({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        radius: (initialMouseCoordsRef.current?.distanceFrom(e.absolutePointer as fabric.Point) || 0) / 2.25,
      });

      fabricRef.current?.add(currentElRef.current);
    }

    if (modeRef.current === "square") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Rect({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        width: e.absolutePointer.x - initialMouseCoordsRef.current.x,
        height: e.absolutePointer.y - initialMouseCoordsRef.current.y,
        absolutePositioned: true,
      });

      fabricRef.current?.add(currentElRef.current);
    }

    if (modeRef.current === "triangle") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Rect({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        width: e.absolutePointer.x - initialMouseCoordsRef.current.x,
        height: e.absolutePointer.y - initialMouseCoordsRef.current.y,
      });

      fabricRef.current?.add(currentElRef.current);
    }
  };

  const mouseUp = () => {
    console.log("MOUSE UP");
    if (modeRef.current !== "pencil" && modeRef.current !== "selection") {
      addElementControls();
    }

    initialMouseCoordsRef.current = undefined;
    currentElRef.current = undefined;
  };

  const mouseWheeee = (opt: fabric.IEvent<WheelEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const delta = opt.e.deltaY;
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.2) zoom = 0.2;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  };

  useEffect(() => {
    if (!fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current);
      const fabricCanvas = fabricRef.current;

      fabricCanvas.on("mouse:down", mouseDown);
      fabricCanvas.on("mouse:move", mouseMove);
      fabricCanvas.on("mouse:up", mouseUp);
      fabricCanvas.on("mouse:wheel", mouseWheeee);
    }

    window.onkeydown = (keyE) => {
      if (!acceptKeystrokes.current) return;

      if (keyE.code === "Backspace") {
        const selectedEl = fabricRef.current?._activeObject as any;

        if (selectedEl._objects) {
          selectedEl._objects.forEach((el: any) => fabricRef.current?.remove(el));
        } else fabricRef.current?.remove(selectedEl);
      }

      // shift-u for undo
      if (keyE.key === "U") {
        const latestEl = fabricRef.current?.getObjects().at(-1);
        if (latestEl) fabricRef.current?.remove(latestEl);
      }

      if (keyE.key.toLowerCase() === "s") {
        setMode("selection");
      }

      if (keyE.key.toLowerCase() === "p") {
        setMode("pencil");
      }
    };
  }, []);

  useEffect(() => {
    const fabricCanvas = fabricRef.current as fabric.Canvas;

    if (mode !== "selection") {
      if (mode === "pencil") fabricCanvas.isDrawingMode = true;
      else fabricCanvas.isDrawingMode = false;

      fabricCanvas.selection = false;
    } else if (mode === "selection") {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
    }
  }, [mode]);

  useEffect(() => {
    acceptKeystrokes.current = textField === null;
  }, [textField]);

  useEffect(() => {
    if (selectedTextEl.current && textField) selectedTextEl.current.text = textField;
    fabricRef.current?.renderAll();
  }, [textField]);

  return (
    <section className="flex flex-col items-center relative">
      <canvas width={window.innerWidth} height={window.innerHeight} ref={canvasRef} />

      {textField !== null && (
        <div className="fixed top-10 bg-white">
          <textarea
            onChange={(e) => {
              setTextField(e.target.value);
            }}
            className="text-xl px-5 py-2 w-96 border shadow-xl rounded focus:outline-none"
            value={textField}
          />
        </div>
      )}

      <div className="flex items-center justify-between fixed bottom-10 px-7 py-2 border text-4xl shadow-xl rounded-2xl bg-white">
        <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => setMode("selection")}
        >
          <FaMousePointer className={`${mode === "selection" ? "text-purple-500" : "text-gray-500"}`} />
        </div>

        <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => setMode("pencil")}
        >
          <ImPencil2 className={`${mode === "pencil" ? "text-purple-500" : "text-gray-500"}`} />
        </div>

        {/* <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => setMode("line")}
        >
          <BsSlashLg className={`${mode === "line" ? "text-purple-500" : "text-gray-500"}`} />
        </div> */}

        <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => {
            setMode("text");
            fabricRef.current?.add(new fabric.Text("Hello World", { fontSize: 28, left: 100, top: 500 }));
          }}
        >
          <BiText className={`${mode === "text" ? "text-purple-500" : "text-gray-500"}`} />
        </div>

        <div className="flex flex-col items-center">
          {showShapes && (
            <div className="absolute bottom-24 px-5 py-2 flex items-center bg-white rounded-xl border">
              <div
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setMode("circle");
                }}
              >
                <IoEllipse className="text-gray-600 text-4xl" />
              </div>

              <div
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setMode("square");
                }}
              >
                <IoSquare className="text-gray-600 text-4xl" />
              </div>

              <div
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setMode("triangle");
                }}
              >
                <IoTriangle className="text-gray-600 text-4xl" />
              </div>
            </div>
          )}
          <div
            onClick={() => setShowShapes(!showShapes)}
            className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          >
            <IoShapesOutline
              className={`${
                ["square", "circle", "triangle"].includes(mode) ? "text-purple-500" : "text-gray-500"
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
