import { PhotoWall } from '@/components/PhotoWall'
import { makeFakePhotos } from '@/lib/fakePhotos'

const photos = makeFakePhotos(12)

export default function WallPage() {
  return (
    <div className="h-full">
      <PhotoWall photos={photos} />
    </div>
  )
}
