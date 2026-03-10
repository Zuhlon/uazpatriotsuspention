import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET - получить историю расчётов
export async function GET() {
  try {
    const calculations = await db.shockCalculation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({ success: true, data: calculations })
  } catch (error) {
    console.error('Error fetching calculations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calculations' },
      { status: 500 }
    )
  }
}

// POST - сохранить новый расчёт
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      position,
      liftHeight,
      stockCompressed,
      stockExtended,
      stockTravel,
      newCompressed,
      newExtended,
      newTravel,
      compatibility,
    } = body

    // Валидация
    if (!position || !['front', 'rear'].includes(position)) {
      return NextResponse.json(
        { success: false, error: 'Invalid position' },
        { status: 400 }
      )
    }

    const calculation = await db.shockCalculation.create({
      data: {
        position,
        liftHeight: liftHeight || 0,
        stockCompressed: stockCompressed || 0,
        stockExtended: stockExtended || 0,
        stockTravel: stockTravel || 0,
        newCompressed: newCompressed || 0,
        newExtended: newExtended || 0,
        newTravel: newTravel || 0,
        compatibility: compatibility || 'optimal',
      },
    })

    return NextResponse.json({ success: true, data: calculation })
  } catch (error) {
    console.error('Error saving calculation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save calculation' },
      { status: 500 }
    )
  }
}

// DELETE - удалить расчёт
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    await db.shockCalculation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calculation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete calculation' },
      { status: 500 }
    )
  }
}
