'use client'

import { useState, useEffect, useRef } from 'react'
import GoalInput from '@/components/GoalInput'
import SessionHistory from '@/components/SessionHistory'

interface Step {
  step_number: number
  agent: string
  task: string
  output: string
  supervisor_verdict: string
  supervisor_score: number
}

interface ExecutionResult {
  session_id: string
  status: string
  steps: Step[]
  final_output: {
    summary: string
    steps_completed: number
  }
}

interface HistoryEntry {
  id: string
  goal: string
  timestamp: string
  stepsCompleted: number
  result: ExecutionResult
}

const AGENT_LABELS: Record<string, string> = {
  web_search: 'Web Search',
  code_execution: 'Code Execution',
  file_generation: 'File Generation',
  summarization: 'Summarization',
}

const VERDICT_COLORS: Record<string, string> = {
  approved: 'text-green-600 bg-green-50',
  retry: 'text-yellow-600 bg-yellow-50',
  escalate: 'text-red-500 bg-red-50',
  unknown: 'text-gray-500 bg-gray-50',
}

function FinalOutput({ summary, goal }: { summary: string; goal: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([`Goal: ${goal}\n\n${summary}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agent-output.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Final Output
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <p className="text-gray-800 text-sm whitespace-pre-wrap">{summary}</p>
    </div>
  )
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [liveSteps, setLiveSteps] = useState<Step[]>([])
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [error, setError] = useState('')
  const [currentGoal, setCurrentGoal] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    const ws = new WebSocket(`${wsUrl}/ws/execute/${sessionId}`)
    wsRef.current = ws
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'step_update' && msg.step) {
          setLiveSteps((prev) => [...prev, msg.step])
        }
      } catch {}
    }
    ws.onerror = (e) => console.error('WebSocket error', e)
    return () => { ws.close() }
  }, [sessionId])

  const handleSubmit = async (goal: string) => {
    setIsLoading(true)
    setResult(null)
    setError('')
    setLiveSteps([])
    setCurrentGoal(goal)
    setActiveHistoryId('')

    const newSessionId = crypto.randomUUID()
    setSessionId(newSessionId)
    await new Promise((r) => setTimeout(r, 300))

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data: ExecutionResult = await response.json()
      setResult(data)

      // Save to history
      const entry: HistoryEntry = {
        id: newSessionId,
        goal,
        timestamp: new Date().toLocaleTimeString(),
        stepsCompleted: data.steps?.length ?? 0,
        result: data,
      }
      setHistory((prev) => [entry, ...prev])
      setActiveHistoryId(newSessionId)
    } catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'Something went wrong.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      wsRef.current?.close()
    }
  }

  const handleHistorySelect = (id: string) => {
    const entry = history.find((h) => h.id === id)
    if (!entry) return
    setActiveHistoryId(id)
    setCurrentGoal(entry.goal)
    setResult(entry.result)
    setLiveSteps([])
    setError('')
  }

  const handleClearHistory = () => {
    setHistory([])
    setActiveHistoryId('')
  }

  const displaySteps = result?.steps ?? liveSteps

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <SessionHistory
        history={history}
        activeId={activeHistoryId}
        onSelect={handleHistorySelect}
        onClear={handleClearHistory}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">D</span>
              </div>
              <span className="font-semibold text-gray-800">Datawebify Agent</span>
            </div>
            <span className="text-xs text-gray-400">Autonomous AI Platform</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Hero */}
            {!result && !isLoading && liveSteps.length === 0 && (
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  What do you want to accomplish?
                </h1>
                <p className="text-gray-500 text-base max-w-xl mx-auto">
                  Describe any goal in plain language. The agent will plan, search, compute, and deliver results automatically.
                </p>
              </div>
            )}

            <GoalInput onSubmit={handleSubmit} isLoading={isLoading} />

            {isLoading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 text-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">
                    Executing: <span className="font-medium text-gray-800">{currentGoal}</span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {(displaySteps.length > 0 || result) && (
              <div className="mt-10 space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-500 font-medium mb-1">GOAL</p>
                  <p className="text-gray-800 text-sm">{currentGoal}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    Execution Steps ({displaySteps.length}){isLoading && ' — running...'}
                  </p>
                  <div className="space-y-3">
                    {displaySteps.map((step) => (
                      <div
                        key={step.step_number}
                        className="bg-white border border-gray-200 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">
                              STEP {step.step_number}
                            </span>
                            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                              {AGENT_LABELS[step.agent] ?? step.agent}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              VERDICT_COLORS[step.supervisor_verdict] ?? VERDICT_COLORS.unknown
                            }`}
                          >
                            {step.supervisor_verdict} ({step.supervisor_score.toFixed(2)})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{step.task}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                          {step.output}
                        </p>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-white border border-blue-100 rounded-xl">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs text-blue-500">Agent working...</span>
                      </div>
                    )}
                  </div>
                </div>

                {result?.final_output?.summary && (
                  <FinalOutput
                    summary={result.final_output.summary}
                    goal={currentGoal}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}