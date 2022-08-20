import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { ImPencil2 } from "react-icons/im";
import { BiText } from "react-icons/bi";
import { FaMousePointer } from "react-icons/fa";
import { IoEye } from "react-icons/io5";
import { IoTriangle, IoSquare, IoEllipse, IoShapesOutline } from "react-icons/io5";
import { Mode } from "../../types";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import events from "../../events";

const socket = io(import.meta.env.VITE_SOCKET_SERVER);
socket.connect();

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const modeRef = useRef<Mode>();
  const currentElRef = useRef<fabric.Object>();
  const initialMouseCoordsRef = useRef<fabric.Point>();
  const acceptKeystrokes = useRef(true);
  const selectedTextEl = useRef<fabric.Text>();

  const isDraggingRef = useRef(false);

  const [textField, setTextField] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("selection");
  const [showShapes, setShowShapes] = useState(false);
  const [people, setPeople] = useState(1);

  const lastPosXRef = useRef<number>();
  const lastPosYRef = useRef<number>();

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

    isDraggingRef.current = true;

    if (e.e.altKey) {
      initialMouseCoordsRef.current = e.absolutePointer;
      fabricRef.current.selection = false;

      lastPosXRef.current = e.e.clientX;
      lastPosYRef.current = e.e.clientY;

      return;
    } else {
      fabricRef.current.selection = true;
    }

    if (modeRef.current !== "pencil" && modeRef.current !== "selection") {
      removeElementControls();
      fabricRef.current.selection = false;
    } else {
      fabricRef.current.selection = true;

      if (e.target && "text" in e.target) {
        setTextField((e.target as any).text);
        selectedTextEl.current = e.target;
      } else {
        setTextField(null);
        selectedTextEl.current = undefined;
        acceptKeystrokes.current = true;
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
    if (!initialMouseCoordsRef.current || !e.absolutePointer) return;

    if (e.e.altKey && initialMouseCoordsRef.current) {
      const vpt = fabricRef.current?.viewportTransform as number[];

      // vpt[4] += e.absolutePointer.x - initialMouseCoordsRef.current.x;
      // vpt[5] += e.absolutePointer.y - initialMouseCoordsRef.current.y;
      vpt[4] += e.e.clientX - (lastPosXRef.current as number);
      vpt[5] += e.e.clientY - (lastPosYRef.current as number);

      lastPosXRef.current = e.e.clientX;
      lastPosYRef.current = e.e.clientY;

      fabricRef.current?.requestRenderAll();
    }

    if (
      initialMouseCoordsRef.current.x > e.absolutePointer.x ||
      initialMouseCoordsRef.current.y > e.absolutePointer.y
    ) {
      return;
    }

    if (currentElRef.current && modeRef.current === "circle") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Circle({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        radius: (initialMouseCoordsRef.current?.distanceFrom(e.absolutePointer as fabric.Point) || 0) / 2.25,
      });

      fabricRef.current?.add(currentElRef.current);
    }

    if (currentElRef.current && modeRef.current === "square") {
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

    if (currentElRef.current && modeRef.current === "triangle") {
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
    isDraggingRef.current = false;
    (fabricRef.current as fabric.Canvas).selection = false;

    console.log("MOUSE UP");
    if (modeRef.current !== "pencil" && modeRef.current !== "selection") {
      addElementControls();
    }

    fabricRef.current?.forEachObject((obj) => {
      obj.setCoords();
    });

    if (currentElRef.current) {
      objectAdded(currentElRef.current);
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
    if (zoom < 0.01) zoom = 0.01;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  };

  const objectAdded = (e: fabric.Object) => {
    console.log(e);
  };

  const objectModified = (e: fabric.IEvent<Event>) => {
    console.log(e.target);
  };

  const objectRemoved = (e: fabric.IEvent<Event>) => {
    console.log(e.target);
  };

  useEffect(() => {
    if (!fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current);
      const fabricCanvas = fabricRef.current;

      fabricCanvas.on("mouse:down", mouseDown);
      fabricCanvas.on("mouse:move", mouseMove);
      fabricCanvas.on("mouse:up", mouseUp);
      fabricCanvas.on("mouse:wheel", mouseWheeee);

      fabricCanvas.on("object:added", (e) => {
        if (e.target?.type === "path") {
          objectAdded(e.target);
        }
      });

      fabricCanvas.on("object:modified", (e) =>
        setTimeout(() => !isDraggingRef.current && objectModified(e), 5)
      );

      fabricCanvas.on("object:removed", (e) =>
        setTimeout(() => !isDraggingRef.current && objectRemoved(e), 5)
      );
    }

    window.onkeydown = (keyE) => {
      if (!acceptKeystrokes.current) return;

      if (keyE.code === "Backspace") {
        const selectedEl = fabricRef.current?._activeObject as any;

        if (selectedEl._objects) {
          selectedEl._objects.forEach((el: any) => fabricRef.current?.remove(el));
        } else {
          fabricRef.current?.remove(selectedEl);
          if (selectedEl.text) setTextField(null);
        }
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
    const roomId = window.location.pathname.slice(1) || uuidv4();

    if (!window.location.pathname.slice(1)) {
      window.history.pushState("", "", "/" + roomId);
    }

    socket.emit(events.JOIN_ROOM.toString(), { roomId });

    socket.on(events.UPDATE_PEOPLE_COUNT.toString(), (count) => setPeople(count));
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
            onFocusCapture={() => (acceptKeystrokes.current = false)}
          />
        </div>
      )}

      <div className="flex items-center rounded p-1.5 bg-gray-100 fixed top-5 right-5">
        <IoEye className="mr-1 text-lg text-gray-600" />
        <p className="text-sm text-gray-600">{people}</p>
      </div>

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
