export type OneToNine = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type ZeroToNine = "0" | OneToNine;

export type YearString = `${`19${ZeroToNine}${ZeroToNine}` | `2${0}${1 | 2 | 3}${ZeroToNine}`}`;

export type FebruaryDays = `${`0${OneToNine}` | `1${ZeroToNine}` | `2${ZeroToNine}`}`;

export type ShortMonths = "04" | "06" | "09" | "11";
export type ShortMonthDays = FebruaryDays | "30";

export type LongMonths = "01" | "03" | "05" | "07" | "08" | "10" | "12";
export type LongMonthDays = ShortMonthDays | "31";

export type MonthAndDaysString = `${
  | `${ShortMonths}-${ShortMonthDays}`
  | `${`02-${FebruaryDays}`}`
  | `${`${LongMonths}-${LongMonthDays}`}`}`;
