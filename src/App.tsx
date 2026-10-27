import { Backdrop } from '@/components/Backdrop'
import { PhotoWall } from '@/components/PhotoWall'
import { makeFakePhotos } from '@/lib/fakePhotos'

const photos = makeFakePhotos(12)

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <Backdrop />
      <PhotoWall photos={photos} />
    </div>
  )
}
