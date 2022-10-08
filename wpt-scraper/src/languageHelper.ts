export type CourtPosition = "drive" | "revés";
export default {
  court: {
    position: {
      drive: "right",
      revés: "left",
    },
  },
} as const;
