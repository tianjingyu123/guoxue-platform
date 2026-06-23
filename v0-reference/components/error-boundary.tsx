'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 客户端错误边界组件
 * 用于包裹可能出错的组件，防止整个页面崩溃
 * 
 * @example
 * <ErrorBoundary fallback={<MyFallback />}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[v0] ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 bg-danger/5 border border-danger/20 rounded-xl text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <h3 className="font-medium text-foreground mb-2">组件加载失败</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || '发生了意外错误'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 错误边界 Hook 版本（配合 Suspense 使用）
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
