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

type WindowCloseReply = {
  t: "window_close";
  window: string;
};

type WindowCloseRequest = {
  t: "window_close";
  window: string;
};

type RenderReply = {
  t: "render_reply";
};

type WindowFocusRequest = {
  t: "window_focus";
  window: string;
};

type WindowIconReply = {
  t: "window_icon";
  window: string;
  image: string;
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
  name: string;
  visible: boolean;
  has_border: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  win_t:
    | "WINDOW_TYPE_DESKTOP"
    | "WINDOW_TYPE_DOCK"
    | "WINDOW_TYPE_TOOLBAR"
    | "WINDOW_TYPE_MENU"
    | "WINDOW_TYPE_UTILITY"
    | "WINDOW_TYPE_SPLASH"
    | "WINDOW_TYPE_DIALOG"
    | "WINDOW_TYPE_DROPDOWN_MENU"
    | "WINDOW_TYPE_POPUP_MENU"
    | "WINDOW_TYPE_TOOLTIP"
    | "WINDOW_TYPE_NOTIFICATION"
    | "WINDOW_TYPE_COMBO"
    | "WINDOW_TYPE_DND"
    | "WINDOW_TYPE_NORMAL";
};

type MouseMoveReply = {
  t: "mouse_move";
  x: number;
  y: number;
};

