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
  Activity,
  Weight,
  Leaf
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Штатные параметры УАЗ Патриот 2008
const VEHICLE_SPECS = {
  curbWeight: 2125,          // Снаряжённая масса (кг)
  frontAxleWeight: 1150,     // Нагрузка на переднюю ось (кг)
  rearAxleWeight: 975,       // Нагрузка на заднюю ось (кг)
  grossWeight: 2650,         // Полная масса (кг)
  maxPayload: 525,           // Максимальная нагрузка (кг)
}

// Базовая жёсткость подвески (Н/м) - из расчётов共振ансных частот
const BASE_STIFFNESS = {
  front: 270515,   // Н/м - жёсткость передней подвески
  rear: 220000,    // Н/м - жёсткость задней подвески
}

// Штатные параметры амортизаторов УАЗ Патриот 2008
const STOCK_SPECS = {
  front: {
    compressed: 326,
    extended: 536,
    travel: 210,
    strokeDiameter: 15,      // мм - диаметр штока
    bodyDiameter: 51,        // мм - диаметр корпуса
    compressionForce: 550,    // Н - усилие сжатия
    reboundForce: 2000,       // Н - усилие отбоя
    maxVelocity: 0.6,        // м/с - максимальная скорость поршня
    mountTop: 'ear',
    mountBottom: 'ear',
  },
  rear: {
    compressed: 354,
    extended: 560,
    travel: 206,
    strokeDiameter: 15,
    bodyDiameter: 51,
    compressionForce: 800,    // Н
    reboundForce: 2100,       // Н
    maxVelocity: 0.6,        // м/с
    mountTop: 'ear',
    mountBottom: 'ear',
  }
}

// Параметры рессор для задней подвески
// Жёсткость = базовая × coefficient
// Включает: кол-во листов, тип (усиленные/мягкие), пробег
const LEAF_SPRING_OPTIONS = [
  { id: '2leaves', label: '2 листа', description: 'Мягкие, комфорт', coefficient: 0.75, stiffnessNm: 165000, leaves: 2, type: 'soft' },
  { id: '3leaves', label: '3 листа (штат)', description: 'Баланс комфорта и грузоподъёмности', coefficient: 1.0, stiffnessNm: 220000, leaves: 3, type: 'stock' },
  { id: '4leaves', label: '4 листа', description: 'Жёсткие, для грузов', coefficient: 1.2, stiffnessNm: 264000, leaves: 4, type: 'hard' },
  { id: 'reinforced', label: 'Усиленные', description: 'Экспедиционные, тяжёлые грузы', coefficient: 1.35, stiffnessNm: 297000, leaves: 5, type: 'reinforced' },
  { id: 'soft', label: 'Мягкие', description: 'Параболические, комфорт', coefficient: 0.70, stiffnessNm: 154000, leaves: 2, type: 'soft' },
  { id: 'worn', label: 'Пробег', description: 'Уставшие рессоры (100к+ км)', coefficient: 0.60, stiffnessNm: 132000, leaves: 3, type: 'worn' },
]

// Параметры пружин для передней подвески
const COIL_SPRING_OPTIONS = [
  { id: 'stock', label: 'Штатные', description: 'Стандартная жёсткость', coefficient: 1.0, stiffnessNm: 270515 },
  { id: 'soft', label: 'Мягкие', description: 'Комфорт, без нагрузки', coefficient: 0.85, stiffnessNm: 229938 },
  { id: 'medium', label: 'Усиленные', description: 'Небольшая нагрузка', coefficient: 1.15, stiffnessNm: 311092 },
  { id: 'hard', label: 'Жёсткие', description: 'Тяжёлый багажник, лебёдка', coefficient: 1.3, stiffnessNm: 351670 },
  { id: 'variable', label: 'Прогрессивные', description: 'Переменная жёсткость', coefficient: 1.1, stiffnessNm: 297567 },
]

