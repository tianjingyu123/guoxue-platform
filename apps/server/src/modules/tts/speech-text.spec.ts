import { normalizeSpeechText } from "./speech-text"

describe("normalizeSpeechText", () => {
  it("移除会导致语音接口异常的不可见字符", () => {
    expect(normalizeSpeechText("甲\u200B乙\u0000丙")).toBe("甲 乙 丙")
  })

  it("将私用区字符保留为可朗读的缺字提示", () => {
    expect(normalizeSpeechText("甲\uE001\uE002乙")).toBe("甲〔缺字〕乙")
  })

  it("保留正常古籍标点和段落", () => {
    expect(normalizeSpeechText("学而时习之，不亦说乎？\n\n有朋自远方来。"))
      .toBe("学而时习之，不亦说乎？\n\n有朋自远方来。")
  })
})
