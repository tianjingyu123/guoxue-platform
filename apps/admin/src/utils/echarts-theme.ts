const guoxueTheme = {
  color: [
    "#C41E3A", "#D4A574", "#8B4513", "#2D5016", "#1A1A2E",
    "#E87461", "#B8860B", "#556B2F", "#4A6B8A", "#8B5E3C",
  ],
  backgroundColor: "transparent",
  textStyle: { fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
  title: {
    textStyle: { color: "#333", fontSize: 16, fontWeight: 600 },
    subtextStyle: { color: "#999", fontSize: 12 },
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
    itemStyle: { borderColor: "#fff", borderWidth: 2 },
  },
  gauge: {
    axisLine: { lineStyle: { color: [[0.3, "#2D5016"], [0.7, "#D4A574"], [1, "#C41E3A"]] } },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#ccc" } },
    axisTick: { show: false },
    axisLabel: { color: "#666" },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#999" },
    splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
  },
  legend: {
    textStyle: { color: "#666" },
    pageTextStyle: { color: "#333" },
  },
  tooltip: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#eee",
    borderWidth: 1,
    textStyle: { color: "#333" },
    extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08);",
  },
};

export default guoxueTheme;
