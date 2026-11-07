interface SceneTitleProps {
  name: string
  photoCount: number
}

/**
 * 场景大标题：相册名（思源宋体）+ 照片计数，叠加在照片墙顶部。
 * pointer-events-none 不挡交互；底部渐隐 mask 让文字融入场景。
 */
export function SceneTitle({ name, photoCount }: SceneTitleProps) {
  const mask =
    'linear-gradient(to bottom, #000 55%, transparent 100%)'
  return (
    <div
      data-testid="scene-title"
      className="pointer-events-none absolute inset-x-0 top-8 z-10 flex flex-col items-center gap-2 text-center"
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    >
      {/* 顶部暗化带：压住漂进标题区的亮色照片，保证大标题可读（漂移墙照片会上浮穿过此区） */}
      <div
        aria-hidden
        className="absolute inset-x-[-6%] -top-20 h-60"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,6,15,0.92), rgba(5,6,15,0.5) 55%, transparent)',
        }}
      />
      <h1 className="font-display-gradient font-display text-4xl font-black tracking-[0.12em] drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] md:text-6xl">
        {name}
      </h1>
      <p className="text-sm text-white/60">
        {photoCount} 张照片
      </p>
    </div>
  )
}
