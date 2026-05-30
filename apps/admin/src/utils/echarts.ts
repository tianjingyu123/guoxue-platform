import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, GaugeChart, ScatterChart } from "echarts/charts";
import {
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import guoxueTheme from "./echarts-theme";

echarts.use([
  BarChart, LineChart, PieChart, GaugeChart, ScatterChart,
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, ToolboxComponent,
  CanvasRenderer,
]);

echarts.registerTheme("guoxue", guoxueTheme);

export default echarts;
export { echarts };
