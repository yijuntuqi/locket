import { PhotoWall } from '@/components/PhotoWall'
import { ScatterWall } from '@/components/wall/ScatterWall'
import { SphereWall } from '@/components/wall/SphereWall'
import { SpiralWall } from '@/components/wall/SpiralWall'
import type { FakePhoto } from '@/lib/fakePhotos'
import type { WallLayout } from '@/lib/layouts'

interface WallSceneProps {
  layout: WallLayout
  photos: FakePhoto[]
  autoRotateDegPerSec?: number
  onDeletePhoto?: (id: string) => void
}

/** 布局分发：新增布局在 layouts.ts 注册 + 此处加分支 */
export function WallScene({ layout, photos, autoRotateDegPerSec, onDeletePhoto }: WallSceneProps) {
  const common = { photos, autoRotateDegPerSec, onDeletePhoto }
  switch (layout) {
    case 'sphere':
      return <SphereWall {...common} />
    case 'scatter':
      return <ScatterWall {...common} />
    case 'spiral':
      return <SpiralWall {...common} />
    default:
      return <PhotoWall {...common} />
  }
}
