"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Mic, X, Search, Loader2, Volume2 } from "lucide-react"

type RecordingState = 'idle' | 'recording' | 'processing' | 'result'

export default function VoiceSearchPage() {
  const router = useRouter()
  const [state, setState] = useState<RecordingState>('idle')
  const [transcribedText, setTranscribedText] = useState('')
  const [editedText, setEditedText] = useState('')
  const [error, setError] = useState('')
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0.2))
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode | null>(null)

  // 模拟波形动画
  useEffect(() => {
    if (state === 'recording') {
      const animate = () => {
        setWaveformBars(prev => 
          prev.map(() => 0.2 + Math.random() * 0.8)
        )
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      const interval = setInterval(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        animate()
      }, 100)
      return () => {
        clearInterval(interval)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    } else {
      setWaveformBars(Array(20).fill(0.2))
    }
  }, [state])

  const startRecording = useCallback(async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 设置音频分析器
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        setState('processing')
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // 模拟ASR转文字
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 模拟识别结果
        const mockResults = [
          '易经入门课程',
          '八字排盘教程',
          '风水布局知识',
          '梅花易数学习',
          '六爻预测方法'
        ]
        const result = mockResults[Math.floor(Math.random() * mockResults.length)]
        
        setTranscribedText(result)
        setEditedText(result)
        setState('result')
      }

      mediaRecorder.start()
      setState('recording')
    } catch (err) {
      console.error('录音失败:', err)
      setError('无法访问麦克风，请检查权限设置')
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [state])

  const handleSearch = () => {
    if (editedText.trim()) {
      router.push(`/search/result?keyword=${encodeURIComponent(editedText.trim())}`)
    }
  }

  const handleReset = () => {
    setState('idle')
    setTranscribedText('')
    setEditedText('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <span className="text-white/60 text-sm">语音搜索</span>
        <div className="w-10" />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 状态文字 */}
        <div className="h-20 flex items-center justify-center">
          {state === 'idle' && (
            <p className="text-white/80 text-lg">点击麦克风开始说话</p>
          )}
          {state === 'recording' && (
            <p className="text-white text-lg animate-pulse">正在聆听...</p>
          )}
          {state === 'processing' && (
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>识别中...</span>
            </div>
          )}
          {state === 'result' && (
            <p className="text-white/80 text-lg">识别完成</p>
          )}
        </div>

        {/* 波形动画 */}
        <div className="h-24 flex items-center justify-center gap-1 mb-8">
          {waveformBars.map((height, index) => (
            <div
              key={index}
              className="w-1.5 rounded-full transition-all duration-100"
              style={{
                height: `${height * 80}px`,
                backgroundColor: state === 'recording' 
                  ? `rgba(196, 30, 58, ${0.5 + height * 0.5})`
                  : 'rgba(255, 255, 255, 0.2)',
              }}
            />
          ))}
        </div>

        {/* 麦克风按钮 */}
        {(state === 'idle' || state === 'recording') && (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              state === 'recording'
                ? 'bg-[#C41E3A] scale-110 shadow-lg shadow-[#C41E3A]/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Mic className={`w-10 h-10 ${state === 'recording' ? 'text-white' : 'text-white/80'}`} />
          </button>
        )}

        {/* 处理中动画 */}
        {state === 'processing' && (
          <div className="w-24 h-24 rounded-full bg-[#C41E3A]/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#C41E3A]/40 flex items-center justify-center animate-pulse">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
          </div>
        )}

        {/* 识别结果 */}
        {state === 'result' && (
          <div className="w-full max-w-sm space-y-6">
            {/* 原始识别文字 */}
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs mb-2">识别结果</p>
              <p className="text-white text-lg">{transcribedText}</p>
            </div>

            {/* 可编辑输入框 */}
            <div className="relative">
              <input
                type="text"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#C41E3A]"
                placeholder="编辑搜索内容..."
              />
              {editedText && (
                <button
                  onClick={() => setEditedText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              >
                重新录音
              </button>
              <button
                onClick={handleSearch}
                disabled={!editedText.trim()}
                className="flex-1 py-3 rounded-xl bg-[#C41E3A] text-white flex items-center justify-center gap-2 hover:bg-[#a01830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                搜索
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 提示文字 */}
        {state === 'idle' && (
          <p className="mt-8 text-white/40 text-sm text-center">
            长按或点击麦克风开始录音<br />
            松开后自动识别
          </p>
        )}
      </div>

      {/* 底部热门搜索 */}
      {state === 'idle' && (
        <div className="px-6 pb-8">
          <p className="text-white/50 text-sm mb-3">试试说：</p>
          <div className="flex flex-wrap gap-2">
            {['易经入门', '八字排盘', '风水布局', '梅花易数'].map((word, index) => (
              <button
                key={index}
                onClick={() => {
                  setEditedText(word)
                  setTranscribedText(word)
                  setState('result')
                }}
                className="px-3 py-1.5 bg-white/10 rounded-full text-white/70 text-sm hover:bg-white/20 transition-colors"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