// Режимы эксплуатации - влияют на скорость поршня и требуемое демпфирование
const USAGE_MODES = [
  { id: 'city', label: 'Город/Асфальт', description: 'Основно асфальт, грунт редко', velocityFactor: 0.5, dampingFactor: 0.9, reboundMultiplier: '0.9x' },
  { id: 'mixed', label: 'Смешанный', description: '50% асфальт, 50% бездорожье', velocityFactor: 0.7, dampingFactor: 1.0, reboundMultiplier: '1.0x' },
  { id: 'offroad', label: 'Бездорожье', description: 'Грунт, лес, поля', velocityFactor: 0.85, dampingFactor: 1.15, reboundMultiplier: '1.15x' },
  { id: 'extreme', label: 'Экстрим/Trophy', description: 'Серьёзное бездорожье', velocityFactor: 1.0, dampingFactor: 1.3, reboundMultiplier: '1.3x' },
]

// Диапазон коэффициента апериодичности (затухания) по научным данным
const DAMPING_RATIO_RANGE = {
  min: 0.15,
  recommended: 0.20,  // Оптимальное значение по статье
  max: 0.30,
}

// Параметры для разных вариантов лифта (на основе данных производителей РИФ, IronMan, Tough Dog)
// При лифте подвески:
// - длина разжатый увеличивается на величину лифта (амортизатор должен доставать)
// - длина сжатый увеличивается на 30-50% от лифта (для сохранения хода и исключения пробоя)
const LIFT_OPTIONS: Record<number, { front: { compressed: number; extended: number }; rear: { compressed: number; extended: number }; label: string }> = {
  0: { 
    front: { compressed: 326, extended: 536 }, 
    rear: { compressed: 354, extended: 560 }, 
    label: 'Сток (0 мм)' 
  },
  // Лифт +30: разжатый +30, сжатый +15 (50% от лифта для сохранения хода)
  30: { 
    front: { compressed: 341, extended: 566 }, 
    rear: { compressed: 369, extended: 590 }, 
    label: 'Лифт +30 мм' 
  },
  // Лифт +50: разжатый +50, сжатый +25
  50: { 
    front: { compressed: 351, extended: 586 }, 
    rear: { compressed: 379, extended: 610 }, 
    label: 'Лифт +50 мм' 
  },
  // Лифт +75: разжатый +75, сжатый +40
  75: { 
    front: { compressed: 366, extended: 611 }, 
    rear: { compressed: 394, extended: 635 }, 
    label: 'Лифт +75 мм' 
  },
  // Лифт +100: разжатый +100, сжатый +50
  100: { 
    front: { compressed: 376, extended: 636 }, 
    rear: { compressed: 404, extended: 660 }, 
    label: 'Лифт +100 мм' 
  },
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
  // Поля для детального анализа
  compressionTravel: number      // ход сжатия от нейтрального положения
  reboundTravel: number          // ход отбоя от нейтрального положения
  stockNeutralPosition: number   // штатное нейтральное положение
  newNeutralPosition: number     // новое нейтральное положение
  // Физические параметры (по научной методике)
  dampingRatio: number           // коэффициент апериодичности ψ (0.15-0.30)
  stiffness: number              // жёсткость подвески C (Н/м)
  massPerWheel: number           // масса на одно колесо (кг)
  dampingCoefficient: number     // общий коэфф. сопротивления K = 2ψ√(MC) (Н·с/м)
  naturalFrequency: number       // собственная частота (Гц)
  // Расчётные усилия амортизатора
  stockCompressionForce: number
  stockReboundForce: number
  recommendedCompressionForce: number
  recommendedReboundForce: number
  reboundRatio: number           // соотношение сжатие/отбой B (4-8)
  maxVelocity: number            // макс. скорость поршня (м/с)
  pistonArea: number             // площадь поршня (мм²)
  // Дополнительные параметры
  axleLoad: number               // нагрузка на ось с учётом груза
  springCoefficient: number      // коэффициент жёсткости подвески
  usageCoefficient: number       // коэффициент режима эксплуатации
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
  
  // Новые параметры для расчёта усилий
  const [additionalWeight, setAdditionalWeight] = useState(0)           // Дополнительный груз (кг)
  const [leafSpringType, setLeafSpringType] = useState('3leaves')       // Тип рессоры (id)
  const [coilSpringType, setCoilSpringType] = useState('stock')         // Тип пружины
  const [usageMode, setUsageMode] = useState('mixed')                   // Режим эксплуатации

  // Загрузка истории из localStorage
  const loadHistory = useCallback(() => {
    try {
      setLoading(true)
      const saved = localStorage.getItem('shockCalcHistory')
      if (saved) {
        setHistory(JSON.parse(saved))
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
        // При лифте подвески:
        // - разжатый увеличивается на полную величину лифта (амортизатор должен доставать)
        // - сжатый увеличивается на 50% от лифта (для сохранения хода и исключения пробоя)
        // - но не может быть меньше штатного значения
        newExtended = stock.extended + lift
        newCompressed = Math.max(stock.compressed, stock.compressed + Math.floor(lift * 0.5))
      }
      newTravel = newExtended - newCompressed
    }
    
    const compressionReserve = newCompressed - stock.compressed
    const reboundReserve = newExtended - stock.extended
    
    // Расчёт нейтрального положения и рабочих ходов
    // Нейтральное положение - середина хода амортизатора (машина на стоянке)
    const stockNeutralPosition = Math.round((stock.compressed + stock.extended) / 2)
    const newNeutralPosition = Math.round((newCompressed + newExtended) / 2)
    
    // Ход сжатия - от нейтрального до полностью сжатого
    const compressionTravel = newNeutralPosition - newCompressed
    // Ход отбоя - от нейтрального до полностью разжатого
    const reboundTravel = newExtended - newNeutralPosition
    
    const warnings: string[] = []
    const recommendations: string[] = []
    let compatibility: 'optimal' | 'acceptable' | 'critical' = 'optimal'
    
    // Проверка общего хода
    if (newTravel < 150) {
      warnings.push('Ход амортизатора слишком мал - это приведёт к жёсткой работе подвески')
      compatibility = 'critical'
    } else if (newTravel < 180) {
      warnings.push('Ход амортизатора меньше штатного - возможно ухудшение проходимости')
      compatibility = 'acceptable'
    }
    
    // КРИТИЧЕСКАЯ проверка: сжатый не должен быть меньше штатного при положительном лифте
    if (lift > 0 && newCompressed < stock.compressed) {
      warnings.push(`⚠️ ВНИМАНИЕ: Длина сжатый (${newCompressed} мм) меньше штатной (${stock.compressed} мм) - БУДЕТ ПРОБОЙ!`)
      compatibility = 'critical'
    } else if (newCompressed < stock.compressed - 20) {
      warnings.push('Длина в сжатом состоянии значительно меньше штатной - риск удара об отбойник')
      compatibility = 'critical'
    }
    
    // Проверка баланса ходов сжатия/отбоя
    const travelBalance = reboundTravel / compressionTravel
    if (travelBalance > 1.5 || travelBalance < 0.67) {
      warnings.push(`Несбалансированный ход: сжатие ${compressionTravel} мм, отбой ${reboundTravel} мм`)
      if (compatibility === 'optimal') compatibility = 'acceptable'
    }
    
    // Проверка хода сжатия (должен быть не менее 80-100 мм для комфортной работы)
    if (compressionTravel < 80) {
      warnings.push(`Недостаточный ход сжатия (${compressionTravel} мм) - жёсткая работа на сжатие`)
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
    
    // === РАСЧЁТ ПО НАУЧНОЙ МЕТОДИКЕ (Литвин Р.А., 2018) ===
    // Формулы демпфирования резонансных колебаний
    
    // 1. Получаем жёсткость подвески
    const springData = position === 'front' 
      ? COIL_SPRING_OPTIONS.find(s => s.id === coilSpringType)
      : LEAF_SPRING_OPTIONS.find(l => l.id === leafSpringType)
    
    const stiffness = springData?.stiffnessNm || BASE_STIFFNESS[position]
    const springCoeff = springData?.coefficient || 1.0
    
    // 2. Получаем параметры режима эксплуатации
    const usageData = USAGE_MODES.find(u => u.id === usageMode)
    const usageCoeff = usageData?.dampingFactor || 1.0
    const velocityFactor = usageData?.velocityFactor || 0.7
    
    // 3. Расчёт массы на одно колесо
    const baseAxleLoad = position === 'front' 
      ? VEHICLE_SPECS.frontAxleWeight 
      : VEHICLE_SPECS.rearAxleWeight
    
    // Распределяем дополнительный груз: 40% на перед, 60% на зад
    const weightDistribution = position === 'front' ? 0.4 : 0.6
    const axleLoad = baseAxleLoad + (additionalWeight * weightDistribution)
    const massPerWheel = axleLoad / 2  // кг на одно колесо
    
    // 4. Коэффициент апериодичности (затухания) ψ
    // По научным данным: ψ = 0.15...0.30, оптимально ψ = 0.20
    // Для бездорожья берём большее значение для лучшего гашения колебаний
    const dampingRatio = DAMPING_RATIO_RANGE.recommended * usageCoeff
    
    // 5. Общий коэффициент сопротивления K = 2ψ√(M·C)
    // где M - масса на колесо (кг), C - жёсткость подвески (Н/м)
    // Формула из статьи Литвина Р.А.
    const dampingCoefficient = 2 * dampingRatio * Math.sqrt(massPerWheel * stiffness)
    
    // 6. Соотношение усилий отбой/сжатие зависит от жёсткости подвески
    // Базовое соотношение B = 3...4 для внедорожников
    // Жёсткие рессоры: отбой больше, сжатие меньше
    // Мягкие рессоры: отбой меньше, сжатие больше
    const baseReboundRatio = position === 'front' ? 3.5 : 3.0
    // Корректируем соотношение в зависимости от жёсткости
    // springCoeff > 1 = жёстче → больше отбой, меньше сжатие
    // springCoeff < 1 = мягче → меньше отбой, больше сжатие
    const reboundToCompressionRatio = baseReboundRatio * springCoeff
    
    // 7. Максимальная скорость поршня
    // Для внедорожников: 0.3-0.8 м/с в зависимости от режима
    const maxVelocity = 0.65 * velocityFactor
    
    // 8. Расчёт максимальных сил сопротивления
    // Общее усилие F = K × V
    const totalForce = dampingCoefficient * maxVelocity
    
    // Распределяем между отбоем и сжатием с учётом жёсткости подвески
    // F_отбой = F × (B/(B+1)) × multiplier
    // F_сжатие = F × (1/(B+1)) × multiplier
    
    // Базовый множитель для получения реалистичных значений
    const forceMultiplier = 2.0
    
    // Усилие отбоя растёт с жёсткостью подвески
    const reboundForce = totalForce * (reboundToCompressionRatio / (reboundToCompressionRatio + 1)) * forceMultiplier
    
    // Усилие сжатия УМЕНЬШАЕТСЯ с жёсткостью подвески (рессоры сами сопротивляются)
    // Коэффициент обратный жёсткости: 1/springCoeff
    const compressionForce = totalForce * (1 / (reboundToCompressionRatio + 1)) * forceMultiplier / springCoeff
    
    const recommendedReboundForce = Math.round(reboundForce)
    const recommendedCompressionForce = Math.round(compressionForce)
    
    // 10. Площадь поршня (для справки)
    // S = F / P, где P = 2-5 МПа - рабочее давление
    const workingPressure = 3.5e6  // Па (3.5 МПа)
    const pistonArea = (recommendedReboundForce / workingPressure) * 1e6  // мм²
    
    // 11. Собственная частота колебаний f = (1/2π)√(C/M)
    const naturalFrequency = (1 / (2 * Math.PI)) * Math.sqrt(stiffness / massPerWheel)
    
    // Базовые усилия (штатные)
    const stockCompressionForce = stock.compressionForce
    const stockReboundForce = stock.reboundForce
    
    // Добавляем рекомендации
    if (recommendedReboundForce > stockReboundForce * 1.25) {
      recommendations.push(`⚠️ Требуется усиленный амортизатор: усилие отбоя ${recommendedReboundForce} Н (+${Math.round((recommendedReboundForce/stockReboundForce-1)*100)}%)`)
    }
    
    if (recommendedCompressionForce > stockCompressionForce * 1.25) {
      recommendations.push(`Требуется большее усилие сжатия: ${recommendedCompressionForce} Н`)
    }
    
    // Рекомендации по настройке
    if (dampingRatio > 0.25) {
      recommendations.push('Высокий коэффициент демпфирования - жёсткая работа, но лучшее гашение резонанса')
    }
    
    if (reboundToCompressionRatio > 3.5) {
      recommendations.push('Большое соотношение отбой/сжатие - комфортное сжатие, жёсткий отбой')
    }
    
    // Рекомендации по жёсткости подвески
    if (springCoeff > 1.2 && usageMode === 'city') {
      recommendations.push('Жёсткая подвеска на асфальте - возможен дискомфорт, рассмотрите регулируемые амортизаторы')
    }
    
    if (usageMode === 'extreme' && springCoeff < 1.1) {
      recommendations.push('Для экстремального бездорожья рекомендуются усиленные рессоры/пружины')
    }
    
    // Предупреждение о резонансе
    if (naturalFrequency > 1.5 && naturalFrequency < 2.5) {
      recommendations.push(`Внимание: собственная частота ${naturalFrequency.toFixed(2)} Гц близка к резонансной зоне (1.5-2.5 Гц)`)
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
      compressionTravel,
      reboundTravel,
      stockNeutralPosition,
      newNeutralPosition,
      dampingRatio,
      stiffness,
      massPerWheel: Math.round(massPerWheel),
      dampingCoefficient: Math.round(dampingCoefficient),
      naturalFrequency: Number(naturalFrequency.toFixed(2)),
      stockCompressionForce,
      stockReboundForce,
      recommendedCompressionForce,
      recommendedReboundForce,
      reboundRatio: Number(reboundToCompressionRatio.toFixed(1)),
      maxVelocity: Number(maxVelocity.toFixed(2)),
      pistonArea: Math.round(pistonArea),
      axleLoad: Math.round(axleLoad),
      springCoefficient: springCoeff,
      usageCoefficient: usageCoeff,
      warnings,
      recommendations,
      compatibility
    }
    
    setResult(calculationResult)
  }, [position, liftHeight, useCustom, customCompressed, customExtended, customTravel, 
      additionalWeight, leafSpringType, coilSpringType, usageMode])

  const saveCalculation = () => {
    if (!result) return
    
    try {
      setSaving(true)
      const newEntry: SavedCalculation = {
        id: Date.now().toString(),
        position: result.position,
        liftHeight: result.lift,
        stockCompressed: result.stockCompressed,
        stockExtended: result.stockExtended,
        stockTravel: result.stockTravel,
        newCompressed: result.newCompressed,
        newExtended: result.newExtended,
        newTravel: result.newTravel,
        compatibility: result.compatibility,
        createdAt: new Date().toISOString(),
      }
      
      const updatedHistory = [newEntry, ...history].slice(0, 20) // Храним последние 20
      setHistory(updatedHistory)
      localStorage.setItem('shockCalcHistory', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteCalculation = (id: string) => {
    try {
      const updatedHistory = history.filter(h => h.id !== id)
      setHistory(updatedHistory)
      localStorage.setItem('shockCalcHistory', JSON.stringify(updatedHistory))
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

            {/* Weight and Load */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Weight className="h-4 w-4 text-orange-500" />
                  Нагрузка
                </CardTitle>
                <CardDescription>
                  Дополнительный груз влияет на усилие сжатия
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Доп. груз</span>
                    <Badge variant="secondary" className="font-mono">{additionalWeight} кг</Badge>
                  </div>
                  <Slider
                    value={[additionalWeight]}
                    onValueChange={([v]) => setAdditionalWeight(v)}
                    max={500}
                    step={10}
                    className="py-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 100, 200, 300].map((w) => (
                    <Button
                      key={w}
                      size="sm"
                      variant={additionalWeight === w ? 'default' : 'outline'}
                      onClick={() => setAdditionalWeight(w)}
                      className="text-xs px-1 h-7"
                    >
                      {w > 0 ? `+${w}` : '0'}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suspension Type */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Leaf className="h-4 w-4 text-orange-500" />
                  {position === 'front' ? 'Пружины' : 'Рессоры'}
                </CardTitle>
                <CardDescription>
                  {position === 'front' 
                    ? 'Тип передних пружин' 
                    : 'Тип задних рессор - влияет на жёсткость подвески'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {position === 'front' ? (
                  <div className="grid grid-cols-2 gap-1">
                    {COIL_SPRING_OPTIONS.map((spring) => (
                      <Button
                        key={spring.id}
                        size="sm"
                        variant={coilSpringType === spring.id ? 'default' : 'outline'}
                        onClick={() => setCoilSpringType(spring.id)}
                        className="text-xs h-auto py-2 px-2 flex-col"
                      >
                        <span>{spring.label}</span>
                        <span className="text-[10px] opacity-70">{spring.coefficient}x</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {LEAF_SPRING_OPTIONS.map((leaf) => (
                      <Button
                        key={leaf.id}
                        size="sm"
                        variant={leafSpringType === leaf.id ? 'default' : 'outline'}
                        onClick={() => setLeafSpringType(leaf.id)}
                        className="text-xs h-auto py-2 px-1 flex-col"
                      >
                        <span>{leaf.label}</span>
                        <span className="text-[10px] opacity-70">{leaf.coefficient}x</span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Mode */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Режим эксплуатации
                </CardTitle>
                <CardDescription>
                  Влияет на рекомендуемое усилие отбоя
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1">
                  {USAGE_MODES.map((mode) => (
                    <Button
                      key={mode.id}
                      size="sm"
                      variant={usageMode === mode.id ? 'default' : 'outline'}
                      onClick={() => setUsageMode(mode.id)}
                      className="text-xs h-auto py-2 px-2 flex-col"
                    >
                      <span>{mode.label}</span>
                      <span className="text-[10px] opacity-70">{mode.reboundMultiplier}x отбой</span>
                    </Button>
                  ))}
                </div>
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
                        <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                          <td className="py-2 px-3 font-medium">Ход сжатия</td>
                          <td className="text-right py-2 px-3 font-mono text-slate-500">{Math.round(result.stockTravel / 2)} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.compressionTravel} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={result.compressionTravel >= 80 ? 'default' : 'secondary'} className="text-xs font-mono">
                              {result.compressionTravel - Math.round(result.stockTravel / 2) >= 0 ? '+' : ''}{result.compressionTravel - Math.round(result.stockTravel / 2)}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                          <td className="py-2 px-3 font-medium">Ход отбоя</td>
                          <td className="text-right py-2 px-3 font-mono text-slate-500">{Math.round(result.stockTravel / 2)} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.reboundTravel} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
                              +{result.reboundTravel - Math.round(result.stockTravel / 2)}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="border-b bg-slate-50/50 dark:bg-slate-800/30">
                          <td className="py-2 px-3 font-medium">Нейтральное полож.</td>
                          <td className="text-right py-2 px-3 font-mono text-slate-500">{result.stockNeutralPosition} мм</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.newNeutralPosition} мм</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              +{result.newNeutralPosition - result.stockNeutralPosition}
                            </Badge>
                          </td>
                        </tr>
                        {/* Усилия амортизатора - научная методика */}
                        <tr className="border-t-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20">
                          <td className="py-2 px-3 font-semibold text-orange-700 dark:text-orange-400" colSpan={4}>
                            ⚡ Расчёт по методике Литвин Р.А., 2018
                          </td>
                        </tr>
                        <tr className="bg-orange-50/30 dark:bg-orange-900/10 border-b">
                          <td className="py-2 px-3 font-medium">Усилие сжатия</td>
                          <td className="text-right py-2 px-3 font-mono text-slate-500">{result.stockCompressionForce} Н</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.recommendedCompressionForce} Н</td>
                          <td className="text-right py-2 px-3">
                            <Badge 
                              variant={result.recommendedCompressionForce <= result.stockCompressionForce * 1.15 ? 'default' : 'secondary'} 
                              className="text-xs font-mono"
                            >
                              {result.recommendedCompressionForce > result.stockCompressionForce ? '+' : ''}{result.recommendedCompressionForce - result.stockCompressionForce}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-orange-50/30 dark:bg-orange-900/10 border-b">
                          <td className="py-2 px-3 font-medium">Усилие отбоя</td>
                          <td className="text-right py-2 px-3 font-mono text-slate-500">{result.stockReboundForce} Н</td>
                          <td className="text-right py-2 px-3 font-mono font-medium text-orange-600">{result.recommendedReboundForce} Н</td>
                          <td className="text-right py-2 px-3">
                            <Badge 
                              variant={result.recommendedReboundForce <= result.stockReboundForce * 1.15 ? 'default' : 'secondary'} 
                              className="text-xs font-mono"
                            >
                              {result.recommendedReboundForce > result.stockReboundForce ? '+' : ''}{result.recommendedReboundForce - result.stockReboundForce}
                            </Badge>
                          </td>
                        </tr>
                        {/* Научные параметры */}
                        <tr className="border-t border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10">
                          <td className="py-2 px-3 font-medium text-blue-700 dark:text-blue-400" colSpan={4}>
                            📊 Физические параметры
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Коэф. апериодичности ψ</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.dampingRatio.toFixed(2)}</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              0.15-0.30
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Жёсткость подвески C</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{(result.stiffness / 1000).toFixed(0)} кН/м</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              {result.springCoefficient}x
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Масса на колесо M</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.massPerWheel} кг</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              ось: {result.axleLoad}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Коэф. сопротивления K</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.dampingCoefficient} Н·с/м</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              2ψ√(MC)
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Собств. частота f</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.naturalFrequency} Гц</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant={result.naturalFrequency > 1.5 && result.naturalFrequency < 2.5 ? 'destructive' : 'outline'} className="text-xs font-mono">
                              {result.naturalFrequency > 1.5 && result.naturalFrequency < 2.5 ? '⚠️ резонанс' : 'OK'}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Соотношение сж/отб B</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.reboundRatio}</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              норма: 4-8
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-blue-50/20 dark:bg-blue-900/5 border-b">
                          <td className="py-1.5 px-3 text-sm">Макс. скорость V</td>
                          <td className="text-right py-1.5 px-3 font-mono text-slate-500 text-sm">—</td>
                          <td className="text-right py-1.5 px-3 font-mono font-medium text-blue-600 text-sm">{result.maxVelocity} м/с</td>
                          <td className="text-right py-1.5 px-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              режим
                            </Badge>
                          </td>
                        </tr>
                        <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs">
                          <td className="py-1.5 px-3 text-slate-500" colSpan={4}>
                            Формула: K = 2ψ√(M·C) • F_сж = K_сж·V • F_отб = K_отб·V • Площадь поршня: {result.pistonArea} мм²
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

            {/* Formula Info */}
            <Card className="shadow-sm bg-slate-50 dark:bg-slate-800/50 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-500" />
                  Научная методика расчёта
                </CardTitle>
                <CardDescription className="text-xs">
                  По статье Литвин Р.А. "Методика расчёта параметров амортизатора" (2018)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-3">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">📐 Геометрические размеры:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                    <li>Разжатый = штатный + лифт</li>
                    <li>Сжатый = штатный + 50% лифта</li>
                    <li>Нейтральное = (сжатый + разжатый) / 2</li>
                  </ul>
                </div>
                <div className="p-2 bg-green-100/50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-400">
                  <p className="font-medium">🔬 Формулы демпфирования:</p>
                  <ul className="space-y-1 mt-1 font-mono text-[10px]">
                    <li>• K = 2ψ√(M·C) — коэф. сопротивления</li>
                    <li>• ψ = δ/π = 0.15...0.30 — апериодичность</li>
                    <li>• K_отб = √(2K/(1+B)) — коэф. отбоя</li>
                    <li>• K_сж = B·K_отб — коэф. сжатия</li>
                    <li>• F = K·V — сила сопротивления</li>
                    <li>• f = (1/2π)√(C/M) — собств. частота</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">📊 Параметры:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                    <li><b>ψ</b> — коэффициент апериодичности (затухания)</li>
                    <li><b>M</b> — масса на колесо, кг</li>
                    <li><b>C</b> — жёсткость подвески, Н/м</li>
                    <li><b>B</b> — соотношение усилий сжатие/отбой (4-8)</li>
                    <li><b>V</b> — скорость поршня, м/с</li>
                  </ul>
                </div>
                <div className="p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded text-orange-700 dark:text-orange-400">
                  <strong>Жёсткость подвески C:</strong><br/>
                  • Перед: штатные 270 кН/м, мягкие 230 кН/м, жёсткие 352 кН/м<br/>
                  • Зад: 2 листа 187 кН/м, 3 листа 220 кН/м, 5+ листов 297 кН/м
                </div>
                <div className="p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-400">
                  <strong>Режимы эксплуатации:</strong><br/>
                  • Город: ψ×0.9, V=0.3 м/с<br/>
                  • Смешанный: ψ×1.0, V=0.42 м/с<br/>
                  • Бездорожье: ψ×1.15, V=0.51 м/с<br/>
                  • Экстрим: ψ×1.3, V=0.6 м/с
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
