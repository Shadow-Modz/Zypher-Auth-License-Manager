type TimestampTypes = "t" | "T" | "d" | "D" | "f" | "F" | "R";

const dateToTimestamp = (date?: Date, type: TimestampTypes = "R") => {
  if (!date) date = new Date();
  return `<t:${Math.floor(date.getTime() / 1000)}:${type}>`;
};

export default dateToTimestamp;
