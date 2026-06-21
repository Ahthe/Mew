import { Extension } from "@tiptap/core";

export const GoalHeadingAttrs = Extension.create({
  name: "goalHeadingAttrs",

  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          goalId: {
            default: null,
            renderHTML: (attrs) => {
              if (!attrs.goalId) return {};
              return { "data-goal-id": attrs.goalId };
            },
            parseHTML: (element) =>
              element.getAttribute("data-goal-id") ?? null,
          },
          goalColor: {
            default: null,
            renderHTML: (attrs) => {
              if (!attrs.goalColor) return {};
              return {
                "data-goal-color": attrs.goalColor,
                style: `--goal-color: ${attrs.goalColor};`,
              };
            },
            parseHTML: (element) =>
              element.getAttribute("data-goal-color") ?? null,
          },
        },
      },
    ];
  },
});
