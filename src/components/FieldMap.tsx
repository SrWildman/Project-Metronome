import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Zone, type DelayField, type Point } from '../core/delay';
import { describeLocation, fromXY } from '../core/field';

const ZONE_RGB: Record<Zone, [number, number, number]> = {
  [Zone.Green]: [0x00, 0x80, 0x00],
  [Zone.TimeSource]: [0xff, 0xff, 0x00],
  [Zone.RingOdd]: [0xd4, 0x3f, 0x3a],
  [Zone.RingEven]: [0x4a, 0x49, 0x4a],
};
const OVERLAY_ALPHA = 204; // 80% opacity

const SCALE = 3; // canvas pixels per field cell

interface Props {
  result: DelayField;
  timeSource: Point;
}

interface Hover {
  x: number;
  y: number;
  left: number;
  top: number;
}

export function FieldMap({ result, timeSource }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const { width, height, zones, field } = result;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // One pixel per cell, y flipped so the front sideline is at the bottom.
    const image = new ImageData(width, height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const [r, g, b] = ZONE_RGB[zones[x * height + y] as Zone];
        const o = ((height - 1 - y) * width + x) * 4;
        image.data[o] = r;
        image.data[o + 1] = g;
        image.data[o + 2] = b;
        image.data[o + 3] = OVERLAY_ALPHA;
      }
    }
    const small = new OffscreenCanvas(width, height);
    small.getContext('2d')!.putImageData(image, 0, 0);

    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

    // Time source marker
    const cx = (timeSource.x + 0.5) * SCALE;
    const cy = (height - timeSource.y - 0.5) * SCALE;
    ctx.beginPath();
    ctx.arc(cx, cy, SCALE * 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }, [zones, width, height, timeSource]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
    const y = height - 1 - Math.floor(((e.clientY - rect.top) / rect.height) * height);
    if (x < 0 || y < 0 || x >= width || y >= height) return setHover(null);
    setHover({ x, y, left: e.clientX - rect.left, top: e.clientY - rect.top });
  };

  const tip = hover && {
    ...describeLocation(fromXY(hover.x, hover.y, field)),
    delay: result.delays[hover.x * height + hover.y],
  };

  return (
    <div
      className={`field-map ${field}`}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Map of sound delay across the field, with the time source marked in yellow"
      />
      {hover && tip && (
        <div
          className="tooltip"
          style={{ left: hover.left, top: hover.top }}
          data-flip={hover.left > 0.6 * (width * 2) ? 'left' : undefined}
        >
          <div>{tip.horizontal}</div>
          <b>{tip.vertical}</b>
          <div>Delay: {tip.delay.toFixed(3)} seconds</div>
        </div>
      )}
    </div>
  );
}
