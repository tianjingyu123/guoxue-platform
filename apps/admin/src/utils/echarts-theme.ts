const guoxueTheme = {
  color: [
    "#315F88", "#B8893F", "#168A62", "#B4233E", "#765A8D",
    "#4D8396", "#C87954", "#6C7D4F", "#6C86A3", "#9A6F50",
  ],
  backgroundColor: "transparent",
  textStyle: { fontFamily: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  title: {
    textStyle: { color: "#17202E", fontSize: 15, fontWeight: 600 },
    subtextStyle: { color: "#7A8493", fontSize: 12 },
  },
  line: {
    itemStyle: { borderWidth: 2 },
    lineStyle: { width: 2.5 },
    symbolSize: 6,
    symbol: "circle",
    smooth: true,
  },
  bar: {
    itemStyle: { barBorderRadius: [3, 3, 0, 0] },
  },
  pie: {
    itemStyle: { borderColor: "#fff", borderWidth: 3 },
  },
  gauge: {
    axisLine: { lineStyle: { color: [[0.3, "#2D5016"], [0.7, "#D4A574"], [1, "#C41E3A"]] } },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#E3E7ED" } },
    axisTick: { show: false },
    axisLabel: { color: "#667085" },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#7A8493" },
    splitLine: { lineStyle: { color: "#EDF0F4" } },
  },
  legend: {
    textStyle: { color: "#667085" },
    pageTextStyle: { color: "#475467" },
  },
  tooltip: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E3E7ED",
    borderWidth: 1,
    textStyle: { color: "#17202E" },
    extraCssText: "box-shadow:0 14px 34px rgba(14,31,50,.13);border-radius:10px;",
  },
};

export default guoxueTheme;

/** 对外数字大屏专用主题：强调暗场可读性，避免每个大屏重复配置坐标轴与提示框。 */
export const techScreenTheme = {
  color: ["#55D6FF", "#56E0B1", "#E4BD72", "#C9A5FF", "#FF8A72", "#74B9FF"],
  backgroundColor: "transparent",
  textStyle: {
    color: "#9DB4C9",
    fontFamily: "'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  title: { textStyle: { color: "#DCE9F7", fontSize: 15, fontWeight: 600 } },
  line: {
    itemStyle: { borderWidth: 2 },
    lineStyle: { width: 2.5 },
    symbol: "circle",
    symbolSize: 6,
    smooth: true,
  },
  bar: { itemStyle: { barBorderRadius: [5, 5, 0, 0] } },
  pie: { itemStyle: { borderColor: "#0B1B2A", borderWidth: 3 } },
  categoryAxis: {
    axisLine: { lineStyle: { color: "rgba(126,169,204,.18)" } },
    axisTick: { show: false },
    axisLabel: { color: "#7891A8" },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#6F879D" },
    splitLine: { lineStyle: { color: "rgba(126,169,204,.08)" } },
  },
  legend: { textStyle: { color: "#879DB1" }, pageTextStyle: { color: "#AFC2D4" } },
  tooltip: {
    backgroundColor: "rgba(8,24,38,.94)",
    borderColor: "rgba(85,214,255,.24)",
    borderWidth: 1,
    textStyle: { color: "#E6F1FA" },
    extraCssText: "box-shadow:0 16px 38px rgba(0,0,0,.3);backdrop-filter:blur(12px);border-radius:10px;",
  },
};
