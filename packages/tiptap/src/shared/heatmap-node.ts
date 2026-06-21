import { mergeAttributes, Node } from "@tiptap/core";

export const HeatmapNode = Node.create({
  name: "heatmap",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      goalId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-goal-id") ?? null,
        renderHTML: (attributes) => {
          if (!attributes.goalId) return {};
          return { "data-goal-id": attributes.goalId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="heatmap"]',
        getAttrs: (dom) => ({
          goalId: (dom as HTMLElement).getAttribute("data-goal-id"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "heatmap" }),
    ];
  },
});