type MousePressReply = {
  t: "mouse_press";
  state: number;
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

type RunProgramRequest = {
  t: "run_program";
  command: string[];
};

type WindowData = {
  window: string;
  name: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  image: string | null;
};

const BORDER_WIDTH = 20;
const MIN_SIZE = 150;
const BORDER_BASE = 3;
let WindowFrame: Component<
  {
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    window: string;
    name: string;
    icon: string | null;
  },
  {
    mousedown: boolean;

    offset_x: number;
    offset_y: number;

    fullscreen: boolean;

    mouse_x: number;
    mouse_y: number;

    n_resize: boolean;
    e_resize: boolean;
    s_resize: boolean;
    w_resize: boolean;
    se_resize: boolean;
    ne_resize: boolean;
    sw_resize: boolean;
    nw_resize: boolean;

    old_x: number;
    old_y: number;
    old_width: number;
    old_height: number;
  }
> = function (ctx) {
  ctx.mount = () => {
    let window_x = Math.max(state.windows[this.window].x, 0);
    let window_y = Math.max(state.windows[this.window].y, BORDER_WIDTH);

    message_queue.push({
      t: "window_map",
      x: window_x,
      y: window_y,
      window: state.windows[this.window].window,
      width: state.windows[this.window].width,
      height: state.windows[this.window].height,
    } as WindowMapRequest);

    document.addEventListener("mouseup", () => {
      this.n_resize = false;
      this.e_resize = false;
      this.s_resize = false;
      this.w_resize = false;
      this.se_resize = false;
      this.sw_resize = false;
      this.ne_resize = false;
      this.nw_resize = false;

      if (this.mousedown) {
        message_queue.push({
          t: "window_focus",
          window: this.window,
        } as WindowFocusRequest);

        if (state.window_order.includes(this.window)) {
          state.window_order.splice(state.window_order.indexOf(this.window), 1);
        }
        state.window_order.push(this.window);
      }

      this.mousedown = false;
    });
    document.addEventListener("mousemove", (e: MouseEvent) => {
      const window_corrected_x = Math.max(this.x, 0);
      const window_corrected_y = Math.max(this.y, BORDER_WIDTH);

      if (
        this.nw_resize ||
        this.s_resize ||
        this.se_resize ||
        this.w_resize ||
        this.sw_resize ||
        this.n_resize ||
        this.e_resize ||
        this.ne_resize ||
        this.mousedown
      ) {
        if (state.window_order.includes(this.window)) {
          state.window_order.splice(state.window_order.indexOf(this.window), 1);
        }
        state.window_order.push(this.window);
        state.window_order = state.window_order;
      }

      if (
        this.fullscreen &&
        (this.nw_resize ||
          this.s_resize ||
          this.se_resize ||
          this.w_resize ||
          this.sw_resize ||
          this.n_resize ||
          this.e_resize ||
          this.ne_resize ||
          this.mousedown)
      ) {
        this.fullscreen = false;
        message_queue.push({
          t: "window_map",
          x: this.old_x,
          y: this.old_y,
          window: state.windows[this.window].window,
          width: this.old_width,
          height: this.old_height,
        } as WindowMapRequest);

        state.windows[this.window].x = this.old_x;
        state.windows[this.window].y = this.old_y;
        state.windows[this.window].width = this.old_width;
        state.windows[this.window].height = this.old_height;
        state.windows = state.windows;

        this.offset_x = -(this.old_width / 2);
      }

      if (this.mousedown) {
        const window_x = Math.max(e.clientX + this.offset_x, 0);
        const window_y = Math.max(e.clientY + this.offset_y, BORDER_WIDTH);

        message_queue.push({
          t: "window_map",
          x: window_x,
          y: window_y,
          window: state.windows[this.window].window,
          width: state.windows[this.window].width,
          height: state.windows[this.window].height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_x;
        state.windows[this.window].y = window_y;
        state.windows = state.windows;
      }

      if (this.e_resize) {
        let delta_x = e.clientX - this.mouse_x;
        const new_width = Math.max(this.old_width + delta_x, MIN_SIZE);

        message_queue.push({
          t: "window_map",
          x: window_corrected_x,
          y: window_corrected_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: state.windows[this.window].height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_corrected_x;
        state.windows[this.window].y = window_corrected_y;
        state.windows[this.window].width = new_width;
        state.windows = state.windows;
      }

      if (this.n_resize) {
        let delta_y = e.clientY - this.mouse_y;
        const new_height = Math.max(this.old_height - delta_y, MIN_SIZE);
        const new_y = Math.max(this.old_y + delta_y, BORDER_WIDTH);

        message_queue.push({
          t: "window_map",
          x: window_corrected_x,
          y: new_y,
          window: state.windows[this.window].window,
          width: state.windows[this.window].width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_corrected_x;
        state.windows[this.window].y = new_y;
        state.windows[this.window].height = new_height;
        state.windows = state.windows;
      }

      if (this.ne_resize) {
        let delta_y = e.clientY - this.mouse_y;
        let delta_x = e.clientX - this.mouse_x;
        const new_height = Math.max(this.old_height - delta_y, MIN_SIZE);
        const new_width = Math.max(this.old_width + delta_x, MIN_SIZE);
        const new_y = Math.max(this.old_y + delta_y, BORDER_WIDTH);

        message_queue.push({
          t: "window_map",
          x: window_corrected_x,
          y: new_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_corrected_x;
        state.windows[this.window].y = new_y;
        state.windows[this.window].height = new_height;
        state.windows[this.window].width = new_width;
        state.windows = state.windows;
      }

      if (this.nw_resize) {
        let delta_y = e.clientY - this.mouse_y;
        let delta_x = e.clientX - this.mouse_x;
        const new_height = Math.max(this.old_height - delta_y, MIN_SIZE);
        const new_width = Math.max(this.old_width - delta_x, MIN_SIZE);
        const new_y = Math.max(this.old_y + delta_y, BORDER_WIDTH);
        const new_x = Math.max(this.old_x + delta_x, 0);

        message_queue.push({
          t: "window_map",
          x: new_x,
          y: new_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = new_x;
        state.windows[this.window].y = new_y;
        state.windows[this.window].height = new_height;
        state.windows[this.window].width = new_width;
        state.windows = state.windows;
      }

      if (this.s_resize) {
        let delta_y = e.clientY - this.mouse_y;
        const new_height = Math.max(this.old_height + delta_y, MIN_SIZE);

        message_queue.push({
          t: "window_map",
          x: window_corrected_x,
          y: window_corrected_y,
          window: state.windows[this.window].window,
          width: state.windows[this.window].width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_corrected_x;
        state.windows[this.window].y = window_corrected_y;
        state.windows[this.window].height = new_height;
        state.windows = state.windows;
      }

      if (this.se_resize) {
        let delta_y = e.clientY - this.mouse_y;
        const new_height = Math.max(this.old_height + delta_y, MIN_SIZE);
        let delta_x = e.clientX - this.mouse_x;
        const new_width = Math.max(this.old_width + delta_x, MIN_SIZE);

        message_queue.push({
          t: "window_map",
          x: window_corrected_x,
          y: window_corrected_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = window_corrected_x;
        state.windows[this.window].y = window_corrected_y;
        state.windows[this.window].width = new_width;
        state.windows[this.window].height = new_height;
        state.windows = state.windows;
      }

      if (this.w_resize) {
        let delta_x = e.clientX - this.mouse_x;
        const new_width = Math.max(this.old_width - delta_x, MIN_SIZE);
        const new_x = Math.max(this.old_x + delta_x, 0);

        message_queue.push({
          t: "window_map",
          x: new_x,
          y: window_corrected_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: state.windows[this.window].height,
        } as WindowMapRequest);

        state.windows[this.window].x = new_x;
        state.windows[this.window].y = window_corrected_y;
        state.windows[this.window].width = new_width;
        state.windows = state.windows;
      }

      if (this.sw_resize) {
        let delta_x = e.clientX - this.mouse_x;
        const new_width = Math.max(this.old_width - delta_x, MIN_SIZE);
        const new_x = Math.max(this.old_x + delta_x, 0);
        let delta_y = e.clientY - this.mouse_y;
        const new_height = Math.max(this.old_height + delta_y, MIN_SIZE);

        message_queue.push({
          t: "window_map",
          x: new_x,
          y: window_corrected_y,
          window: state.windows[this.window].window,
          width: new_width,
          height: new_height,
        } as WindowMapRequest);

        state.windows[this.window].x = new_x;
        state.windows[this.window].y = window_corrected_y;
        state.windows[this.window].width = new_width;
        state.windows[this.window].height = new_height;
        state.windows = state.windows;
      }
    });
  };
  return (
    <div
      id="window-base"
      on:mousedown={(e: MouseEvent) => {
        if ((e.target as HTMLElement).id != "window-base") {
          return;
        }

        if (state.window_order.includes(this.window)) {
          state.window_order.splice(state.window_order.indexOf(this.window), 1);
        }
        state.window_order.push(this.window);
        state.window_order = state.window_order;
      }}
    >
      <div
        style={{
          position: "absolute",
          left: use(this.x).map((x) => x - BORDER_BASE + "px"),
          top: use(this.y).map((y) => y + -BORDER_WIDTH + -BORDER_BASE + "px"),
          width: use(this.width).map((w) => w + "px"),
          height: use(this.height).map((h) => h + BORDER_WIDTH + "px"),
          display: use(this.visible).map((v) => (v ? "block" : "none")),
          cursor: "pointer",
          "z-index": use(state.window_order).map((order) =>
            (order.indexOf(this.window) + 1).toString(),
          ),
        }}
        class="window"
      >
        <div
          class={use(this.mousedown).map((m) =>
            m ? "title-bar title-bar-active" : "title-bar",
          )}
          id="title-bar"
          on:mousedown={(e: MouseEvent) => {
            if ((e.target as HTMLElement).id !== "title-bar") {
              return;
            }

            this.mousedown = true;
            this.offset_x = this.x - e.clientX;
            this.offset_y = this.y - e.clientY;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            if (state.window_order.includes(this.window)) {
              state.window_order.splice(
                state.window_order.indexOf(this.window),
                1,
              );
            }
            state.window_order.push(this.window);
            state.window_order = state.window_order;
          }}
        >
          <div class="title-bar-text" id="title-bar">
            {use(this.icon).map((icon) => {
              if (!icon) {
                return "";
              }
              return (
                <img
                  width={BORDER_WIDTH - 8}
                  height={BORDER_WIDTH - 8}
                  src={icon}
                  style={{ "margin-right": "10px" }}
                />
              );
            })}
            {use(this.name)}
          </div>
          <div class="title-bar-controls">
            <button
              aria-label="Maximize"
              on:mousedown={() => {
                this.fullscreen = true;
                this.old_x = this.x;
                this.old_y = this.y;
                this.old_width = this.width;
                this.old_height = this.height;

                message_queue.push({
                  t: "window_map",
                  x: BORDER_BASE,
                  y: BORDER_WIDTH + BORDER_BASE,
                  window: state.windows[this.window].window,
                  width: window.screen.width + -BORDER_BASE * 2,
                  height:
                    window.screen.height - BORDER_WIDTH + -BORDER_BASE * 2,
                } as WindowMapRequest);

                state.windows[this.window].x = BORDER_BASE;
                state.windows[this.window].y = BORDER_WIDTH + BORDER_BASE;
                state.windows[this.window].width =
                  window.screen.width + -BORDER_BASE * 2;
                state.windows[this.window].height =
                  window.screen.height - BORDER_WIDTH + -BORDER_BASE * 2;
                state.windows = state.windows;
              }}
            ></button>
            <button
              aria-label="Close"
              on:mousedown={() => {
                message_queue.push({
                  t: "window_close",
                  window: this.window,
                } as WindowCloseRequest);

                state.windows[this.window].visible = false;
              }}
            ></button>
          </div>
        </div>
      </div>
      <div
        class="window_handles"
        style={{
          position: "absolute",
          left: use(this.x).map((x) => x - BORDER_BASE + "px"),
          top: use(this.y).map((y) => y + -BORDER_WIDTH + -BORDER_BASE + "px"),
          width: use(this.width).map((w) => w + BORDER_BASE * 2 + "px"),
          height: use(this.height).map(
            (h) => h + BORDER_WIDTH + BORDER_BASE * 2 + "px",
          ),
          display: use(this.visible).map((v) => (v ? "grid" : "none")),
          "z-index": use(state.window_order).map((order) =>
            (order.indexOf(this.window) + 1).toString(),
          ),
          "pointer-events": "none",
        }}
      >
        <div
          style={{
            "pointer-events": "auto",
            cursor: "nwse-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.nw_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
        <div
          style={{
            "pointer-events": "auto",
            cursor: "ns-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.n_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
        <div
          style={{
            "pointer-events": "auto",
            cursor: "nesw-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.ne_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>

        <div
          style={{
            "pointer-events": "auto",
            cursor: "ew-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.w_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
        <div
          style={{
            "background-color": "transparent",
            "pointer-events": "none",
          }}
        ></div>
        <div
          style={{
            "pointer-events": "auto",
            cursor: "ew-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.e_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>

        <div
          style={{
            "pointer-events": "auto",
            cursor: "nesw-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.sw_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
        <div
          style={{
            "pointer-events": "auto",
            cursor: "ns-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.s_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
        <div
          style={{
            "pointer-events": "auto",
            cursor: "nwse-resize",
          }}
          on:mousedown={(e: MouseEvent) => {
            this.se_resize = true;
            this.mouse_x = e.clientX;
            this.mouse_y = e.clientY;

            this.old_x = this.x;
            this.old_y = this.y;
            this.old_width = this.width;
            this.old_height = this.height;
          }}
        ></div>
      </div>
    </div>
  );
};

WindowFrame.style = css`
  .window_handles {
    grid-template-columns: ${BORDER_BASE.toString()}px 1fr ${BORDER_BASE.toString()}px;
    grid-template-rows: ${BORDER_BASE.toString()}px 1fr ${BORDER_BASE.toString()}px;
  }
`;

let state: Stateful<{
  windows: Record<string, WindowData>;
  window_order: string[];
  window_frames: Record<string, HTMLElement>;
  elapsed: DOMHighResTimeStamp;
}> = createState({
  windows: {},
  window_order: [],
  window_frames: {},
  elapsed: 0,
});
let message_queue: WindowDataSegment[] = [{ t: "browser_start" }];
let message_back_buffer: WindowDataSegment[] = [];

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

  message_back_buffer = message_queue;
  message_queue = [];

  window.cefQuery({
    request: JSON.stringify(message_back_buffer),
    onSuccess: (response: string) => {
      message_back_buffer = [];
      if (response != "[]") console.log(response, state.elapsed);

      const response_parsed = JSON.parse(response) as WindowDataSegment[];
      for (let segment in response_parsed) {
        if (response_parsed[segment]["t"] == "window_focus") {
          let window_focus_reply = response_parsed[segment] as WindowFocusReply;

          if (state.window_order.includes(window_focus_reply.window)) {
            state.window_order.splice(
              state.window_order.indexOf(window_focus_reply.window),
              1,
            );
          }
          state.window_order.push(window_focus_reply.window);
          state.window_order = state.window_order;
        } else if (response_parsed[segment]["t"] == "window_close") {
          // TODO: causes bugs! properly destroy elements some other way!
          // let window_close_reply = response_parsed[segment] as WindowCloseReply;
          //
          // if (state.window_order.includes(window_close_reply.window)) {
          //   state.window_order.splice(
          //     state.window_order.indexOf(window_close_reply.window),
          //     1,
          //   );
          // }
          //
          // if (state.windows[window_close_reply.window]) {
          //   delete state.windows[window_close_reply.window];
          // }
          // if (state.window_frames[window_close_reply.window]) {
          //   delete state.window_frames[window_close_reply.window];
          // }
        } else if (response_parsed[segment]["t"] == "mouse_move") {
          let mouse_move_reply = response_parsed[segment] as MouseMoveReply;
          let event = new MouseEvent("mousemove", {
            clientX: mouse_move_reply.x,
            clientY: mouse_move_reply.y,
            view: window,
          });
          document.dispatchEvent(event);
        } else if (response_parsed[segment]["t"] == "reload") {
          window.location.reload();
        } else if (response_parsed[segment]["t"] == "mouse_press") {
          let mouse_move_reply = response_parsed[segment] as MousePressReply;
          let event = new MouseEvent("mousepress", {
            clientX: mouse_move_reply.x,
            clientY: mouse_move_reply.y,
            view: window,
          });
          document.dispatchEvent(event);
        } else if (response_parsed[segment]["t"] == "window_icon") {
          let window_icon_reply = response_parsed[segment] as WindowIconReply;

          state.windows[window_icon_reply.window].image =
            window_icon_reply.image;
        } else if (response_parsed[segment]["t"] == "window_map") {
          let window_map_reply = response_parsed[segment] as WindowMapReply;

          if (window_map_reply.win_t == "WINDOW_TYPE_NORMAL") {
            if (!state.windows[window_map_reply.window]) {
              if (
                !state.windows[window_map_reply.window] &&
                window_map_reply.x == 0 &&
                window_map_reply.y == 0 &&
                window_map_reply.visible
              ) {
                message_queue.push({
                  t: "window_map",
                  x: 100,
                  y: 100,
                  window: window_map_reply.window,
                  width: 500,
                  height: 500,
                } as WindowMapRequest);
                window_map_reply.x = 100;
                window_map_reply.y = 100;
              }

              state.windows[window_map_reply.window] = {
                window: window_map_reply.window,
                name: window_map_reply.name,
                visible: window_map_reply.visible,
                x: window_map_reply.x,
                y: window_map_reply.y,
                width: window_map_reply.width,
                height: window_map_reply.height,
                image: null,
              };
            } else if (state.windows[window_map_reply.window]) {
              state.windows[window_map_reply.window] = {
                window: window_map_reply.window,
                visible: window_map_reply.visible,
                name: window_map_reply.name,
                x: state.windows[window_map_reply.window].x,
                y: state.windows[window_map_reply.window].y,
                width: state.windows[window_map_reply.window].width,
                height: state.windows[window_map_reply.window].height,
                image: state.windows[window_map_reply.window].image,
              };

              if (
                state.windows[window_map_reply.window].x !=
                  window_map_reply.x ||
                state.windows[window_map_reply.window].y != window_map_reply.y
              ) {
                message_queue.push({
                  t: "window_map",
                  x: state.windows[window_map_reply.window].x,
                  y: state.windows[window_map_reply.window].y,
                  window: state.windows[window_map_reply.window].window,
                  width: state.windows[window_map_reply.window].width,
                  height: state.windows[window_map_reply.window].height,
                } as WindowMapRequest);
              }
            }

            state.windows = state.windows;

            if (!state.window_order.includes(window_map_reply.window)) {
              state.window_order.push(window_map_reply.window);
              state.window_order = state.window_order;
            }

            if (!window_map_reply.has_border) {
              message_queue.push({
                t: "window_register_border",
                window: window_map_reply.window,
                x: -BORDER_BASE,
                y: -BORDER_WIDTH + -BORDER_BASE,
                width: BORDER_BASE,
                height: BORDER_BASE,
              } as WindowRegisterBorderRequest);
            }

            if (!state.window_frames[window_map_reply.window]) {
              state.window_frames[window_map_reply.window] = (
                <WindowFrame
                  name={use(state.windows).map(
                    () => state.windows[window_map_reply.window].name,
                  )}
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
                  visible={use(state.windows).map(() => {
                    return state.windows[window_map_reply.window].visible;
                  })}
                  icon={use(state.windows).map(
                    () => state.windows[window_map_reply.window].image,
                  )}
                  window={window_map_reply.window}
                />
              );
            }

            state.window_frames = state.window_frames;
          }
        }
      }
    },
    onFailure: function (_error_code: number, _error_message: string) {
      message_queue = [];
    },
  });

  requestAnimationFrame(step);
}

requestAnimationFrame(step);

let App: Component<
  {},
  {
    counter: number;
    x: number;
    y: number;
    showLauncher: boolean;
    programInput: string;
  }
> = function (ctx) {
  this.counter = 0;
  this.x = 0;
  this.y = 0;
  this.showLauncher = false;
  this.programInput = "";

  ctx.mount = () => {
    document.addEventListener("mousemove", (e) => {
      this.x = e.screenX;
      this.y = e.screenY;
    });
  };

  const runProgram = () => {
    if (this.programInput.trim()) {
      message_queue.push({
        t: "run_program",
        command: this.programInput.trim().split(" "),
      } as RunProgramRequest);
      this.programInput = "";
      this.showLauncher = false;
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        on:mousedown={() => {
          this.showLauncher = !this.showLauncher;
          if (this.showLauncher) {
            setTimeout(() => {
            document.getElementById("launcher-textbox")?.focus();
            }, 100)
          }
        }}
        style={{ width: "100%", height: "100%" }}
      ></div>

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          padding: "20px",
          display: use(this.showLauncher).map((show) => {
            return show ? "block" : "none";
          }),
        }}
        class="window window-body"
        on:mousedown={(e: MouseEvent) => {
          e.stopPropagation();
        }}
      >
        <div style={{ "margin-bottom": "10px", "font-weight": "bold" }}>
          Run Program
        </div>
        <input
          type="text"
          id="launcher-textbox"
          value={use(this.programInput)}
          autocomplete="off"
          on:input={(e: Event) => {
            this.programInput = (e.target as HTMLInputElement).value;
          }}
          on:keydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") {
              runProgram();
            } else if (e.key === "Escape") {
              this.showLauncher = false;
              this.programInput = "";
            }
          }}
          placeholder="Enter program name..."
          style={{
            width: "300px",
            "margin-bottom": "10px",
          }}
          ref={(el: HTMLInputElement) => {
            setTimeout(() => el?.focus(), 0);
          }}
        />
        <div
          style={{
            display: "flex",
            gap: "10px",
            "justify-content": "flex-end",
          }}
        >
          <button
            on:mousedown={(e: MouseEvent) => {
              e.stopPropagation();
              runProgram();
            }}
            style={{
              padding: "5px 15px",
              cursor: "pointer",
            }}
            class="normal"
          >
            Run
          </button>
          <button
            on:mousedown={(e: MouseEvent) => {
              e.stopPropagation();
              this.showLauncher = false;
              this.programInput = "";
            }}
            style={{
              padding: "5px 15px",
              cursor: "pointer",
            }}
            class="normal"
          >
            Cancel
          </button>
        </div>
      </div>

      {use(state.window_frames).map((wins) => {
        return Object.values(wins);
      })}
    </div>
  );
};
App.style = css``;

document.querySelector("#app")?.replaceWith(<App />);

document.oncontextmenu = document.body.oncontextmenu = function () {
  return false;
};
