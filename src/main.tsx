import {
  css,
  type Component,
  type Stateful,
  createState,
} from "dreamland/core";

type WindowDataSegment = { t: string };

type WindowFocusReply = {
  t: "window_focus";
  window: string;
};

type RenderReply = {
  t: "render_reply";
};

type WindowFocusRequest = {
  t: "window_focus";
  window: string;
};

type WindowReorderRequest = {
  t: "window_reorder";
  windows: string[];
};

type WindowRegisterBorderRequest = {
  t: "window_register_border";
  window: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type WindowMapReply = {
  t: "window_map";
  window: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

type MouseMoveReply = {
  t: "mouse_move";
  x: number;
  y: number;
};

type WindowMapRequest = {
  t: "window_map";
  window: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type WindowData = {
  window: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

const BORDER_WIDTH = 20;
let WindowFrame: Component<
  {
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    window: string;
  },
  {
    mousedown: boolean;
  }
> = function (ctx) {
  ctx.mount = () => {
    let offsetX = 0;
    let offsetY = 0;

    ctx.root.addEventListener("mousedown", (e) => {
      this.mousedown = true;
      offsetX = this.x - e.clientX;
      offsetY = this.y - e.clientY;

      message_queue.push({
        t: "window_focus",
        window: this.window,
      } as WindowFocusRequest);
    });
    document.addEventListener("mouseup", () => {
      this.mousedown = false;
    });
    document.addEventListener("mousemove", (e) => {
      if (this.mousedown) {
        message_queue.push({
          t: "window_map",
          x: e.clientX + offsetX,
          y: e.clientY + offsetY,
          window: state.windows[this.window].window,
          width: state.windows[this.window].width,
          height: state.windows[this.window].height,
        } as WindowMapRequest);

        state.window_buffer[this.window].x = e.clientX + offsetX;
        state.window_buffer[this.window].y = e.clientY + offsetY;
        state.window_buffer = state.window_buffer;

      }
    });
  };
  return (
    <div
      style={{
        position: "absolute",
        left: use(this.x).map((x) => x + "px"),
        top: use(this.y).map((y) => y - BORDER_WIDTH + "px"),
        width: use(this.width).map((w) => w + "px"),
        height: use(this.height).map((h) => h + BORDER_WIDTH + "px"),
        display: use(this.visible).map((v) => (v ? "block" : "none")),
        cursor: "pointer",
        "z-index": use(state.window_order).map((order) => (order.indexOf(this.window) + 1).toString()) 
      }}
    >
      <div
        class={use(this.mousedown).map((m) =>
          m ? "title-bar title-bar-active" : "title-bar",
        )}
      >
        <div class="title-bar-text">{this.window}</div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
    </div>
  );
};

let state: Stateful<{
  windows: Record<string, WindowData>;
  window_buffer: Record<string, WindowData>;
  window_order: string[];
  window_frames: Record<string, HTMLElement>;
  elapsed: DOMHighResTimeStamp;
}> = createState({
  windows: {},
  window_buffer: {},
  window_order: [],
  window_frames: {},
  elapsed: 0,
});
let message_queue: WindowDataSegment[] = [];

use(state.window_order).listen((val) => {
  message_queue.push({
    t: "window_reorder",
    windows: val,
  } as WindowReorderRequest);
});

let start: DOMHighResTimeStamp;
function step(timestamp: DOMHighResTimeStamp) {
  if (start === undefined) {
    start = timestamp;
  }
  state.elapsed = timestamp - start;

  message_queue.push({t: "render_request"});

  window.cefQuery({
    request: JSON.stringify(message_queue),
    onSuccess: (response: string) => {
      message_queue = [];
      if (response != "[]") console.log(response, state.elapsed);

      const response_parsed = JSON.parse(response) as WindowDataSegment[];
      for (let segment in response_parsed) {
        if (response_parsed[segment]["t"] == "window_focus") {
          let window_focus_reply = response_parsed[segment] as WindowFocusReply;

          state.window_order.splice(
            state.window_order.indexOf(window_focus_reply.window),
            1,
          );
          state.window_order.push(window_focus_reply.window);
          state.window_order = state.window_order;
        }
        if (response_parsed[segment]["t"] == "render_reply") {
          state.windows = state.window_buffer;
        }

        else if (response_parsed[segment]["t"] == "mouse_move") {
          let mouse_move_reply = response_parsed[segment] as MouseMoveReply;
          let event = new MouseEvent("mousemove", {
            clientX: mouse_move_reply.x,
            clientY: mouse_move_reply.y,
            view: window,
          });
          document.dispatchEvent(event);
        } else if (response_parsed[segment]["t"] == "window_map") {
          let window_map_reply = response_parsed[segment] as WindowMapReply;

          if (
            !state.window_buffer[window_map_reply.window] &&
            window_map_reply.x == 0 &&
            window_map_reply.y == 0 &&
            window_map_reply.visible
          ) {
            message_queue.push({
              t: "window_map",
              x: 100,
              y: 100,
              window: window_map_reply.window,
              width: window_map_reply.width,
              height: window_map_reply.height,
            } as WindowMapRequest);
          }

          if (!state.window_buffer[window_map_reply.window]) {
            state.window_buffer[window_map_reply.window] = {
              window: window_map_reply.window,
              visible: window_map_reply.visible,
              x: window_map_reply.x,
              y: window_map_reply.y,
              width: window_map_reply.width,
              height: window_map_reply.height,
            };
            state.windows = state.window_buffer;
          } else if (state.window_buffer[window_map_reply.window]) {
            state.window_buffer[window_map_reply.window] = {
              window: window_map_reply.window,
              visible: window_map_reply.visible,
              x: state.window_buffer[window_map_reply.window].x,
              y: state.window_buffer[window_map_reply.window].y,
              width: window_map_reply.width,
              height: window_map_reply.height,
            };
          }

          state.window_buffer = state.window_buffer;

          if (!state.window_order.includes(window_map_reply.window)) {
            state.window_order.push(window_map_reply.window);
            state.window_order = state.window_order;
          }

          if (!state.window_frames[window_map_reply.window]) {
            state.window_frames[window_map_reply.window] = (
              <WindowFrame
                x={use(state.windows).map(
                  () => state.windows[window_map_reply.window].x,
                )}
                y={use(state.windows).map(
                  () => state.windows[window_map_reply.window].y,
                )}
                width={use(state.windows).map(
                  () => state.windows[window_map_reply.window].width,
                )}
                height={use(state.windows).map(
                  () => state.windows[window_map_reply.window].height,
                )}
                visible={use(state.windows).map(
                  () => state.windows[window_map_reply.window].visible,
                )}
                window={window_map_reply.window}
              />
            );

            message_queue.push({
              t: "window_register_border",
              window: window_map_reply.window,
              x: 0,
              y: -BORDER_WIDTH,
              width: 0,
              height: 0,
            } as WindowRegisterBorderRequest);
          }

          state.window_frames = state.window_frames;
        }
      }
    },
    onFailure: function (_error_code: number, _error_message: string) {},
  });

  requestAnimationFrame(step);
}

requestAnimationFrame(step);

let App: Component<{}, { counter: number; x: number; y: number }> = function (
  ctx,
) {
  this.counter = 0;
  this.x = 0;
  this.y = 0;

  ctx.mount = () => {
    document.addEventListener("mousemove", (e) => {
      this.x = e.screenX;
      this.y = e.screenY;
    });
  };

  return (
    <div>
      {use(this.x)},{use(this.y)}
      {use(state.windows).map((wins) => JSON.stringify(wins))}
      {use(state.window_order).map((wins) => JSON.stringify(wins))}
      {use(state.window_frames).map((wins) => {
        return Object.values(wins);
      })}
    </div>
  );
};
App.style = css`
  :scope {
    border: 4px dashed cornflowerblue;
    padding: 1em;
  }
`;

document.querySelector("#app")?.replaceWith(<App />);
document.addEventListener("contextmenu", () => {
  return false;
});
