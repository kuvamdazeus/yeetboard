import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { ImPencil2 } from "react-icons/im";
import { BiText } from "react-icons/bi";
import { FaMousePointer } from "react-icons/fa";
import { IoEye } from "react-icons/io5";
import { IoTriangle, IoSquare, IoEllipse, IoShapesOutline } from "react-icons/io5";
import { CanvasActionData, IElement, Mode } from "../../types";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { CanvasActions, SocketActions } from "../../events";
import { generateHash } from "./utils";

// TODO:
// UPDATES
// DRAW SHAPES no restrictions
// MECHANISM to compare length of actions on all users & resolve it

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
  const actionsRef = useRef<CanvasActionData[]>([]);
  const textTypeTimeoutRef = useRef<number | undefined>();
  const selectedObjectsRef = useRef<fabric.Object[]>([]);

  const isDraggingRef = useRef(false);

  const [textField, setTextField] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("selection");
  const [showShapes, setShowShapes] = useState(false);
  const [people, setPeople] = useState(1);
  const [color, setColor] = useState("black");
  const [pageLoading, setPageLoading] = useState(true);

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

  const generateElementString: (element: any) => string = (element) => {
    // element is a fabric.Object
    let objectProperties: any;

    switch (modeRef.current as Mode) {
      case "pencil":
        objectProperties = {
          type: "path",
          path: element.path,
          left: element.left,
          top: element.top,
          stroke: element.stroke,
          strokeWidth: 3,
        };
        break;

      case "square":
        objectProperties = {
          type: "rect",
          left: element.left,
          top: element.top,
          width: element.width,
          height: element.height,
          stroke: element.stroke,
          strokeWidth: 3,
        };
        break;

      case "circle":
        objectProperties = {
          type: "circle",
          left: element.left,
          top: element.top,
          radius: element.radius,
          stroke: element.stroke,
          strokeWidth: 3,
        };

        break;

      case "text":
        objectProperties = {
          type: "text",
          left: element.left,
          top: element.top,
          text: element.text,
          fill: element.fill,
          fontWeight: 800,
          fontSize: 28,
        };
        break;

      case "triangle":
        objectProperties = {
          type: "triangle",
          left: element.left,
          top: element.top,
          width: element.width,
          height: element.height,
          stroke: element.stroke,
          strokeWidth: 3,
        };
        break;

      default:
        break;
    }

    return JSON.stringify(objectProperties);
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

    if (modeRef.current === "text") {
      const textObj = new fabric.Text("Text", {
        fontFamily: "arial",
        fontWeight: 800,
        fontSize: 28,
        left: e.absolutePointer?.x,
        top: e.absolutePointer?.y,
      });

      fabricRef.current.add(textObj);
      objectAdded(textObj);

      fabricRef.current.setActiveObject(textObj);

      setTextField(textObj.text as string);
      selectedTextEl.current = textObj;

      return;
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
      currentElRef.current = new fabric.Triangle({
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

    if (e.e.altKey && initialMouseCoordsRef.current && isDraggingRef.current) {
      const vpt = fabricRef.current?.viewportTransform as number[];

      vpt[4] += e.e.clientX - (lastPosXRef.current as number);
      vpt[5] += e.e.clientY - (lastPosYRef.current as number);

      lastPosXRef.current = e.e.clientX;
      lastPosYRef.current = e.e.clientY;

      fabricRef.current?.requestRenderAll();
    }

    if (modeRef.current === "text") return;

    if (initialMouseCoordsRef.current.x > e.absolutePointer.x || initialMouseCoordsRef.current.y > e.absolutePointer.y) {
      return;
    }

    if (currentElRef.current && modeRef.current === "circle") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Circle({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        radius: (initialMouseCoordsRef.current?.distanceFrom(e.absolutePointer as fabric.Point) || 0) / 2.25,
        fill: "",
        stroke: fabricRef.current?.freeDrawingBrush.color || "black",
        strokeWidth: 3,
        absolutePositioned: true,
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
        fill: "",
        stroke: fabricRef.current?.freeDrawingBrush.color || "black",
        strokeWidth: 3,
        absolutePositioned: true,
      });

      fabricRef.current?.add(currentElRef.current);
    }

    if (currentElRef.current && modeRef.current === "triangle") {
      fabricRef.current?.remove(currentElRef.current);

      currentElRef.current = new fabric.Triangle({
        left: initialMouseCoordsRef.current?.x,
        top: initialMouseCoordsRef.current?.y,
        width: e.absolutePointer.x - initialMouseCoordsRef.current.x,
        height: e.absolutePointer.y - initialMouseCoordsRef.current.y,
        fill: "",
        stroke: fabricRef.current?.freeDrawingBrush.color || "black",
        strokeWidth: 3,
        absolutePositioned: true,
      });

      fabricRef.current?.add(currentElRef.current);
    }
  };

  const mouseUp = (e: fabric.IEvent<MouseEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    isDraggingRef.current = false;
    canvas.selection = true;

    if (modeRef.current !== "pencil" && modeRef.current !== "selection") {
      addElementControls();
    }

    canvas.forEachObject((obj) => {
      obj.setCoords();
    });

    if (modeRef.current === "text") return;

    const recentDrawn = canvas._objects.at(-1) as any;
    if (recentDrawn && modeRef.current !== "selection" && !e.e.altKey) {
      objectAdded(recentDrawn);
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

  const objectAdded = (element: fabric.Object) => {
    console.log("OBJECT ADDED", element.toJSON());
    console.log("ACTION LENGTH", actionsRef.current.length);

    const data: CanvasActionData = {
      action: CanvasActions.OBJECT_ADDED,
      initiator: socket.id,
      type: modeRef.current,
      element: JSON.stringify(element),
      timestamp: Date.now(),
    };

    socket.emit(SocketActions.CANVAS_ACTION.toString(), [data]);
    actionsRef.current.push(data);
  };

  const objectModified = () => {
    console.log("OBJECT MODIFIED");

    const canvas = fabricRef.current;
    if (!canvas) return;

    const modifiedElems = canvas.getActiveObjects();

    // console.log("OBJECT MODIFIED", modifiedElems);
    const isGroup = "_objects" in canvas._activeObject;
    const group = canvas._activeObject;
    const centerX = (group.left as number) + (group.width as number) / 2;
    const centerY = (group.top as number) + (group.height as number) / 2;

    const timestamp = Date.now();
    const batchedActions = modifiedElems.map((modifiedElem: any) => {
      // if (!modifiedElem || "_objects" in modifiedElem) return;

      const modifiedElemIndex = canvas._objects.indexOf(modifiedElem);
      let modifiedElemType: Mode;

      switch (modifiedElem.type) {
        case "path":
          modifiedElemType = "pencil";
          break;

        case "rect":
          modifiedElemType = "square";
          break;

        case "circle":
          modifiedElemType = "circle";
          break;

        case "text":
          modifiedElemType = "text";
          break;

        case "triangle":
          modifiedElemType = "triangle";
          break;

        default:
          modifiedElemType = "selection";
      }

      const data: CanvasActionData = {
        type: modifiedElemType,
        action: CanvasActions.OBJECT_MODIFIED,
        initiator: socket.id,
        index: modifiedElemIndex,
        element: JSON.stringify({
          ...modifiedElem.toJSON(),
          left: isGroup ? modifiedElem.left + centerX : modifiedElem.left,
          top: isGroup ? modifiedElem.top + centerY : modifiedElem.top,
        }),
        timestamp,
      };

      // const data = {
      //   type: modifiedElemType,
      //   action: CanvasActions.OBJECT_MODIFIED,
      //   initiator: socket.id,
      //   index: modifiedElemIndex,
      //   properties: {
      //     left: isGroup ? modifiedElem.left + centerX : modifiedElem.left,
      //     top: isGroup ? modifiedElem.top + centerY : modifiedElem.top,
      //   },
      //   timestamp,
      // };

      const dataClone = { ...data, timestamp: null };
      const recentAction = { ...actionsRef.current.at(-1), timestamp: null };
      if (JSON.stringify(dataClone) === JSON.stringify(recentAction)) return;

      actionsRef.current.push(data);

      return data;
    });

    console.log(batchedActions);
    socket.emit(SocketActions.CANVAS_ACTION.toString(), batchedActions);
  };

  const addRemoteObject = (type: Mode, element: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const jsonElement = JSON.parse(element);

    if (type === "pencil") {
      canvas.add(new fabric.Path(jsonElement.path, jsonElement));
    }

    if (type === "square") {
      canvas.add(new fabric.Rect(jsonElement));
    }

    if (type === "circle") {
      canvas.add(new fabric.Circle(jsonElement));
    }

    if (type === "text") {
      canvas.add(new fabric.Text(jsonElement.text, jsonElement));
    }

    if (type === "triangle") {
      canvas.add(new fabric.Triangle(jsonElement));
    }
  };

  const removeRemoteObject = (indexes: number[]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    console.log("REMOVE INDEXES", indexes);
    const canvasObjects = [...canvas._objects];
    indexes.forEach((index) => canvas.remove(canvasObjects[index]));
  };

  const modifyRemoteObject = (type: Mode, element: string, index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    console.log("MODIFIED", index);

    const jsonElement = JSON.parse(element);
    let drawableObject: fabric.Object;

    if (type === "pencil") {
      drawableObject = new fabric.Path(jsonElement.path, jsonElement);
    } else if (type === "square") {
      drawableObject = new fabric.Rect(jsonElement);
    } else if (type === "text") {
      drawableObject = new fabric.Text(jsonElement.text, jsonElement);
    } else if (type === "triangle") {
      drawableObject = new fabric.Triangle(jsonElement);
    } else {
      // "circle"
      drawableObject = new fabric.Circle(jsonElement);
    }

    const objects = [...canvas._objects];

    canvas.clear();

    objects.forEach((obj, objIndex) => {
      if (objIndex === index) canvas.add(drawableObject);
      else canvas.add(obj);
    });
  };

  const rebuildCanvas = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.clear();
    actionsRef.current
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((actionData) => {
        if (actionData.action === CanvasActions.OBJECT_ADDED) {
          addRemoteObject(actionData.type as Mode, actionData.element as string);
        }

        if (actionData.action === CanvasActions.OBJECTS_REMOVED) {
          removeRemoteObject(actionData.indexes as number[]);
        }

        if (actionData.action === CanvasActions.OBJECT_MODIFIED) {
          modifyRemoteObject(actionData.type as Mode, actionData.element as string, actionData.index as number);
        }

        if (actionData.action === CanvasActions.SEND_OBJECT_FORWARD) {
          (actionData.indexes as any[]).forEach((i) => canvas.bringForward(canvas._objects[i]));
        }

        if (actionData.action === CanvasActions.SEND_OBJECT_BACKWARD) {
          (actionData.indexes as any[]).forEach((i) => canvas.sendBackwards(canvas._objects[i]));
        }
      });
  };

  const loadAndApplyCanvasActions = (canvasActionData: CanvasActionData) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    console.log(canvasActionData);

    const { action, type, element, timestamp, initiator } = canvasActionData;
    if (initiator === socket.id) return;

    if (action === CanvasActions.UNDO_ACTION) actionsRef.current = actionsRef.current.filter((action) => action.timestamp !== timestamp);
    else actionsRef.current.push(canvasActionData);

    // RECONSTRUCT to avoid edge cases
    rebuildCanvas();

    console.log("REMOTE ACTION:", action, type, element);
    console.log("FROM:", initiator);
  };

  useEffect(() => {
    if (!fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current);
      const fabricCanvas = fabricRef.current;

      fabricCanvas.freeDrawingBrush.width = 3;

      fabricCanvas.on("mouse:down", mouseDown);
      fabricCanvas.on("mouse:move", mouseMove);
      fabricCanvas.on("mouse:up", mouseUp);
      fabricCanvas.on("mouse:wheel", mouseWheeee);

      // fabricCanvas.on("object:added", (e) => {
      //   if (e.target?.type === "path") {
      //     objectAdded(e.target);
      //   }
      // });

      fabricCanvas.on("object:modified", () => objectModified());

      fabricCanvas.on("selection:created", () => {
        selectedObjectsRef.current = fabricCanvas.getActiveObjects();

        if ("_objects" in fabricCanvas._activeObject) {
          // fabricCanvas._activeObject.set("lockMovementX", true);
          // fabricCanvas._activeObject.set("lockMovementY", true);
          fabricCanvas._activeObject.set("lockRotation", true);
          fabricCanvas._activeObject.set("lockScalingX", true);
          fabricCanvas._activeObject.set("lockScalingY", true);
        }

        const selectedObjects: any[] = fabricCanvas.getActiveObjects();
        if (selectedObjects.length === 1 && selectedObjects[0].type === "text") {
          fabricCanvas.setActiveObject(selectedObjects[0]);

          setTextField((selectedObjects[0] as any).text as string);
          selectedTextEl.current = selectedObjects[0] as any;
        }

        // selectedObjects.forEach((obj) => {
        //   obj.strokeCopy = obj.stroke;
        //   obj.setOptions({ stroke: "#6bbbd6" });
        // });

        // fabricCanvas.requestRenderAll();
      });

      fabricCanvas.on("selection:cleared", () => {
        if (selectedObjectsRef.current.length === 1 && selectedObjectsRef.current[0].type === "text") {
          setTextField(null);
          selectedTextEl.current = undefined;
          acceptKeystrokes.current = true;
        }

        // (selectedObjectsRef.current as any[]).forEach((obj) => {
        //   obj.setOptions({ stroke: obj.strokeCopy });
        //   delete obj.strokeCopy;
        // });

        // fabricCanvas.requestRenderAll();

        selectedObjectsRef.current = [];
      });

      // fabricCanvas.on("object:removed", (e) => !isDraggingRef.current && objectRemoved(e));
    }

    window.onkeydown = (keyE) => {
      if (!acceptKeystrokes.current) return;
      if (!fabricRef.current) return;

      const canvas = fabricRef.current;

      if (keyE.code === "Backspace") {
        const selectedObjects = canvas.getActiveObjects();

        const data: CanvasActionData = {
          action: CanvasActions.OBJECTS_REMOVED,
          initiator: socket.id,
          indexes: selectedObjects.map((obj) => canvas._objects.indexOf(obj)),
          timestamp: Date.now(),
        };

        socket.emit(SocketActions.CANVAS_ACTION.toString(), [data]);
        actionsRef.current.push(data);
        selectedObjects.forEach((obj) => canvas.remove(obj));
      }

      if (keyE.code.toLowerCase().startsWith("alt")) {
        canvas.selection = true;
        if (modeRef.current === "pencil") canvas.isDrawingMode = false;
      }

      // if (keyE.key.toLowerCase() === "z" && (keyE.metaKey || keyE.ctrlKey)) {
      //   if (actionsRef.current.length === 0) return;

      //   const data = {
      //     action: CanvasActions.UNDO_ACTION,
      //     initiator: socket.id,
      //     timestamp: actionsRef.current.at(-1)?.timestamp,
      //   };

      //   socket.emit(SocketActions.CANVAS_ACTION.toString(), [data]);
      //   console.log(actionsRef.current);
      //   actionsRef.current = actionsRef.current.filter(
      //     (action) => action.timestamp !== actionsRef.current.at(-1)?.timestamp
      //   );
      //   rebuildCanvas();
      // }

      if (keyE.key.toLowerCase() === "s") {
        setMode("selection");
      }

      if (keyE.key.toLowerCase() === "p") {
        setMode("pencil");
      }

      if (keyE.key.toLowerCase() === "t") {
        setMode("text");
      }

      if (keyE.key === "]") {
        const activeObjects = canvas.getActiveObjects();

        const indexes = activeObjects.map((obj) => canvas._objects.indexOf(obj)).sort((a, b) => b - a);
        console.log(indexes);
        indexes.forEach((i) => canvas.bringForward(canvas._objects[i]));

        socket.emit(SocketActions.CANVAS_ACTION.toString(), [
          {
            action: CanvasActions.SEND_OBJECT_FORWARD,
            initiator: socket.id,
            indexes,
            timestamp: Date.now(),
          } as CanvasActionData,
        ]);

        canvas.requestRenderAll();
      }

      if (keyE.key === "[") {
        const activeObjects = canvas.getActiveObjects();

        const indexes = activeObjects.map((obj) => canvas._objects.indexOf(obj)).sort((a, b) => a - b);
        console.log(indexes);
        indexes.forEach((i) => canvas.sendBackwards(canvas._objects[i]));

        socket.emit(SocketActions.CANVAS_ACTION.toString(), [
          {
            action: CanvasActions.SEND_OBJECT_BACKWARD,
            initiator: socket.id,
            indexes,
            timestamp: Date.now(),
          } as CanvasActionData,
        ]);

        canvas.requestRenderAll();
      }
    };

    window.onkeyup = (keyE) => {
      if (!acceptKeystrokes.current) return;
      if (!fabricRef.current) return;

      const canvas = fabricRef.current;
      if (keyE.code.toLowerCase().startsWith("alt")) {
        if (modeRef.current !== "selection") canvas.selection = false;
        if (modeRef.current === "pencil") canvas.isDrawingMode = true;
      }
    };
  }, []);

  useEffect(() => {
    const roomId = window.location.pathname.slice(1) || uuidv4();

    if (!window.location.pathname.slice(1)) {
      window.history.pushState("", "", "/" + roomId);
    }

    socket.io.on("open", () => {
      socket.emit(SocketActions.JOIN_ROOM.toString(), { roomId });
      setPageLoading(false);
    });

    socket.on(SocketActions.LOAD_CANVAS.toString(), (canvasActions: any) => {
      actionsRef.current = canvasActions ? canvasActions.slice(0, canvasActions.length - 1) : [];
      if (canvasActions.at(-1)) loadAndApplyCanvasActions(canvasActions.at(-1));
    });

    socket.on(SocketActions.UPDATE_PEOPLE_COUNT.toString(), (count: number) => setPeople(count));

    // STORE HOSTORY OF ALL ACTIONS sorted with TIMESTAMP & rebuild them on every update
    socket.on(SocketActions.CANVAS_ACTION.toString(), (canvasActionsData: CanvasActionData[]) => {
      console.log("ACTION DATA", canvasActionsData);
      canvasActionsData.forEach(loadAndApplyCanvasActions);
    });
  }, []);

  useEffect(() => {
    const fabricCanvas = fabricRef.current as fabric.Canvas;

    if (mode !== "selection") {
      if (mode === "text") fabricCanvas.defaultCursor = "text";

      if (mode === "pencil") {
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.defaultCursor = "crosshair";
      } else fabricCanvas.isDrawingMode = false;

      if (mode === "square" || mode === "circle" || mode === "triangle") {
        fabricCanvas.defaultCursor = "default";
      }

      fabricCanvas.selection = false;
    } else if (mode === "selection") {
      fabricCanvas.defaultCursor = "default";
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
    }
  }, [mode]);

  const changeColor = (color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.freeDrawingBrush.color = color;

    const selectedObjects = canvas.getActiveObjects();
    selectedObjects.forEach((obj) => {
      if (obj.type === "text") obj.setOptions({ fill: color });
      else obj.setOptions({ stroke: color });
    });

    if (selectedObjects.length > 0) {
      canvas.requestRenderAll();
      objectModified();
    }
  };

  return (
    <section className="flex flex-col items-center relative">
      <canvas width={window.innerWidth} height={window.innerHeight} ref={canvasRef} />

      {textField !== null && (
        <div className="fixed top-10 bg-white">
          <form>
            <textarea
              onChange={(e) => {
                setTextField(e.target.value);

                if (selectedTextEl.current && e.target.value) {
                  (selectedTextEl.current as fabric.Text).text = e.target.value;

                  console.log(textTypeTimeoutRef.current);
                  clearTimeout(textTypeTimeoutRef.current);
                  textTypeTimeoutRef.current = setTimeout(() => {
                    console.log("timeout modified");
                    objectModified();
                  }, 500);

                  fabricRef.current?.renderAll();
                }
              }}
              className="text-xl px-5 py-2 w-96 border shadow-xl rounded focus:outline-none"
              value={textField}
              onFocusCapture={() => (acceptKeystrokes.current = false)}
            />
          </form>
        </div>
      )}

      {pageLoading && (
        <div className="z-50 fixed w-full h-full flex justify-center items-center cursor-not-allowed">
          <img className="w-64" src="/loading.gif" />
        </div>
      )}

      <div className="flex items-center rounded p-1.5 bg-gray-100 fixed top-5 right-5">
        <IoEye className="mr-1 text-lg text-gray-600" />
        <p className="text-sm text-gray-600">{people}</p>
      </div>

      <div className="flex items-center justify-between fixed bottom-10 px-7 py-2 border text-4xl shadow-xl rounded-2xl bg-white">
        <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => {
            console.log(actionsRef.current);
            setMode("selection");
          }}
        >
          <FaMousePointer className={`${mode === "selection" ? "text-purple-500" : "text-gray-500"}`} />
        </div>

        <div className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100" onClick={() => setMode("pencil")}>
          <ImPencil2 className={`${mode === "pencil" ? "text-purple-500" : "text-gray-500"}`} />
        </div>

        <div
          className="p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          onClick={() => {
            setMode("text");
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
                  setShowShapes(false);
                }}
              >
                <IoEllipse className="text-gray-600 text-4xl" />
              </div>

              <div
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setMode("square");
                  setShowShapes(false);
                }}
              >
                <IoSquare className="text-gray-600 text-4xl" />
              </div>

              <div
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setMode("triangle");
                  setShowShapes(false);
                }}
              >
                <IoTriangle className="text-gray-600 text-4xl" />
              </div>
            </div>
          )}
          <div
            onClick={() => setShowShapes(!showShapes)}
            className="-ml-1 mr-5 p-5 rounded-full hover:scale-110 hover:shadow-lg cursor-pointer duration-100"
          >
            <IoShapesOutline className={`${["square", "circle", "triangle"].includes(mode) ? "text-purple-500" : "text-gray-500"}`} />
          </div>
        </div>

        <div className="border-[3px]" style={{ borderColor: color }}>
          <div className="flex items-center">
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-black"
              onClick={() => {
                setColor("#000000");
                changeColor("#000000");
              }}
            />
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-emerald-500"
              onClick={() => {
                setColor("#10b981");
                changeColor("#10b981");
              }}
            />
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-rose-600"
              onClick={() => {
                setColor("#e11d48");
                changeColor("#e11d48");
              }}
            />
          </div>

          <div className="flex items-center">
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-gray-400"
              onClick={() => {
                setColor("#9ca3af");
                changeColor("#9ca3af");
              }}
            />
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-purple-500"
              onClick={() => {
                setColor("#a855f7");
                changeColor("#a855f7");
              }}
            />
            <div
              className="hover:scale-125 cursor-pointer duration-100 w-5 h-5 bg-blue-500"
              onClick={() => {
                setColor("#3b82f6");
                changeColor("#3b82f6");
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
