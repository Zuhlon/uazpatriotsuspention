'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Calculator, 
  Car, 
  Ruler, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ArrowUpRight,
  Gauge,
  Scale,
  History,
  Trash2,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Штатные параметры амортизаторов УАЗ Патриот 2008
const STOCK_SPECS = {
  front: {
    compressed: 326,
    extended: 536,
    travel: 210,
    strokeDiameter: 15,
    bodyDiameter: 51,
    compressionForce: 550,
    reboundForce: 2000,
    mountTop: 'ear',
    mountBottom: 'ear',
  },
  rear: {
    compressed: 354,
    extended: 560,
    travel: 206,
    strokeDiameter: 15,
    bodyDiameter: 51,
    compressionForce: 800,
    reboundForce: 2100,
    mountTop: 'ear',
    mountBottom: 'ear',
  }
}

// Параметры для разных вариантов лифта
const LIFT_OPTIONS: Record<number, { front: { compressed: number; extended: number }; rear: { compressed: number; extended: number }; label: string }> = {
  0: { front: { compressed: 326, extended: 536 }, rear: { compressed: 354, extended: 560 }, label: 'Сток (0 мм)' },
  30: { front: { compressed: 300, extended: 500 }, rear: { compressed: 374, extended: 603 }, label: 'Лифт +30 мм' },
  50: { front: { compressed: 320, extended: 550 }, rear: { compressed: 374, extended: 603 }, label: 'Лифт +50 мм' },
  75: { front: { compressed: 340, extended: 580 }, rear: { compressed: 400, extended: 650 }, label: 'Лифт +75 мм' },
  100: { front: { compressed: 360, extended: 620 }, rear: { compressed: 420, extended: 690 }, label: 'Лифт +100 мм' },
}

// Рекомендуемые бренды амортизаторов
const BRANDS = [
  { name: 'РИФ', quality: 'high', price: 'medium', offroad: true, recommended: ['+30', '+50', '+75', '+100'] },
  { name: 'Tough Dog', quality: 'high', price: 'high', offroad: true, recommended: ['+50', '+75', '+100'] },
  { name: 'Old Man Emu', quality: 'high', price: 'high', offroad: true, recommended: ['+30', '+50', '+75'] },
  { name: 'IronMan 4x4', quality: 'high', price: 'medium', offroad: true, recommended: ['+30', '+50', '+75', '+100'] },
  { name: 'redBTR', quality: 'medium', price: 'low', offroad: true, recommended: ['+30', '+50'] },
  { name: 'Шток Авто', quality: 'medium', price: 'low', offroad: false, recommended: ['0', '+30'] },
  { name: 'Плаза', quality: 'medium', price: 'low', offroad: false, recommended: ['0', '+30'] },
  { name: 'SAZ', quality: 'low', price: 'low', offroad: false, recommended: ['0'] },
]

interface CalculationResult {
  position: 'front' | 'rear'
  stockCompressed: number
  stockExtended: number
  stockTravel: number
  newCompressed: number
  newExtended: number
  newTravel: number
  compressionReserve: number
  reboundReserve: number
  lift: number
  warnings: string[]
  recommendations: string[]
  compatibility: 'optimal' | 'acceptable' | 'critical'
}

interface SavedCalculation {
  id: string
  position: string
  liftHeight: number
  stockCompressed: number
  stockExtended: number
  stockTravel: number
  newCompressed: number
  newExtended: number
  newTravel: number
  compatibility: string
  createdAt: string
}

