import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, GaugeChart, ScatterChart, FunnelChart } from "echarts/charts";
import {
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import guoxueTheme, { techScreenTheme } from "./echarts-theme";

echarts.use([
  BarChart, LineChart, PieChart, GaugeChart, ScatterChart, FunnelChart,
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent,
  CanvasRenderer,
]);

echarts.registerTheme("guoxue", guoxueTheme);
echarts.registerTheme("tech-screen", techScreenTheme);

export default echarts;
export { echarts };
