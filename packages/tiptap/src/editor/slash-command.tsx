import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import { Extension, type Editor } from "@tiptap/core";
import { type EditorState, PluginKey } from "@tiptap/pm/state";
import { type SuggestionOptions, Suggestion } from "@tiptap/suggestion";
import {
  ActivityIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MinusIcon,
  QuoteIcon,
  TargetIcon,
  TypeIcon,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ReactRenderer } from "@tiptap/react";

interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor, range: { from: number; to: number }) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "text",
    label: "Text",
    description: "Plain paragraph",
    icon: <TypeIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <Heading1Icon className="size-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 1 })
        .run();
    },
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2Icon className="size-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 2 })
        .run();
    },
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <Heading3Icon className="size-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 3 })
        .run();
    },
  },
  {
    id: "bullet",
    label: "Bullet List",
    description: "Unordered list",
    icon: <ListIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "ordered",
    label: "Numbered List",
    description: "Ordered list",
    icon: <ListOrderedIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "task",
    label: "Task List",
    description: "Checklist with checkboxes",
    icon: <ListTodoIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Capture a quote",
    icon: <QuoteIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    id: "code",
    label: "Code Block",
    description: "Display code snippet",
    icon: <CodeIcon className="size-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: <MinusIcon className="size-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
  {
    id: "create-goal",
    label: "Create Goal",
    description: "Set up a new productivity goal",
    icon: <TargetIcon className="size-4" />,
    command: (_editor, range) => {
      _editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("char:create-goal"));
    },
  },
  {
    id: "heatmap",
    label: "Heatmap",
    description: "Insert a goal heatmap widget",
    icon: <ActivityIcon className="size-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "heatmap", attrs: { goalId: null } })
        .run();
    },
  },
];

function filterItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  );
}

const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  {
    items: SlashItem[];
    command: (item: SlashItem) => void;
  }
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useEffect(() => {
    const el = containerRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.items.length === 0) return false;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + props.items.length) % props.items.length,
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const item = props.items[selectedIndex];
        if (item) props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="slash-command-list"
      style={{
        background: "white",
        border: "1px solid #e5e5e5",
        borderRadius: 10,
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.10), 0 1.5px 4px rgba(0,0,0,0.06)",
        padding: "4px",
        minWidth: 240,
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      {props.items.map((item, i) => (
        <button
          key={item.id}
          data-index={i}
          onClick={() => props.command(item)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 10px",
            borderRadius: 7,
            border: "none",
            background: i === selectedIndex ? "#f5f5f5" : "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              color: "#888",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {item.icon}
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}
            >
              {item.label}
            </span>
            <span style={{ fontSize: 11, color: "#999" }}>
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});

export const slashCommandPluginKey = new PluginKey("slashCommand");

export function isSlashCommandActive(state: EditorState): boolean {
  const pluginState = slashCommandPluginKey.getState(state);
  return pluginState?.active === true;
}

const suggestionOptions = (): Omit<SuggestionOptions, "editor"> => {
  return {
    char: "/",
    pluginKey: slashCommandPluginKey,
    allowSpaces: false,
    startOfLine: false,
    command: ({ editor, range, props }) => {
      const item = props as SlashItem;
      item.command(editor as any, range);
    },
    items: ({ query }) => filterItems(query),
    render: () => {
      let renderer: ReactRenderer;
      let cleanup: (() => void) | undefined;
      let floatingEl: HTMLElement;
      let referenceEl: VirtualElement;

      const updatePosition = () => {
        void computePosition(referenceEl, floatingEl, {
          placement: "bottom-start",
          middleware: [offset(6), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          Object.assign(floatingEl.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      };

      return {
        onStart(props) {
          renderer = new ReactRenderer(SlashCommandList, {
            props: {
              items: props.items as SlashItem[],
              command: (item: SlashItem) => {
                props.command(item);
              },
            },
            editor: props.editor,
          });

          floatingEl = renderer.element as HTMLElement;
          Object.assign(floatingEl.style, {
            position: "absolute",
            top: "0",
            left: "0",
            zIndex: "9999",
          });
          document.body.appendChild(floatingEl);

          if (!props.clientRect) return;

          referenceEl = {
            getBoundingClientRect: () =>
              props.clientRect?.() ?? new DOMRect(),
          };

          cleanup = autoUpdate(referenceEl, floatingEl, updatePosition);
          updatePosition();
        },

        onUpdate(props) {
          renderer.updateProps({
            items: props.items as SlashItem[],
            command: (item: SlashItem) => {
              props.command(item);
            },
          });
          if (props.clientRect) {
            referenceEl.getBoundingClientRect = () =>
              props.clientRect?.() ?? new DOMRect();
          }
          updatePosition();
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            cleanup?.();
            floatingEl.remove();
            return true;
          }
          // @ts-ignore
          return renderer.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          cleanup?.();
          floatingEl.remove();
          renderer.destroy();
        },
      };
    },
  };
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestionOptions(),
      }),
    ];
  },
});