export default function ShockAbsorberCalculator() {
  const [position, setPosition] = useState<'front' | 'rear'>('front')
  const [liftHeight, setLiftHeight] = useState(0)
  const [customCompressed, setCustomCompressed] = useState<number | null>(null)
  const [customExtended, setCustomExtended] = useState<number | null>(null)
  const [customTravel, setCustomTravel] = useState<number | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [history, setHistory] = useState<SavedCalculation[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Загрузка истории
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calculations')
      const data = await response.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const calculate = useCallback(() => {
    const stock = STOCK_SPECS[position]
    const lift = liftHeight
    
    let newCompressed: number
    let newExtended: number
    let newTravel: number
    
    if (useCustom && customCompressed && customExtended) {
      newCompressed = customCompressed
      newExtended = customExtended
      newTravel = customTravel || (newExtended - newCompressed)
    } else {
      // Используем предустановленные значения для стандартных лифтов
      if (LIFT_OPTIONS[lift]) {
        const option = LIFT_OPTIONS[lift][position]
        newCompressed = option.compressed
        newExtended = option.extended
      } else {
        // Расчет для нестандартного лифта
        newExtended = stock.extended + lift
        newCompressed = stock.compressed + Math.floor(lift * 0.3)
      }
      newTravel = newExtended - newCompressed
    }
    
    const compressionReserve = newCompressed - stock.compressed
    const reboundReserve = newExtended - stock.extended
    
    const warnings: string[] = []
    const recommendations: string[] = []
    let compatibility: 'optimal' | 'acceptable' | 'critical' = 'optimal'
    
    if (newTravel < 150) {
      warnings.push('Ход амортизатора слишком мал - это приведёт к жёсткой работе подвески')
      compatibility = 'critical'
    } else if (newTravel < 180) {
      warnings.push('Ход амортизатора меньше штатного - возможно ухудшение проходимости')
      compatibility = 'acceptable'
    }
    
    if (newCompressed < stock.compressed - 20) {
      warnings.push('Длина в сжатом состоянии меньше штатной - риск удара амортизатора об отбойник')
      compatibility = 'critical'
    } else if (newCompressed < stock.compressed) {
      warnings.push('Длина в сжатом состоянии меньше штатной - требуется проверка установки')
      if (compatibility === 'optimal') compatibility = 'acceptable'
    }
    
    if (newExtended > stock.extended + 100) {
      warnings.push('Большое увеличение длины - проверьте крепления и ход подвески')
      if (compatibility === 'optimal') compatibility = 'acceptable'
    }
    
    if (lift > 0) {
      if (lift <= 30) {
        recommendations.push('Для лифта до 30 мм можно использовать штатные амортизаторы с проставками')
      } else if (lift <= 50) {
        recommendations.push('Рекомендуются амортизаторы с увеличенным ходом для лифта +50 мм')
        recommendations.push('Рассмотрите газомасляные амортизаторы для лучшей устойчивости')
      } else if (lift <= 75) {
        recommendations.push('Обязательны амортизаторы для лифта +75-100 мм')
        recommendations.push('Рекомендуется усиление креплений')
      } else {
        recommendations.push('Требуются специальные удлинённые амортизаторы')
        recommendations.push('Необходимо усиление кронштейнов крепления')
        recommendations.push('Рассмотрите перенос креплений')
      }
    }
    
    if (lift > 50) {
      recommendations.push('Для бездорожья рекомендуются двухтрубные газомасляные амортизаторы')
    }
    
    const calculationResult: CalculationResult = {
      position,
      stockCompressed: stock.compressed,
      stockExtended: stock.extended,
      stockTravel: stock.travel,
      newCompressed,
      newExtended,
      newTravel,
      compressionReserve,
      reboundReserve,
      lift,
      warnings,
      recommendations,
      compatibility
    }
    
    setResult(calculationResult)
  }, [position, liftHeight, useCustom, customCompressed, customExtended, customTravel])

  const saveCalculation = async () => {
    if (!result) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: result.position,
          liftHeight: result.lift,
          stockCompressed: result.stockCompressed,
          stockExtended: result.stockExtended,
          stockTravel: result.stockTravel,
          newCompressed: result.newCompressed,
          newExtended: result.newExtended,
          newTravel: result.newTravel,
          compatibility: result.compatibility,
        }),
      })
      
      const data = await response.json()
      if (data.success) {
        loadHistory()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteCalculation = async (id: string) => {
    try {
      await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' })
      loadHistory()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRecommendedBrands = () => {
    if (!result) return BRANDS.slice(0, 4)
    const liftKey = result.lift > 0 ? `+${result.lift}` : '0'
    return BRANDS.filter(b => b.recommended.includes(liftKey) || 
      b.recommended.some(r => parseInt(r.replace('+', '')) >= result.lift))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Калькулятор амортизаторов
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                УАЗ Патриот 2008
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel - Input */}
          <div className="lg:col-span-1 space-y-4">
            {/* Position Selection */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  Позиция амортизатора
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={position} onValueChange={(v) => setPosition(v as 'front' | 'rear')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="front">Передний</TabsTrigger>
                    <TabsTrigger value="rear">Задний</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Lift Height */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowUpRight className="h-4 w-4 text-orange-500" />
                  Лифт подвески
                </CardTitle>
                <CardDescription>
                  Высота подъёма подвески в миллиметрах
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Высота лифта</span>
                    <Badge variant="secondary" className="font-mono">{liftHeight} мм</Badge>
                  </div>
                  <Slider
                    value={[liftHeight]}
                    onValueChange={([v]) => setLiftHeight(v)}
                    max={150}
                    step={5}
                    disabled={useCustom}
                    className="py-2"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-1">
                  {[0, 30, 50, 75, 100].map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={liftHeight === l && !useCustom ? 'default' : 'outline'}
                      onClick={() => { setLiftHeight(l); setUseCustom(false); }}
                      disabled={useCustom}
                      className="text-xs px-2 h-8"
                    >
                      {l > 0 ? `+${l}` : '0'}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Parameters */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ruler className="h-4 w-4 text-orange-500" />
                  Ручной ввод размеров
                </CardTitle>
                <CardDescription>
                  Введите размеры имеющегося амортизатора
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-toggle" className="text-sm">Использовать ручной ввод</Label>
                  <Button
                    id="custom-toggle"
                    size="sm"
                    variant={useCustom ? 'default' : 'outline'}
                    onClick={() => setUseCustom(!useCustom)}
                    className="h-7 text-xs"
                  >
                    {useCustom ? 'Вкл' : 'Выкл'}
                  </Button>
                </div>
                
                {useCustom && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <Label htmlFor="compressed" className="text-xs">Длина сжатый (мм)</Label>
                      <Input
                        id="compressed"
                        type="number"
                        value={customCompressed || ''}
                        onChange={(e) => setCustomCompressed(parseInt(e.target.value) || null)}
                        placeholder="326"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="extended" className="text-xs">Длина разжатый (мм)</Label>
                      <Input
                        id="extended"
                        type="number"
                        value={customExtended || ''}
                        onChange={(e) => setCustomExtended(parseInt(e.target.value) || null)}
                        placeholder="536"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="travel" className="text-xs">Ход штока (мм) - опционально</Label>
                      <Input
                        id="travel"
                        type="number"
                        value={customTravel || ''}
                        onChange={(e) => setCustomTravel(parseInt(e.target.value) || null)}
                        placeholder="Авто: разница длин"
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calculate Button */}
            <Button 
              onClick={calculate} 
              className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
              size="lg"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Рассчитать параметры
            </Button>

            {/* History */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card className="shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-orange-500" />
                        История расчётов
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{history.length}</Badge>
                        {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex justify-end mb-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={loadHistory}
                        disabled={loading}
                        className="h-7 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      {history.length === 0 ? (
                        <div className="text-center text-sm text-slate-500 py-4">
                          История пуста
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {history.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {item.position === 'front' ? 'П' : 'З'}
                                </Badge>
                                <span className="font-mono">
                                  {item.newCompressed}/{item.newExtended}
                                </span>
                                {item.liftHeight > 0 && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    +{item.liftHeight}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{formatDate(item.createdAt)}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => deleteCalculation(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stock Specs Info */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4 text-orange-400" />
                  Штатные характеристики {position === 'front' ? 'передних' : 'задних'} амортизаторов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-2xl font-bold text-orange-400">{STOCK_SPECS[position].compressed}</div>
                    <div className="text-xs text-slate-400">Сжатый (мм)</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-2xl font-bold text-orange-400">{STOCK_SPECS[position].extended}</div>
                    <div className="text-xs text-slate-400">Разжатый (мм)</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-2xl font-bold text-orange-400">{STOCK_SPECS[position].travel}</div>
                    <div className="text-xs text-slate-400">Ход (мм)</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-2xl font-bold text-orange-400">{STOCK_SPECS[position].strokeDiameter}/{STOCK_SPECS[position].bodyDiameter}</div>
                    <div className="text-xs text-slate-400">Шток/Корпус</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {result && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gauge className="h-4 w-4 text-orange-500" />
                      Результаты расчёта
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={result.compatibility === 'optimal' ? 'default' : 
                                result.compatibility === 'acceptable' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {result.compatibility === 'optimal' ? '✓ Оптимально' : 
                         result.compatibility === 'acceptable' ? '⚠ Допустимо' : '✗ Критично'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={saveCalculation}
                        disabled={saving}
                        className="h-7 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Сохранить
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 dark:bg-slate-800">
                          <th className="text-left py-2 px-3 font-medium text-slate-500 rounded-tl-lg">Параметр</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-500">Штатный</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-500">Новый</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-500 rounded-tr-lg">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">Длина сжатый</td>
                          <td className="text-right py-2 px-3 font-mono">{result.stockCompressed} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.newCompressed} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={result.compressionReserve >= 0 ? 'default' : 'destructive'} className="text-xs font-mono">
                              {result.compressionReserve >= 0 ? '+' : ''}{result.compressionReserve}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">Длина разжатый</td>
                          <td className="text-right py-2 px-3 font-mono">{result.stockExtended} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.newExtended} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              +{result.reboundReserve}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">Ход штока</td>
                          <td className="text-right py-2 px-3 font-mono">{result.stockTravel} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.newTravel} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={result.newTravel >= result.stockTravel ? 'default' : 'secondary'} className="text-xs font-mono">
                              {result.newTravel - result.stockTravel >= 0 ? '+' : ''}{result.newTravel - result.stockTravel}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Visual Comparison */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Визуальное сравнение
                    </div>
                    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs text-slate-500 shrink-0">Штатный</span>
                        <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded relative overflow-hidden">
                          <div 
                            className="absolute h-full bg-slate-400 dark:bg-slate-500 rounded flex items-center justify-center text-[10px] text-white font-medium"
                            style={{ 
                              left: `${Math.max(0, ((result.stockCompressed - 280) / 450) * 100)}%`,
                              width: `${Math.min(100, (result.stockTravel / 300) * 100)}%`,
                              minWidth: '60px'
                            }}
                          >
                            {result.stockExtended - result.stockCompressed} мм
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs text-slate-500 shrink-0">Новый</span>
                        <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded relative overflow-hidden">
                          <div 
                            className="absolute h-full bg-orange-500 rounded flex items-center justify-center text-[10px] text-white font-medium shadow-sm"
                            style={{ 
                              left: `${Math.max(0, ((result.newCompressed - 280) / 450) * 100)}%`,
                              width: `${Math.min(100, (result.newTravel / 300) * 100)}%`,
                              minWidth: '60px'
                            }}
                          >
                            {result.newTravel} мм
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-16">
                        <span>280 мм</span>
                        <span>450 мм</span>
                        <span>700 мм</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Предупреждения</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {result.warnings.map((w, i) => (
                            <li key={i} className="text-sm">{w}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 animate-in slide-in-from-top-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-700 dark:text-green-400">Рекомендации</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {result.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-green-700 dark:text-green-300">{r}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Brand Recommendations */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-4 w-4 text-orange-500" />
                  Рекомендуемые бренды
                </CardTitle>
                <CardDescription>
                  {result ? `Для лифта +${result.lift} мм` : 'Выберите параметры для рекомендаций'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {getRecommendedBrands().map((brand) => (
                    <div 
                      key={brand.name}
                      className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-sm">{brand.name}</div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {brand.offroad && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            Off-road
                          </Badge>
                        )}
                        {brand.quality === 'high' && (
                          <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                            Премиум
                          </Badge>
                        )}
                        {brand.price === 'low' && (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Бюджет
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Compare */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Быстрое сравнение по лифту</CardTitle>
                <CardDescription>Стандартные размеры для популярных значений лифта</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-800">
                        <th className="text-left py-2 px-3 font-medium text-slate-500 rounded-tl-lg">Лифт</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">Сжатый</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">Разжатый</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">Ход</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500 rounded-tr-lg">Выбор</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 30, 50, 75, 100].map((l) => {
                        const specs = LIFT_OPTIONS[l]
                        const posSpecs = specs[position]
                        const isSelected = result?.lift === l && !useCustom
                        return (
                          <tr 
                            key={l} 
                            className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                              ${isSelected ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                          >
                            <td className="py-2 px-3 font-medium">
                              {l > 0 ? `+${l} мм` : 'Сток'}
                              {isSelected && <Badge className="ml-2 text-xs">Выбрано</Badge>}
                            </td>
                            <td className="text-right py-2 px-3 font-mono">{posSpecs.compressed} мм</td>
                            <td className="text-right py-2 px-3 font-mono">{posSpecs.extended} мм</td>
                            <td className="text-right py-2 px-3 font-mono">{posSpecs.extended - posSpecs.compressed} мм</td>
                            <td className="text-right py-2 px-3">
                              <Button 
                                size="sm" 
                                variant={isSelected ? 'default' : 'ghost'}
                                onClick={() => {
                                  setLiftHeight(l)
                                  setUseCustom(false)
                                }}
                                className="h-7 text-xs"
                              >
                                {isSelected ? '✓' : 'Выбрать'}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-900 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-slate-500">
            Калькулятор амортизаторов УАЗ Патриот 2008 • Данные носят справочный характер
          </p>
        </div>
      </footer>
    </div>
  )
}
