import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FONT_LAYERS, VERTICAL_CSS, generateFontFaceCSS } from "./classic-font.config";

@ApiTags("经典-字体")
@Controller("classic")
export class ClassicFontController {
  @Get("fonts/config")
  @ApiOperation({ summary: "获取古籍字体配置（字体分层回退链）" })
  getFontConfig() {
    return {
      layers: FONT_LAYERS.map((l) => ({
        name: l.name,
        description: l.description,
        priority: l.priority,
        coverage: l.coverage,
        family: l.faces[0]?.family,
      })),
      fallbackChain: FONT_LAYERS.map((l) => l.faces[0]?.family).filter(Boolean),
    };
  }

  @Get("fonts/font-face.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  @ApiOperation({ summary: "获取 @font-face CSS（含 unicode-range 分层加载）" })
  getFontFaceCSS() {
    return generateFontFaceCSS();
  }

  @Get("fonts/vertical.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  @ApiOperation({ summary: "获取竖排排版基础 CSS" })
  getVerticalCSS() {
    return VERTICAL_CSS;
  }
}
